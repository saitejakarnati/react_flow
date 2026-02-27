import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    type Node,
    type Edge,
    type Connection,
    type NodeChange,
    applyNodeChanges,
    BackgroundVariant,
    ConnectionLineType,
    ReactFlowProvider,
} from '@xyflow/react';
import dagre from 'dagre';
import OrgNode, { type OrgNodeProps } from './OrgNode';
import {
    type NodeInput,
    type EdgeInput,
    type OrgNetworkFlowProps,
    type ConnectionTypeStyle,
} from './types';

import '@xyflow/react/dist/style.css';
import './OrgNode.css';

/* ────────────────────────────────────────────── */
/* Layout (Dagre)                                 */
/* ────────────────────────────────────────────── */

const NODE_WIDTH = 260;
const NODE_HEIGHT = 100;

/**
 * Computes a hierarchical layout using the Dagre library.
 * This is called only when the graph structure change.
 */
function getLayoutedElements(
    nodes: Node<OrgNodeProps>[],
    edges: Edge[],
    direction: 'TB' | 'LR' = 'TB'
) {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 90 });

    nodes.forEach((n) =>
        g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
    );

    edges.forEach((e) => g.setEdge(e.source, e.target));

    dagre.layout(g);

    return {
        nodes: nodes.map((n) => {
            const p = g.node(n.id);
            return {
                ...n,
                position: {
                    x: p.x - NODE_WIDTH / 2,
                    y: p.y - NODE_HEIGHT / 2,
                },
            };
        }),
        edges,
    };
}

/* ────────────────────────────────────────────── */
/* Converters                                     */
/* ────────────────────────────────────────────── */

/**
 * Converts simplified NodeInput[] from parent to React Flow Node<OrgNodeData>[]
 */
function toRFNodes(inputs: NodeInput[]): Node<OrgNodeProps>[] {
    return inputs.map((n) => ({
        id: n.id,
        position: { x: n.position.x, y: n.position.y },
        type: n.type || 'orgNode',
        data: {
            label: n.label,
            description: n.description,
        },
    }));
}

function toRFEdges(inputs: EdgeInput[], edgeTypes?: Record<string, ConnectionTypeStyle>): Edge[] {
    return inputs.map((e) => {
        const type = e.connectionType || 'reports-to';
        const style = edgeTypes?.[type];

        return {
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            type: 'smoothstep',
            animated: style?.animated ?? false,
            style: {
                stroke: style?.color ?? '#b1b1b7',
                strokeWidth: 2,
                strokeDasharray: style?.strokeDasharray,
            },
            data: { label: e.label, connectionType: type },

        };
    });
}


/* ────────────────────────────────────────────── */
/* Inner Component                                 */
/* ────────────────────────────────────────────── */

/**
 * OrgNetworkFlow Component
 *
 * A highly interactive, layout-managed organisation chart widget built on React Flow.
 * Features auto-layout (Dagre), manual dragging with persistence, and granular event handlers.
 */
function OrgNetwork({
    nodes,
    edges,
    direction = 'TB',
    readOnly = false,
    primaryColor = '#1976d2',
    onNodeSelect,
    onEdgeSelect,
    onNodeAdd,
    onNodeEdit,
    onNodeDelete,
    onEdgeAdd,
    onEdgeEdit,
    onEdgeDelete,
    onNodesLayoutChange: onNodesLayoutChangeProp,
    nodeTypes: customNodeTypes,
    selectedNodeId,
    selectedEdgeId,
    edgeTypes,
    onPaneClick
}: OrgNetworkFlowProps) {
    const flowRef = useRef<HTMLDivElement>(null);

    // Render an empty state if no nodes are provided
    if (!nodes || nodes.length === 0) {
        return (
            <div className="orgnet-flow-empty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: '#666' }}>
                <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</span>
                <h3>No Organisation Data</h3>
                <p>Start by adding your first organisation node.</p>
            </div>
        );
    }

    /* Live local state for edges */
    const [localEdges, setLocalEdges] = useState<Edge[]>([]);
    /* Live local state for React Flow visuals (smoothness) */
    const [localNodes, setLocalNodes] = useState<Node<OrgNodeProps>[]>([]);

    /* ── Structural key: only re-layout when graph shape changes ── */
    const structureKey = useMemo(() => {
        const nk = nodes.map((n) => n.id).sort().join(',');
        const ek = edges.map((e) => `${e.source}-${e.target}`).sort().join(',');
        return `${nk}|${ek}|${direction}`;
    }, [nodes, edges, direction]);

    const prevStructureKeyRef = useRef<string>('');
    const cachedLayoutRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    const rfData = useMemo(() => {
        const rfNodes = toRFNodes(nodes);
        const rfEdges = toRFEdges(edges, edgeTypes);

        if (structureKey !== prevStructureKeyRef.current) {
            // Graph structure changed → run Dagre layout
            const layouted = getLayoutedElements(rfNodes, rfEdges, direction);
            prevStructureKeyRef.current = structureKey;
            cachedLayoutRef.current = new Map(
                layouted.nodes.map((n) => [n.id, n.position])
            );
            return layouted;
        }

        // Position-only change (drag) → use prop positions, fallback to cached Dagre
        return {
            nodes: rfNodes.map((n) => ({
                ...n,
                position: (n.position.x === 0 && n.position.y === 0)
                    ? cachedLayoutRef.current.get(n.id) ?? n.position
                    : n.position,
            })),
            edges: rfEdges,
        };
    }, [nodes, edges, direction, structureKey]);



    // Sync local state when layout/props change structurally
    useEffect(() => {
        setLocalNodes(rfData.nodes);
    }, [rfData.nodes]);

    /* Controlled node updates — update local visuals and forward non-position changes */
    const handleNodesChange = useCallback(
        (changes: NodeChange[]) => {
            // Update local nodes immediately for smooth visual movement
            setLocalNodes((nds) => applyNodeChanges(changes, nds) as Node<OrgNodeProps>[]);

            // Filter out position, dimensions, and select changes for the parent.
            // Position is synced only on drop (handleNodeDragStop).
            const essentialChanges = changes.filter(
                (c) => c.type !== 'dimensions' && c.type !== 'select' && c.type !== 'position'
            );
            if (essentialChanges.length > 0) {
                onNodesLayoutChangeProp?.(essentialChanges);
            }
        },
        [onNodesLayoutChangeProp]
    );

    /* Fire position update only when drag stops (sync local -> parent) */
    const handleNodeDragStop = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            onNodesLayoutChangeProp?.([
                { id: node.id, type: 'position', position: node.position, dragging: false },
            ]);
        },
        [onNodesLayoutChangeProp]
    );




    // Sync local edges when layout/props change
    useEffect(() => {
        setLocalEdges(rfData.edges);
    }, [rfData.edges]);


    /* New connection — notify parent with source & target */
    const handleConnect = useCallback(
        (c: Connection) => {
            if (!c.source || !c.target || c.source === c.target) return;
            onEdgeAdd?.({
                source: c.source,
                target: c.target,
                sourceHandle: c.sourceHandle ?? undefined,
                targetHandle: c.targetHandle ?? undefined,
            });
        },
        [onEdgeAdd]
    );


    /* Reconnect — notify parent with edge id + new endpoints */
    const onReconnect = useCallback(
        (oldEdge: Edge, connection: Connection) => {
            if (!connection.source || !connection.target) return;
            onEdgeEdit?.(oldEdge.id, {
                source: connection.source,
                target: connection.target,
                sourceHandle: connection.sourceHandle ?? undefined,
                targetHandle: connection.targetHandle ?? undefined,
            });
        },
        [onEdgeEdit]
    );




    /* Inject callbacks into node data */
    const nodesWithCallbacks = useMemo(
        () =>
            localNodes.map((n) => ({
                ...n,
                data: {
                    ...n.data,
                    readOnly,
                    onAddChild: readOnly ? undefined : onNodeAdd,
                    onEdit: readOnly ? undefined : onNodeEdit,
                    onDelete: readOnly ? undefined : onNodeDelete,
                },
            })),
        [localNodes, readOnly, onNodeAdd, onNodeEdit, onNodeDelete]
    );

    const nodeTypes = useMemo(() => ({
        orgNode: OrgNode,
        ...customNodeTypes,
    }), [customNodeTypes]);



    const containerStyle =
        primaryColor !== '#1976d2'
            ? ({ '--orgnet-primary': primaryColor } as React.CSSProperties)
            : undefined;

    return (
        <div className="orgnet-flow-container" style={containerStyle}>
            <div className="orgnet-flow-main">
                <div className="orgnet-flow-canvas" ref={flowRef}>
                    <ReactFlow
                        nodes={nodesWithCallbacks}
                        edges={localEdges}
                        nodeTypes={nodeTypes}
                        onNodesChange={readOnly ? undefined : handleNodesChange}
                        onNodeDragStop={readOnly ? undefined : handleNodeDragStop}
                        onConnect={readOnly ? undefined : handleConnect}
                        onReconnect={readOnly ? undefined : onReconnect}
                        onNodeClick={(_, n) => onNodeSelect?.(n.id)}
                        onEdgeClick={(_, e) => onEdgeSelect?.(e.id)}
                        onPaneClick={onPaneClick}
                        fitView
                        fitViewOptions={{ padding: 0.5 }}
                        minZoom={0.3}
                        maxZoom={2}
                        connectionLineType={ConnectionLineType.SmoothStep}
                        nodesDraggable={!readOnly}
                        nodesConnectable={!readOnly}
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background
                            variant={BackgroundVariant.Dots}
                            gap={20}
                            size={1}
                            color="rgba(139,92,246,0.08)"
                        />
                        <Controls showInteractive={false} />
                    </ReactFlow>
                </div>
            </div>

        </div>
    );
}

/* ────────────────────────────────────────────── */
/* Provider Wrapper                                */
/* ────────────────────────────────────────────── */

export default function OrgNetworkFlow(props: OrgNetworkFlowProps) {
    return (
        <ReactFlowProvider>
            <OrgNetwork {...props} />
        </ReactFlowProvider>
    );
}