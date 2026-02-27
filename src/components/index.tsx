import { useCallback, useEffect, useMemo, useRef } from 'react';
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
    useReactFlow,
} from '@xyflow/react';
import dagre from 'dagre';

import '@xyflow/react/dist/style.css';
import './OrgNode.css';
import OrgNode from './OrgNode';
import DetailPanel from './DetailPanel';

/* ────────────────────────────────────────────── */
/* Layout (Dagre)                                 */
/* ────────────────────────────────────────────── */

const NODE_WIDTH = 260;
const NODE_HEIGHT = 100;

function getLayoutedElements(
    nodes: Node<NodeProps>[],
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
/* Converters                                     */
/* ────────────────────────────────────────────── */

/** Convert NodeProps[] → React Flow Node<NodeProps>[] */
function toRFNodes(inputs: NodeProps[]): Node<NodeProps>[] {
    return inputs.map((n) => ({
        id: n.id,
        type: n.type ?? 'orgNode',
        position: n.position ?? { x: 0, y: 0 },
        data: n,
    }));
}

/** Convert EdgeProps[] → React Flow Edge[] */
function toRFEdges(inputs: EdgeProps[]): Edge[] {
    return inputs.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type ?? 'smoothstep',
        animated: e.animated ?? false,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        style: {
            stroke: e.strokeColor ?? '#1976d2',
            strokeWidth: 2,
            strokeDasharray: e.strokeDasharray,
        },
        data: { connectionType: e.connectionType ?? 'reports-to' },
    }));
}

/* ────────────────────────────────────────────── */
/* Public Types                                   */
/* ────────────────────────────────────────────── */
export interface ChartProps {
    nodes: NodeProps[];
    edges: EdgeProps[];
    /** Currently selected node ID (controlled from parent) */
    selectedNodeId?: string | null;
    /** Layout direction: top-to-bottom or left-to-right */
    direction?: 'TB' | 'LR';
    /** If true, hides add / edit / delete buttons */
    readOnly?: boolean;
    /** Primary accent colour (CSS colour string). Default: #1976d2 */
    primaryColor?: string;

    onNodeSelect?: (nodeId: string | null) => void;
    onEdgeSelect?: (edgeId: string | null) => void;

    onNodeAdd?: (nodeId: string) => void;
    onNodeEdit?: (nodeId: string) => void;
    onNodeDelete?: (nodeId: string) => void;

    onEdgeAdd?: (edgeId: string) => void;
    onEdgeEdit?: (edgeId: string) => void;
    onEdgeDelete?: (edgeId: string) => void;

    onNodesChange?: (changes: NodeChange[]) => void;
    onEdgesChange?: (changes: EdgeChange[]) => void;

    onConnect?: (connection: Connection) => void;
    onReconnect?: (connection: Connection) => void;
    onPaneClick?: () => void;
}

export interface NodeProps extends NodeLayoutProps {
    id: string;
    label: string;
    description?: string;
    type: string;
}

export interface EdgeProps extends EdgeLayoutProps {
    id: string;
    label?: string;
    source: string;
    target: string;
    connectionType: string;
}

export interface NodeLayoutProps {
    /** Computed position from Dagre layout */
    position?: { x: number; y: number };
    /** Node width used by the layout engine */
    width?: number;
    /** Node height used by the layout engine */
    height?: number;
    /** Whether the node is currently selected */
    selected?: boolean;
    /** Whether the node is currently being dragged */
    dragging?: boolean;
    /** Z-index layer for overlapping control */
    zIndex?: number;
    [key: string]: unknown;
}

export interface EdgeLayoutProps {
    /** Source handle ID (e.g. 'bottom-source', 'right-source') */
    sourceHandle?: string;
    /** Target handle ID (e.g. 'top-target', 'left-target') */
    targetHandle?: string;
    /** Edge routing type */
    type?: 'default' | 'straight' | 'step' | 'smoothstep';
    /** Whether the edge is animated */
    animated?: boolean;
    /** Stroke color */
    strokeColor?: string;
    /** Dash pattern (SVG stroke-dasharray) */
    strokeDasharray?: string;
    /** Whether the edge is currently selected */
    selected?: boolean;
    /** Z-index layer for overlapping control */
    zIndex?: number;
}

/* ────────────────────────────────────────────── */
/* Inner Component (Fully Controlled)             */
/* ────────────────────────────────────────────── */

function OrgNetworkFlowInner({
    nodes,
    edges,
    selectedNodeId,
    direction = 'TB',
    readOnly = false,
    primaryColor,

    onConnect: onConnectProp,
    onReconnect: onReconnectProp,
    onPaneClick: onPaneClickProp,
    onNodeSelect,
    onEdgeSelect,
    onNodeAdd,
    onNodeEdit,
    onNodeDelete,
    onEdgeAdd,
    onNodesChange: onNodesChangeProp,
    onEdgesChange: onEdgesChangeProp,
}: ChartProps) {
    const flowRef = useRef<HTMLDivElement>(null);

    /*
     * Structural key — only changes when node IDs or edge connections change.
     * This prevents Dagre from re-running on position / selection / dimension updates.
     */
    const structureKey = useMemo(() => {
        const nk = nodes.map((n) => n.id).sort().join(',');
        const ek = edges.map((e) => `${e.source}-${e.target}`).sort().join(',');
        return `${nk}|${ek}|${direction}`;
    }, [nodes, edges, direction]);

    /* Cache last Dagre layout positions */
    const layoutCache = useRef<Record<string, { x: number; y: number }>>({});

    /* Recompute Dagre layout ONLY when structure changes */
    useMemo(() => {
        const rfNodes = toRFNodes(nodes);
        const rfEdges = toRFEdges(edges);
        const laid = getLayoutedElements(rfNodes, rfEdges, direction);
        const cache: Record<string, { x: number; y: number }> = {};
        laid.nodes.forEach((n) => { cache[n.id] = n.position; });
        layoutCache.current = cache;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [structureKey]);

    /* Build RF nodes using layout-cached positions unless the node already has a position */
    const rfData = useMemo(() => {
        const rfNodes: Node<NodeProps>[] = nodes.map((n) => ({
            id: n.id,
            type: n.type ?? 'orgNode',
            position: n.position ?? layoutCache.current[n.id] ?? { x: 0, y: 0 },
            data: n,
        }));
        const rfEdges = toRFEdges(edges);
        return { nodes: rfNodes, edges: rfEdges };
    }, [nodes, edges]);

    /* Forward node changes to parent */
    const handleNodesChange = useCallback(
        (changes: NodeChange[]) => {
            onNodesChangeProp?.(changes);
        },
        [onNodesChangeProp]
    );

    /* Forward edge changes to parent */
    const handleEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            onEdgesChangeProp?.(changes);
        },
        [onEdgesChangeProp]
    );

    /* New connection */
    const handleConnect = useCallback(
        (c: Connection) => {
            if (!c.source || !c.target || c.source === c.target) return;
            const edgeId = `e-${c.source}-${c.target}`;
            onEdgeAdd?.(edgeId);
            onConnectProp?.(c);
        },
        [onEdgeAdd, onConnectProp]
    );

    /* Reconnect an existing edge */
    const handleReconnect = useCallback(
        (_oldEdge: Edge, connection: Connection) => {

            if (!connection.source || !connection.target) return;
            const edgeId = `e-${connection.source}-${connection.target}`;
            onEdgeAdd?.(edgeId);
            onReconnectProp?.(connection);
        },
        [onEdgeAdd, onReconnectProp]
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
        [rfData.nodes, readOnly, onNodeAdd, onNodeEdit, onNodeDelete]
    );

    const nodeTypes = useMemo(() => ({ orgNode: OrgNode }), []);

    /* Fit view only on mount and when graph structure changes */
    const { fitView } = useReactFlow();
    const hasMounted = useRef(false);
    useEffect(() => {
        // Small delay to let React Flow measure nodes first
        const timer = setTimeout(() => fitView({ padding: 0.5 }), 50);
        hasMounted.current = true;
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [structureKey]);

    const containerStyle = primaryColor
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
                        onEdgesChange={readOnly ? undefined : handleEdgesChange}
                        onConnect={readOnly ? undefined : handleConnect}
                        onReconnect={readOnly ? undefined : handleReconnect}
                        onNodeClick={(_, n) => onNodeSelect?.(n.id)}
                        onEdgeClick={(_, e) => onEdgeSelect?.(e.id)}
                        onPaneClick={() => {
                            onPaneClickProp?.();
                            onNodeSelect?.(null);
                        }}
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
                            onClose={() => onNodeSelect?.(null)}
                            onEdit={(id) => onNodeEdit?.(id)}
                            onDelete={(id) => {
                                onNodeDelete?.(id);
                                onNodeSelect?.(null);
                            }}
                            onAddChild={(id) => onNodeAdd?.(id)}
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

export default function OrgNetworkFlow(props: ChartProps) {
    return (
        <ReactFlowProvider>
            <OrgNetworkFlowInner {...props} />
        </ReactFlowProvider>
    );
}