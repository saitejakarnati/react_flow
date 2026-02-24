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
    applyNodeChanges,
    applyEdgeChanges,
    BackgroundVariant,
    ConnectionLineType,
    ReactFlowProvider,
} from '@xyflow/react';
import dagre from 'dagre';
import OrgNode from './OrgNode';
import { CONNECTION_TYPES, type ConnectionType } from './types';

import '@xyflow/react/dist/style.css';
import './OrgNode.css';

/* ────────────────────────────────────────────── */
/* Layout (Dagre)                                 */
/* ────────────────────────────────────────────── */

const NODE_WIDTH = 260;
const NODE_HEIGHT = 100;

function getLayoutedElements(
    nodes: Node<OrgNodeData>[],
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
    label: string;
    description?: string;
    memberCount?: number;
}

export interface EdgeInput {
    source: string;
    target: string;
    connectionType?: ConnectionType;
}

export interface OrgNodeData {
    label: string;
    description?: string;
    memberCount?: number;
    onAddChild?: (id: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    readOnly?: boolean;
    [key: string]: unknown;
}

export interface OrgNetworkFlowProps {
    nodes: NodeInput[];
    edges: EdgeInput[];

    direction?: 'TB' | 'LR';
    readOnly?: boolean;
    primaryColor?: string;

    onChange: (nodes: NodeInput[], edges: EdgeInput[]) => void;

    onNodeSelect?: (nodeId: string | null) => void;
    onEdgeSelect?: (edgeId: string | null) => void;

    onNodeAdd?: (parentId: string) => void;
    onNodeEdit?: (nodeId: string) => void;
    onNodeDelete?: (nodeId: string) => void;
}

/* ────────────────────────────────────────────── */
/* Converters                                     */
/* ────────────────────────────────────────────── */

function toRFNodes(inputs: NodeInput[]): Node<OrgNodeData>[] {
    return inputs.map((n) => ({
        id: n.id,
        type: 'orgNode',
        position: { x: 0, y: 0 },
        data: {
            label: n.label,
            description: n.description,
            memberCount: n.memberCount,
        },
    }));
}

function toRFEdges(inputs: EdgeInput[]): Edge[] {
    return inputs.map((e) => {
        const type = e.connectionType ?? 'reports-to';
        const style = CONNECTION_TYPES[type];

        return {
            id: `e-${e.source}-${e.target}-${type}`,
            source: e.source,
            target: e.target,
            type: 'smoothstep',
            animated: style.animated,
            style: {
                stroke: style.color,
                strokeWidth: 2,
                strokeDasharray: style.strokeDasharray,
            },
            data: { connectionType: type },
        };
    });
}

function toSimplifiedNodes(nodes: Node<OrgNodeData>[]): NodeInput[] {
    return nodes.map((n) => ({
        id: n.id,
        label: n.data.label,
        description: n.data.description,
        memberCount: n.data.memberCount,
    }));
}

function toSimplifiedEdges(edges: Edge[]): EdgeInput[] {
    return edges.map((e) => ({
        source: e.source,
        target: e.target,
        connectionType: (e.data as any)?.connectionType ?? 'reports-to',
    }));
}

/* ────────────────────────────────────────────── */
/* Inner Component                                 */
/* ────────────────────────────────────────────── */

function OrgNetworkFlowInner({
    nodes,
    edges,
    direction = 'TB',
    readOnly = false,
    primaryColor = '#1976d2',

    onChange,
    onNodeSelect,
    onEdgeSelect,
    onNodeAdd,
    onNodeEdit,
    onNodeDelete,
}: OrgNetworkFlowProps) {
    const flowRef = useRef<HTMLDivElement>(null);

    /* Layouted data from props */
    const rfData = useMemo(() => {
        return getLayoutedElements(
            toRFNodes(nodes),
            toRFEdges(edges),
            direction
        );
    }, [nodes, edges, direction]);

    /* Controlled node updates */
    const handleNodesChange = useCallback(
        (changes: NodeChange[]) => {
            const updated = applyNodeChanges(
                changes,
                rfData.nodes
            ) as Node<OrgNodeData>[];

            // Filter out non-essential changes like 'dimensions' and 'select' 
            // to avoid infinite re-render loops when parent state is updated.
            console.log(changes, "changes")
            const essentialChanges = changes.filter(
                (c) => c.type !== 'dimensions' && c.type !== 'select'
            );
            console.log(essentialChanges, "essentialChanges")
            if (essentialChanges.length > 0) {
                console.log('Node changes detected:', essentialChanges);
                onChange(toSimplifiedNodes(updated), edges);
            }
        },
        [rfData.nodes, edges, onChange]
    );

    /* Controlled edge updates */
    const handleEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            const updated = applyEdgeChanges(changes, rfData.edges);
            console.log(changes, "changes")
            // Filter out 'select' changes to avoid redundant calls to parent
            const essentialChanges = changes.filter((c) => c.type !== 'select');
            console.log(essentialChanges, "essentialChanges")
            if (essentialChanges.length > 0) {
                console.log('Edge changes detected:', essentialChanges);
                onChange(nodes, toSimplifiedEdges(updated));
            }
        },
        [rfData.edges, nodes, onChange]
    );

    /* Controlled connect */
    const handleConnect = useCallback(
        (c: Connection) => {
            if (!c.source || !c.target || c.source === c.target) return;

            onChange(nodes, [
                ...edges,
                {
                    source: c.source,
                    target: c.target,
                    connectionType: 'reports-to',
                },
            ]);
        },
        [nodes, edges, onChange]
    );


    const onReconnect = useCallback(
        (oldEdge: Edge, connection: Connection) => {
            if (!connection.source || !connection.target) return;

            const updatedEdges = rfData.edges.map((e) =>
                e.id === oldEdge.id
                    ? {
                        ...e,
                        source: connection.source,
                        target: connection.target,
                    }
                    : e
            );

            onChange(nodes, toSimplifiedEdges(updatedEdges));
        },
        [nodes, edges, onChange]
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
                        onEdgesChange={readOnly ? undefined : handleEdgesChange}
                        onConnect={readOnly ? undefined : handleConnect}
                        onReconnect={readOnly ? undefined : onReconnect}
                        onNodeClick={(_, n) => onNodeSelect?.(n.id)}
                        onEdgeClick={(_, e) => onEdgeSelect?.(e.id)}
                        onPaneClick={() => onNodeSelect?.(null)}
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
            <OrgNetworkFlowInner {...props} />
        </ReactFlowProvider>
    );
}