import { useMemo, useCallback, useRef } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    type Node,
    type Edge,
    type Connection,
    BackgroundVariant,
    ConnectionLineType,
    ReactFlowProvider,
    useReactFlow,
} from '@xyflow/react';
import dagre from 'dagre';

import OrgNode from './OrgNode';
import DetailPanel from './DetailPanel';
import EdgeDetailPanel from './EdgeDetailPanel';
import AddOrgModal from './AddOrgModal';
import ConnectionTypeSelector from './ConnectionTypeSelector';


import '@xyflow/react/dist/style.css';
import { CONNECTION_TYPES, type ConnectionType, type EdgeInput, type NodeInput, type OrgNodeData } from './types';
import { useState } from 'react';
import './OrgNode.css';
import './AddOrgModal.css';



export interface OrgNetworkFlowProps {
    nodes: NodeInput[];
    edges: EdgeInput[];

    // selectedNodeId?: string | null;
    // selectedEdgeId?: string | null;

    direction?: 'TB' | 'LR';
    readOnly?: boolean;
    primaryColor?: string;

    onChange: (nodes: NodeInput[], edges: EdgeInput[]) => void;

    onNodeSelect?: (nodeId: string | null) => void;
    onEdgeSelect?: (edgeId: string | null) => void;

    onEdgeConnect?: (source: string, target: string, type: ConnectionType) => void;
    onEdgeTypeChange?: (edgeId: string, type: ConnectionType) => void;
    onEdgeDelete?: (edgeId: string) => void;

    onNodeAdd?: (parentId: string, name: string, description: string) => void;
    onNodeEdit?: (nodeId: string, name: string, description: string) => void;
    onNodeDelete?: (nodeId: string) => void;
}







const NODE_WIDTH = 260;
const NODE_HEIGHT = 100;

/* ---------------- layout ---------------- */

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

/* ---------------- converters ---------------- */

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
        const type: ConnectionType = e.connectionType ?? 'reports-to';
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

// ─── Modal State Types ──────────────────────────────────────
type ModalState =
    | { mode: 'add'; parentId: string; parentName: string }
    | { mode: 'edit'; nodeId: string; currentName: string; currentDescription: string };

// ─── Pending connection state ───────────────────────────────
interface PendingConnection {
    connection: Connection;
    position: { x: number; y: number };
}

/* ---------------- controlled widget ---------------- */

function OrgNetworkFlowInner(props: OrgNetworkFlowProps) {
    const {
        nodes,
        edges,
        // selectedNodeId,
        // selectedEdgeId,
        direction = 'TB',
        readOnly = false,
        primaryColor = '#1976d2',
    } = props;

    const reactFlow = useReactFlow();
    const containerRef = useRef<HTMLDivElement>(null);

    const [modalState, setModalState] = useState<ModalState | null>(null);
    const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);

    const rfNodes = useMemo(() => toRFNodes(nodes), [nodes]);
    const rfEdges = useMemo(() => toRFEdges(edges), [edges]);

    const layouted = useMemo(
        () => getLayoutedElements(rfNodes, rfEdges, direction),
        [rfNodes, rfEdges, direction]
    );

    // const selectedNode = useMemo(
    //     () => layouted.nodes.find((n) => n.id === selectedNodeId) ?? null,
    //     [layouted.nodes, selectedNodeId]
    // );

    // const selectedEdge = useMemo(
    //     () => layouted.edges.find((e) => e.id === selectedEdgeId) ?? null,
    //     [layouted.edges, selectedEdgeId]
    // );

    /* ---------- events ---------- */

    const onNodeClick = useCallback(
        (_: React.MouseEvent, node: Node) => {
            props.onNodeSelect?.(node.id);
        },
        [props.onNodeSelect]
    );

    const onPaneClick = useCallback(() => {
        props.onNodeSelect?.(null);
        props.onEdgeSelect?.(null);
    }, []);

    const onEdgeClick = useCallback(
        (_: React.MouseEvent, edge: Edge) => {
            props.onEdgeSelect?.(edge.id);
        },
        [props.onEdgeSelect]
    );

    const onConnect = useCallback(
        (connection: Connection) => {
            if (!connection.source || !connection.target || readOnly) return;

            const flowBounds = containerRef.current?.getBoundingClientRect();
            const centerX = flowBounds ? flowBounds.left + flowBounds.width / 2 : window.innerWidth / 2;
            const centerY = flowBounds ? flowBounds.top + flowBounds.height / 2 : window.innerHeight / 2;

            let popupX = centerX;
            let popupY = centerY;

            const targetNode = reactFlow.getNode(connection.target);
            if (targetNode) {
                const screenPos = reactFlow.flowToScreenPosition({
                    x: targetNode.position.x + NODE_WIDTH / 2,
                    y: targetNode.position.y,
                });
                popupX = screenPos.x;
                popupY = screenPos.y;
            }

            setPendingConnection({
                connection,
                position: { x: popupX, y: popupY },
            });
        },
        [props.onEdgeConnect, readOnly, reactFlow]
    );

    const handleConnectionTypeSelect = useCallback(
        (type: ConnectionType) => {
            if (!pendingConnection) return;
            const { connection } = pendingConnection;
            props.onEdgeConnect?.(connection.source!, connection.target!, type);
            setPendingConnection(null);
        },
        [pendingConnection, props.onEdgeConnect]
    );

    const handleConnectionCancel = useCallback(() => {
        setPendingConnection(null);
    }, []);

    const handleModalConfirm = useCallback(
        (name: string, description: string) => {
            if (!modalState) return;
            if (modalState.mode === 'add') {
                props.onNodeAdd?.(modalState.parentId, name, description);
            } else if (modalState.mode === 'edit') {
                props.onNodeEdit?.(modalState.nodeId, name, description);
            }
            setModalState(null);
        },
        [modalState, props.onNodeAdd, props.onNodeEdit]
    );

    const nodeTypes = useMemo(() => ({ orgNode: OrgNode }), []);

    const containerStyle =
        primaryColor !== '#1976d2'
            ? ({ '--orgnet-primary': primaryColor } as React.CSSProperties)
            : undefined;

    return (
        <div className="orgnet-flow-container" style={containerStyle}>
            <div className="orgnet-flow-header">
                <div className="orgnet-flow-header__title">
                    <span className="orgnet-flow-header__icon">🏢</span>
                    Organization Network
                </div>
                <div className="orgnet-flow-header__badge">
                    {nodes.length} organizations
                </div>
            </div>

            <div className="orgnet-flow-main">
                <div className="orgnet-flow-canvas" ref={containerRef}>
                    <ReactFlow
                        nodes={layouted.nodes}
                        edges={layouted.edges}
                        nodeTypes={nodeTypes}
                        onNodeClick={onNodeClick}
                        onEdgeClick={onEdgeClick}
                        onPaneClick={onPaneClick}
                        onConnect={onConnect}
                        nodesDraggable={!readOnly}
                        nodesConnectable={!readOnly}
                        connectionLineType={ConnectionLineType.SmoothStep}
                        fitView
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background
                            variant={BackgroundVariant.Dots}
                            gap={20}
                            size={1}
                            color="rgba(139,92,246,0.08)"
                        />
                        <Controls className="orgnet-flow-controls" showInteractive={false} />
                    </ReactFlow>
                </div>

                {/* {selectedNode && !selectedEdge && (
                    <DetailPanel
                        node={selectedNode}
                        edges={layouted.edges}
                        allNodes={layouted.nodes}
                        readOnly={readOnly}
                        onClose={() => props.onNodeSelect?.(null)}
                        onAddChild={(id) => {
                            const node = layouted.nodes.find(n => n.id === id);
                            if (node) {
                                setModalState({ mode: 'add', parentId: id, parentName: node.data.label });
                            }
                        }}
                        onEdit={(id) => {
                            const node = layouted.nodes.find(n => n.id === id);
                            if (node) {
                                setModalState({
                                    mode: 'edit',
                                    nodeId: id,
                                    currentName: node.data.label,
                                    currentDescription: node.data.description || ''
                                });
                            }
                        }}
                        onDelete={(id) => props.onNodeDelete?.(id)}
                    />
                )}

                {selectedEdge && (
                    <EdgeDetailPanel
                        edge={selectedEdge}
                        allNodes={layouted.nodes}
                        readOnly={readOnly}
                        onClose={() => props.onEdgeSelect?.(null)}
                        onDelete={(id) => props.onEdgeDelete?.(id)}
                        onTypeChange={(id, t) => props.onEdgeTypeChange?.(id, t)}
                    />
                )} */}
            </div>

            {pendingConnection && (
                <ConnectionTypeSelector
                    position={pendingConnection.position}
                    onSelect={handleConnectionTypeSelect}
                    onCancel={handleConnectionCancel}
                />
            )}

            {!readOnly && modalState && (
                <AddOrgModal
                    mode={modalState.mode}
                    parentName={modalState.mode === 'add' ? modalState.parentName : undefined}
                    initialName={modalState.mode === 'edit' ? modalState.currentName : ''}
                    initialDescription={modalState.mode === 'edit' ? modalState.currentDescription : ''}
                    onConfirm={(name, desc) => {
                        handleModalConfirm(name, desc);
                    }}
                    onCancel={() => setModalState(null)}
                />
            )}
        </div>
    );
}

/* ---------------- provider wrapper ---------------- */

export default function OrgNetworkFlow(props: OrgNetworkFlowProps) {
    return (
        <ReactFlowProvider>
            <OrgNetworkFlowInner {...props} />
        </ReactFlowProvider>
    );
}