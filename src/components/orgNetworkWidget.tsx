import { useCallback, useMemo, useRef } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    type Node,
    type Edge,
    type Connection,
    type NodeChange,
    type EdgeChange,
    BackgroundVariant,
    ConnectionLineType,
    ReactFlowProvider,
} from '@xyflow/react';
import dagre from 'dagre';
import OrgNode from './OrgNode';
import DetailPanel from './DetailPanel';
import EdgeDetailPanel from './EdgeDetailPanel';
import { CONNECTION_TYPES, type ConnectionType } from './types';

import '@xyflow/react/dist/style.css';
import './OrgNode.css';

/* ────────────────────────────────────────────── */
/* Layout (Dagre)                                 */
/* ────────────────────────────────────────────── */

const NODE_WIDTH = 260;
const NODE_HEIGHT = 100;

function getLayoutedElements(
    nodes: Node<OrgNode>[],
    edges: Edge[],
    direction: 'TB' | 'LR'
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
/* Public Types                                   */
/* ────────────────────────────────────────────── */
export interface NodeInput {
    id: string;
    position: { x: number; y: number };
    label?: string;
    description?: string;
    type?: string
}

export interface EdgeInput extends EdgeConnection {
    id: string
    label?: string
    type?: string;
    connectionType?: ConnectionType;
}
export type EdgeConnection = {
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
}

export interface OrgNode {
    label?: string;
    description?: string;
    onAddChild?: (id: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    readOnly?: boolean;
    [key: string]: unknown;
}

export interface OrgNetworkFlowProps {
    nodes: NodeInput[];
    edges: EdgeInput[];

    /** Currently selected node ID (controlled from parent) */
    selectedNodeId?: string
    /** Currently selected edge ID (controlled from parent) */
    selectedEdgeId?: string
    direction?: 'TB' | 'LR';
    readOnly?: boolean;
    primaryColor?: string;


    onNodeSelect?: (nodeId: string) => void;
    onEdgeSelect?: (edgeId: string) => void;

    onNodeAdd?: (parentId: string) => void;
    onNodeEdit?: (nodeId: string) => void;
    onNodeDelete?: (nodeId: string) => void;

    onEdgeAdd?: (edge: EdgeConnection) => void;
    onEdgeEdit?: (edgeId: string, edge: EdgeConnection) => void;
    onEdgeDelete?: (edgeId: string) => void;
    onEdgeTypeChange?: (edgeId: string, newType: ConnectionType) => void;

    onNodesChange?: (changes: NodeChange[]) => void;
    onEdgesChange?: (changes: EdgeChange[]) => void;
}

/* ────────────────────────────────────────────── */
/* Converters                                     */
/* ────────────────────────────────────────────── */

function toRFNodes(inputs: NodeInput[]): Node<OrgNode>[] {
    return inputs.map((n) => ({
        id: n.id,
        position: { x: n.position.x, y: n.position.y },
        type: n.type,
        data: {
            label: n.label,
            description: n.description,
        },
    }));
}

function toRFEdges(inputs: EdgeInput[]): Edge[] {
    return inputs.map((e) => {
        const type = e.connectionType ?? 'reports-to';
        const style = CONNECTION_TYPES[type];

        return {
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            type: 'smoothstep',
            animated: style.animated,
            style: {
                stroke: style.color,
                strokeWidth: 2,
                strokeDasharray: style.strokeDasharray,
            },
            data: { label: e.label, connectionType: type },

        };
    });
}

function toSimplifiedNodes(nodes: Node<OrgNode>[]): NodeInput[] {
    return nodes.map((n) => ({
        id: n.id,
        label: n.data.label,
        position: n.position,
        description: n.data.description,
        type: n.type
    }));
}

function toSimplifiedEdges(edges: Edge[]): EdgeInput[] {
    return edges.map((e) => ({
        id: e.id,

        type: e.type ?? 'smoothstep',
        connectionType: (e.data as any)?.connectionType ?? 'reports-to',

        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? undefined,
        targetHandle: e.targetHandle ?? undefined,

    }));
}

/* ────────────────────────────────────────────── */
/* Inner Component                                 */
/* ────────────────────────────────────────────── */

function OrgNetworkFlowInner({
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
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
    onEdgeTypeChange,
    onNodesChange: onNodesChangeProp,
    onEdgesChange: onEdgesChangeProp,
}: OrgNetworkFlowProps) {
    const flowRef = useRef<HTMLDivElement>(null);

    /* ── Structural key: only re-layout when graph shape changes ── */
    const structureKey = useMemo(() => {
        const nk = nodes.map((n) => n.id).sort().join(',');
        const ek = edges.map((e) => `${e.source}-${e.target}`).sort().join(',');
        return `${nk}|${ek}|${direction}`;
    }, [nodes, edges, direction]);

    const prevStructureKeyRef = useRef<string>('');
    const cachedLayoutRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    /* Layouted data — Dagre only runs when structure changes */
    const rfData = useMemo(() => {
        const rfNodes = toRFNodes(nodes);
        const rfEdges = toRFEdges(edges);

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
    /* Controlled node updates — forward non-position changes to parent */
    const handleNodesChange = useCallback(
        (changes: NodeChange[]) => {
            // Filter out position, dimensions, and select changes.
            // Position is handled by onNodeDragStop instead.
            const essentialChanges = changes.filter(
                (c) => c.type !== 'dimensions' && c.type !== 'select' && c.type !== 'position'
            );
            if (essentialChanges.length > 0) {
                onNodesChangeProp?.(essentialChanges);
            }
        },
        [onNodesChangeProp]
    );

    /* Fire position update only when drag stops */
    const handleNodeDragStop = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            // Send a single position change to parent when drag ends
            onNodesChangeProp?.([
                { id: node.id, type: 'position', position: node.position, dragging: false },
            ]);
        },
        [onNodesChangeProp]
    );

    /* Controlled edge updates — forward to parent */
    const handleEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            console.log(changes, "EdgeChange")
            // Filter out 'select' changes to avoid redundant calls to parent
            const essentialChanges = changes.filter((c) => c.type !== 'select');
            console.log(essentialChanges, "essentialChanges")
            if (essentialChanges.length > 0) {
                onEdgesChangeProp?.(essentialChanges);
            }
        },
        [onEdgesChangeProp]
    );

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
            rfData.nodes.map((n) => ({
                ...n,
                data: {
                    ...n.data,
                    readOnly,
                    onAddChild: readOnly ? undefined : onNodeAdd,
                    onEdit: readOnly ? undefined : onNodeEdit,
                    onDelete: readOnly ? undefined : onNodeDelete,
                },
            })),
        [rfData.nodes, readOnly, onNodeAdd, onNodeEdit, onNodeDelete, onNodesChangeProp]
    );



    const nodeTypes = useMemo(() => ({ orgNode: OrgNode }), []);

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
                        edges={rfData.edges}
                        nodeTypes={nodeTypes}
                        onNodesChange={readOnly ? undefined : handleNodesChange}
                        onNodeDragStop={readOnly ? undefined : handleNodeDragStop}
                        onEdgesChange={readOnly ? undefined : (c) => {
                            console.log(c)
                            handleEdgesChange(c)
                        }}
                        onConnect={readOnly ? undefined : handleConnect}
                        onReconnect={readOnly ? undefined : onReconnect}
                        onNodeClick={(_, n) => onNodeSelect?.(n.id)}
                        onEdgeClick={(_, e) => onEdgeSelect?.(e.id)}
                        onPaneClick={() => {
                            onNodeSelect?.('');
                            onEdgeSelect?.('');
                        }}
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

                {selectedNodeId && (() => {
                    const selectedNode = rfData.nodes.find((n) => n.id === selectedNodeId);
                    if (!selectedNode) return null;
                    return (
                        <DetailPanel
                            node={selectedNode as any}
                            edges={rfData.edges}
                            allNodes={rfData.nodes as any}
                            onClose={() => onNodeSelect?.('')}
                            onEdit={(id) => onNodeEdit?.(id)}
                            onDelete={(id) => {
                                onNodeDelete?.(id);
                                onNodeSelect?.('');
                            }}
                            onAddChild={(id) => onNodeAdd?.(id)}
                            readOnly={readOnly}
                        />
                    );
                })()}

                {selectedEdgeId && !selectedNodeId && (() => {
                    const selectedEdge = rfData.edges.find((e) => e.id === selectedEdgeId);
                    if (!selectedEdge) return null;
                    return (
                        <EdgeDetailPanel
                            edge={selectedEdge}
                            allNodes={rfData.nodes as any}
                            onClose={() => onEdgeSelect?.('')}
                            onDelete={readOnly ? undefined : (id) => {
                                onEdgeDelete?.(id);
                                onEdgeSelect?.('');
                            }}
                            onTypeChange={readOnly ? undefined : onEdgeTypeChange}
                            readOnly={readOnly}
                        />
                    );
                })()}

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
            <OrgNetworkFlowInner {...props} />
        </ReactFlowProvider>
    );
}