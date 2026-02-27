import { useCallback, useState, useMemo, useRef } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    addEdge,
    reconnectEdge,
    type Node,
    type Edge,
    type Connection,
    BackgroundVariant,
    ConnectionLineType,
    useReactFlow,
    ReactFlowProvider,
} from '@xyflow/react';
import dagre from 'dagre';
import OrgNode from './OrgNode';
import AddOrgModal from './AddOrgModal';
import DetailPanel from './DetailPanel';
import EdgeDetailPanel from './EdgeDetailPanel';
import ConnectionTypeSelector from './ConnectionTypeSelector';
import type {

    OrgNetworkFlowProps,
    NodeInput,
    EdgeInput,
    ConnectionType,
} from './types';
import { CONNECTION_TYPES } from './types';
import '@xyflow/react/dist/style.css';
import './OrgNode.css';
import './AddOrgModal.css';
import type { OrgNodeData } from './OrgNetworkFlow_widget';

// Re-export types for consumers
export type { OrgNodeData, OrgNetworkFlowProps, NodeInput, EdgeInput, ConnectionType };
export { CONNECTION_TYPES };

// ─── Dagre Layout ───────────────────────────────────────────
const NODE_WIDTH = 260;
const NODE_HEIGHT = 100;

function getLayoutedElements(
    nodes: Node<OrgNodeData>[],
    edges: Edge[],
    direction: 'TB' | 'LR' = 'TB'
) {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 90 });

    nodes.forEach((node) => {
        g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    edges.forEach((edge) => {
        g.setEdge(edge.source, edge.target);
    });

    dagre.layout(g);

    const layoutedNodes = nodes.map((node) => {
        const pos = g.node(node.id);
        return {
            ...node,
            position: {
                x: pos.x - NODE_WIDTH / 2,
                y: pos.y - NODE_HEIGHT / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
}

// ─── Default demo data (used when no props are supplied) ────
const DEFAULT_NODES: NodeInput[] = [
    { id: 'hq', label: 'Headquarters', description: 'Global HQ' },
    { id: 'eng', label: 'Engineering', description: 'Product & Platform' },
    { id: 'sales', label: 'Sales', description: 'Revenue & Growth' },
    { id: 'hr', label: 'Human Resources', description: 'People & Culture' },
    { id: 'frontend', label: 'Frontend Team', description: 'Web & Mobile UI' },
    { id: 'backend', label: 'Backend Team', description: 'APIs & Services' },
    { id: 'devops', label: 'DevOps', description: 'Infrastructure & CI/CD' },
];

const DEFAULT_EDGES: EdgeInput[] = [
    { id: 'e1', source: 'hq', target: 'eng', connectionType: 'reports-to' },
    { id: 'e2', source: 'hq', target: 'sales', connectionType: 'reports-to' },
    { id: 'e3', source: 'hq', target: 'hr', connectionType: 'reports-to' },
    { id: 'e4', source: 'eng', target: 'frontend', connectionType: 'reports-to' },
    { id: 'e5', source: 'eng', target: 'backend', connectionType: 'reports-to' },
    { id: 'e6', source: 'eng', target: 'devops', connectionType: 'reports-to' },
];

// ─── Helpers: convert simplified inputs → React Flow shapes ─
function toRFNodes(inputs: NodeInput[]): Node<OrgNodeData>[] {
    return inputs.map((n) => ({
        id: n.id,
        type: 'orgNode',
        position: { x: 0, y: 0 },
        data: { label: n.label, description: n.description },
    }));
}

function toRFEdges(inputs: EdgeInput[]): Edge[] {
    return inputs.map((e) => {
        const connType: ConnectionType = e.connectionType ?? 'reports-to';
        const style = CONNECTION_TYPES[connType];
        return {
            id: e.id,
            source: e.source,
            target: e.target,
            type: 'smoothstep',
            animated: style.animated,
            style: {
                stroke: style.color,
                strokeWidth: 2,
                strokeDasharray: style.strokeDasharray,
            },
            data: { connectionType: connType },
        };
    });
}

// ─── Modal State Types ──────────────────────────────────────
type ModalState =
    | { mode: 'add'; parentId: string; parentName: string }
    | { mode: 'edit'; nodeId: string; currentName: string; currentDescription: string };

// ─── Helpers: convert React Flow shapes → simplified outputs ─
function toSimplifiedNodes(rfNodes: Node<OrgNodeData>[]): NodeInput[] {
    return rfNodes.map((n) => ({
        id: n.id,
        label: n.data.label,
        description: n.data.description,
        memberCount: n.data.memberCount,
    }));
}

function toSimplifiedEdges(rfEdges: Edge[]): EdgeInput[] {
    return rfEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        connectionType: ((e.data as Record<string, unknown>)?.connectionType as ConnectionType) ?? 'reports-to',
    }));
}

// ─── Pending connection state ───────────────────────────────
interface PendingConnection {
    connection: Connection;
    position: { x: number; y: number };
}

// ─── Inner Component (needs ReactFlow context) ──────────────
function OrgNetworkFlowInner(props: OrgNetworkFlowProps) {
    const {
        initialNodes: inputNodes,
        initialEdges: inputEdges,
        direction = 'TB',
        readOnly = false,
        primaryColor = '#1976d2',
        onNodeAdd,
        onNodeEdit,
        onNodeDelete,
        onNodeSelect,
        onEdgeSelect,
        onEdgeConnect,
        onEdgeTypeChange,
        onChange,
    } = props;

    const reactFlowInstance = useReactFlow();
    const flowRef = useRef<HTMLDivElement>(null);

    // Build initial data
    const nodeInputs = inputNodes ?? DEFAULT_NODES;
    const edgeInputs = inputEdges ?? DEFAULT_EDGES;

    const initialData = useMemo(() => {
        const rfNodes = toRFNodes(nodeInputs);
        const rfEdges = toRFEdges(edgeInputs);
        return getLayoutedElements(rfNodes, rfEdges, direction);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only compute on mount

    const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);
    const [modalState, setModalState] = useState<ModalState | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
    const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
    const reconnectingRef = useRef(false);

    const selectedEdge = useMemo(
        () => edges.find((e) => e.id === selectedEdgeId) || null,
        [edges, selectedEdgeId]
    );

    const selectedNode = useMemo(
        () => nodes.find((n) => n.id === selectedNodeId) || null,
        [nodes, selectedNodeId]
    );

    const onNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            setSelectedNodeId(node.id);
            setSelectedEdgeId(null);
            onNodeSelect?.(node.id);
        },
        [onNodeSelect]
    );
    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setPendingConnection(null);
        onNodeSelect?.(null);
    }, [onNodeSelect]);

    // ─── Connect nodes by dragging handles ──────────────────
    const onConnect = useCallback(
        (connection: Connection) => {
            if (readOnly) return;
            if (connection.source === connection.target) return; // prevent self-connection

            // Get the viewport mouse position for the popup
            // We use the center of the viewport as a fallback
            const flowBounds = flowRef.current?.getBoundingClientRect();
            // console.log(flowBounds, 'flowBounds');
            const centerX = flowBounds ? flowBounds.left + flowBounds.width / 2 : window.innerWidth / 2;
            const centerY = flowBounds ? flowBounds.top + flowBounds.height / 2 : window.innerHeight / 2;
            // console.log(centerX, centerY, 'centerX,centerY');

            // Try to get position of the target node for better popup placement
            let popupX = centerX;
            let popupY = centerY;
            // console.log(popupX, popupY, 'popupX,popupY');
            if (connection.target) {
                const targetNode = reactFlowInstance.getNode(connection.target);
                if (targetNode) {
                    const screenPos = reactFlowInstance.flowToScreenPosition({
                        x: targetNode.position.x + NODE_WIDTH / 2,
                        y: targetNode.position.y,
                    });
                    popupX = screenPos.x;
                    popupY = screenPos.y;
                }
            }
            console.log(connection, 'connection');
            // console.log(popupX, popupY)
            setPendingConnection({
                connection,
                position: { x: popupX, y: popupY },
            });
        },
        [readOnly, reactFlowInstance]
    );

    // ─── Finalize connection with chosen type ───────────────
    const handleConnectionTypeSelect = useCallback(
        (type: ConnectionType) => {
            if (!pendingConnection) return;
            const { connection } = pendingConnection;
            const connStyle = CONNECTION_TYPES[type];

            // Check for duplicate: same source, target, and type
            const duplicateExists = edges.some(
                (e) =>
                    e.source === connection.source &&
                    e.target === connection.target &&
                    ((e.data as Record<string, unknown>)?.connectionType as string) === type
            );

            if (duplicateExists) {
                setPendingConnection(null);
                return;
            }



            const newEdge: Edge = {
                ...connection,
                id: `e-${connection.source}-${connection.target}-${type}`,
                type: 'smoothstep',
                animated: connStyle.animated,
                style: {
                    stroke: connStyle.color,
                    strokeWidth: 2,
                    strokeDasharray: connStyle.strokeDasharray,
                },
                data: { connectionType: type },
            };

            setEdges((eds) => {
                const updated = addEdge(newEdge, eds) as Edge[];
                onChange?.(toSimplifiedNodes(nodes as Node<OrgNodeData>[]), toSimplifiedEdges(updated));
                return updated;
            });

            onEdgeConnect?.(connection.source!, connection.target!, type);
            setPendingConnection(null);
        },
        [pendingConnection, edges, nodes, setEdges, onChange, onEdgeConnect,

        ]
    );

    const handleConnectionCancel = useCallback(() => {
        setPendingConnection(null);
    }, []);

    // ─── Reconnect (relocate) an existing edge ──────────────
    const onReconnectStart = useCallback(() => {
        reconnectingRef.current = true;
    }, []);

    const onReconnect = useCallback(
        (oldEdge: Edge, newConnection: Connection) => {
            if (readOnly) return;
            reconnectingRef.current = false;
            if (newConnection.source === newConnection.target) return; // prevent self-connection

            const connType = ((oldEdge.data as Record<string, unknown>)?.connectionType as ConnectionType) ?? 'reports-to';

            // Prevent duplicate: same source, target, and type
            const duplicateExists = edges.some(
                (e) =>
                    e.id !== oldEdge.id &&
                    e.source === newConnection.source &&
                    e.target === newConnection.target &&
                    ((e.data as Record<string, unknown>)?.connectionType as string) === connType
            );
            if (duplicateExists) return;



            setEdges((eds) => {
                const updated = reconnectEdge(oldEdge, newConnection, eds) as Edge[];
                // Reapply style to the reconnected edge
                const finalEdges = updated.map((e) => {
                    if (
                        e.source === newConnection.source &&
                        e.target === newConnection.target &&
                        !edges.some((orig) => orig.id === e.id && orig.source === e.source && orig.target === e.target)
                    ) {
                        const connStyle = CONNECTION_TYPES[connType];
                        return {
                            ...e,
                            id: `e-${e.source}-${e.target}-${connType}`,
                            type: 'smoothstep',
                            animated: connStyle.animated,
                            style: {
                                stroke: connStyle.color,
                                strokeWidth: 2,
                                strokeDasharray: connStyle.strokeDasharray,
                            },
                            data: { connectionType: connType },
                        };
                    }
                    return e;
                });
                onChange?.(toSimplifiedNodes(nodes as Node<OrgNodeData>[]), toSimplifiedEdges(finalEdges));
                return finalEdges;
            });
        },
        [readOnly, edges, nodes, setEdges, onChange,

        ]
    );

    const onReconnectEnd = useCallback(
        () => {
            // If dropped without connecting, just reset — edge snaps back
            reconnectingRef.current = false;
        },
        []
    );

    // ─── Change edge type ───────────────────────────────────
    const handleEdgeTypeChange = useCallback(
        (edgeId: string, newType: ConnectionType) => {

            const connStyle = CONNECTION_TYPES[newType];
            setEdges((eds) => {
                const updated = eds.map((e) => {
                    if (e.id !== edgeId) return e;
                    return {
                        ...e,
                        id: `e-${e.source}-${e.target}-${newType}`,
                        animated: connStyle.animated,
                        style: {
                            stroke: connStyle.color,
                            strokeWidth: 2,
                            strokeDasharray: connStyle.strokeDasharray,
                        },
                        data: { ...((e.data as Record<string, unknown>) ?? {}), connectionType: newType },
                    };
                });
                onChange?.(toSimplifiedNodes(nodes as Node<OrgNodeData>[]), toSimplifiedEdges(updated));
                return updated;
            });
            onEdgeTypeChange?.(edgeId, newType);
            // Update selectedEdgeId to track the renamed edge
            setSelectedEdgeId((prev) => {
                if (prev === edgeId) {
                    const edge = edges.find((e) => e.id === edgeId);
                    if (edge) return `e-${edge.source}-${edge.target}-${newType}`;
                }
                return prev;
            });
        },
        [nodes, edges, setEdges, onChange, onEdgeTypeChange,

        ]
    );

    // ─── Add Child ──────────────────────────────────────────
    const handleAddChild = useCallback((parentId: string) => {
        const parentNode = nodes.find((n) => n.id === parentId);
        if (parentNode) {
            setModalState({
                mode: 'add',
                parentId,
                parentName: (parentNode.data as OrgNodeData).label,
            });
        }
    }, [nodes]);

    // ─── Edit Node ──────────────────────────────────────────
    const handleEdit = useCallback((nodeId: string) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
            const data = node.data as OrgNodeData;
            setModalState({
                mode: 'edit',
                nodeId,
                currentName: data.label,
                currentDescription: data.description || '',
            });
        }
    }, [nodes]);

    // ─── Delete Node ────────────────────────────────────────
    const handleDelete = useCallback((nodeId: string) => {

        const getDescendants = (id: string, allEdges: Edge[]): string[] => {
            const childIds = allEdges
                .filter((e) => e.source === id)
                .map((e) => e.target);
            return childIds.reduce<string[]>(
                (acc, childId) => [...acc, childId, ...getDescendants(childId, allEdges)],
                []
            );
        };

        const idsToDelete = new Set([nodeId, ...getDescendants(nodeId, edges)]);
        const remainingNodes = nodes.filter((n) => !idsToDelete.has(n.id));
        const remainingEdges = edges.filter(
            (e) => !idsToDelete.has(e.source) && !idsToDelete.has(e.target)
        );

        const { nodes: newLayoutedNodes, edges: newLayoutedEdges } =
            getLayoutedElements(remainingNodes as Node<OrgNodeData>[], remainingEdges, direction);

        setNodes(newLayoutedNodes);
        setEdges(newLayoutedEdges);
        if (idsToDelete.has(selectedNodeId || '')) {
            setSelectedNodeId(null);
        }
        onNodeDelete?.(nodeId);
        onChange?.(toSimplifiedNodes(newLayoutedNodes), toSimplifiedEdges(newLayoutedEdges));
    }, [nodes, edges, setNodes, setEdges, selectedNodeId, direction, onNodeDelete, onChange,

    ]);

    // ─── Modal Confirm (add or edit) ────────────────────────
    const handleModalConfirm = useCallback(
        (name: string, description: string) => {
            if (!modalState) return;

            if (modalState.mode === 'add') {

                const newId = `org-${Date.now()}`;
                const newNode: Node<OrgNodeData> = {
                    id: newId,
                    type: 'orgNode',
                    position: { x: 0, y: 0 },
                    data: { label: name, description: description || undefined, memberCount: 0 },
                };

                const connType: ConnectionType = 'reports-to';
                const connStyle = CONNECTION_TYPES[connType];
                const newEdge: Edge = {
                    id: `e-${modalState.parentId}-${newId}-${connType}`,
                    source: modalState.parentId,
                    target: newId,
                    type: 'smoothstep',
                    animated: connStyle.animated,
                    style: {
                        stroke: connStyle.color,
                        strokeWidth: 2,
                        strokeDasharray: connStyle.strokeDasharray,
                    },
                    data: { connectionType: connType },
                };

                const allNodes = [...nodes, newNode];
                const allEdges = [...edges, newEdge];
                const { nodes: newLayoutedNodes, edges: newLayoutedEdges } =
                    getLayoutedElements(allNodes as Node<OrgNodeData>[], allEdges, direction);

                setNodes(newLayoutedNodes);
                setEdges(newLayoutedEdges);
                onNodeAdd?.(modalState.parentId, name, description);
                onChange?.(toSimplifiedNodes(newLayoutedNodes), toSimplifiedEdges(newLayoutedEdges));
            } else if (modalState.mode === 'edit') {

                const updatedNodes = nodes.map((node) =>
                    node.id === modalState.nodeId
                        ? {
                            ...node,
                            data: {
                                ...node.data,
                                label: name,
                                description: description || undefined,
                            },
                        }
                        : node
                );
                setNodes(updatedNodes);
                onNodeEdit?.(modalState.nodeId, name, description);
                onChange?.(toSimplifiedNodes(updatedNodes as Node<OrgNodeData>[]), toSimplifiedEdges(edges));
            }

            setModalState(null);
        },
        [modalState, nodes, edges, setNodes, setEdges, direction, onNodeAdd, onNodeEdit, onChange,

        ]
    );

    // ─── Edge Click — show detail panel ──────────────────────
    const onEdgeClick = useCallback(
        (_event: React.MouseEvent, edge: Edge) => {
            setSelectedEdgeId(edge.id);
            setSelectedNodeId(null);
            onEdgeSelect?.(edge.id)
        },
        []
    );

    // ─── Delete Edge ────────────────────────────────────────
    const handleDeleteEdge = useCallback(
        (edgeId: string) => {
            if (window.confirm('Remove this connection?')) {

                setEdges((eds) => {
                    const updated = eds.filter((e) => e.id !== edgeId);
                    onChange?.(toSimplifiedNodes(nodes as Node<OrgNodeData>[]), toSimplifiedEdges(updated));
                    return updated;
                });
                setSelectedEdgeId(null);
            }
        },
        [setEdges, nodes, edges, onChange,

        ]
    );

    // ─── Inject callbacks into node data ────────────────────
    const nodesWithCallback = useMemo(
        () =>
            nodes.map((node) => ({
                ...node,
                data: {
                    ...node.data,
                    onAddChild: readOnly ? undefined : handleAddChild,
                    onEdit: readOnly ? undefined : handleEdit,
                    onDelete: readOnly ? undefined : handleDelete,
                    readOnly,
                },
            })),
        [nodes, handleAddChild, handleEdit, handleDelete, readOnly]
    );

    const nodeTypes = useMemo(() => ({ orgNode: OrgNode }), []);

    const containerStyle = primaryColor !== '#1976d2'
        ? { '--orgnet-primary': primaryColor } as React.CSSProperties
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
                <div className="orgnet-flow-canvas" ref={flowRef}>
                    <ReactFlow
                        nodes={nodesWithCallback}
                        edges={edges}
                        onNodesChange={(v) => {
                            console.log(v, "oNodeChange")
                            onNodesChange(v)
                        }}
                        onEdgesChange={readOnly ? undefined : (v) => {
                            console.log(v, "onEdgeChange")
                            onEdgesChange(v)
                        }}
                        onConnect={readOnly ? undefined : (v) => {
                            console.log(v, "onConnect")
                            onConnect(v)
                        }}
                        onReconnect={readOnly ? undefined : (v, e) => {
                            console.log(v, e, "onReconnect")
                            onReconnect(v, e,)
                        }
                        }
                        onReconnectStart={readOnly ? undefined : (e) => {
                            console.log("onReconnectStart", e)
                            onReconnectStart()
                        }}
                        onReconnectEnd={readOnly ? undefined :
                            (e) => {
                                console.log("onReconnectEnd", e)
                                onReconnectEnd()
                            }}
                        onEdgeClick={(e, edge) => {
                            console.log("onEdgeClick", e, edge)
                            onEdgeClick(e, edge)
                        }}
                        onNodeClick={
                            (e, node) => {
                                console.log("onNodeClick", e, node)
                                onNodeClick(e, node)
                            }
                        }
                        onPaneClick={onPaneClick}
                        nodeTypes={nodeTypes}
                        connectionLineType={ConnectionLineType.SmoothStep}
                        fitView
                        fitViewOptions={{ padding: 0.3 }}
                        minZoom={0.3}
                        maxZoom={2}
                        proOptions={{ hideAttribution: true }}
                        nodesDraggable={!readOnly}
                        nodesConnectable={!readOnly}
                    >
                        <Background
                            variant={BackgroundVariant.Dots}
                            gap={20}
                            size={1}
                            color="rgba(139, 92, 246, 0.08)"
                        />
                        <Controls
                            className="orgnet-flow-controls"
                            showInteractive={false}
                        />
                    </ReactFlow>
                </div>

                {selectedNode && !selectedEdgeId && (
                    <DetailPanel
                        node={selectedNode as Node<OrgNodeData>}
                        edges={edges}
                        allNodes={nodes as Node<OrgNodeData>[]}
                        onClose={() => {
                            setSelectedNodeId(null);
                            onNodeSelect?.(null);
                        }}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAddChild={handleAddChild}
                        readOnly={readOnly}
                    />
                )}

                {selectedEdge && (
                    <EdgeDetailPanel
                        edge={selectedEdge}
                        allNodes={nodes as Node<OrgNodeData>[]}
                        onClose={() => setSelectedEdgeId(null)}
                        onDelete={readOnly ? undefined : handleDeleteEdge}
                        onTypeChange={readOnly ? undefined : handleEdgeTypeChange}
                        readOnly={readOnly}
                    />
                )}
            </div>

            {/* Connection Type Selector Popup */}
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
                    onConfirm={handleModalConfirm}
                    onCancel={() => setModalState(null)}
                />
            )}
        </div>
    );
}

// ─── Wrapper with ReactFlowProvider ─────────────────────────
export default function OrgNetworkFlow(props: OrgNetworkFlowProps) {
    return (
        <ReactFlowProvider>
            <OrgNetworkFlowInner {...props} />
        </ReactFlowProvider>
    );
}
