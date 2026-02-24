import { useCallback, useMemo, useRef } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
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
import { CONNECTION_TYPES, type ConnectionType } from './types';
import '@xyflow/react/dist/style.css';
import './OrgNode.css';
import './AddOrgModal.css';

// Re-export types for consumers
export type { ConnectionType };
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


export interface OrgNetworkFlowProps {
    initialNodes: NodeInput[];
    initialEdges: EdgeInput[];
    direction?: 'TB' | 'LR';
    readOnly?: boolean;
    primaryColor?: string;

    onChange: (nodes: NodeInput[], edges: EdgeInput[]) => void;

    onNodeSelect?: (nodeId: string | null) => void;
    onEdgeSelect?: (edgeId: string | null) => void;

    onEdgeConnect?: (source: string, target: string, type: ConnectionType) => void;
    onEdgeTypeChange?: (edgeId: string, type: ConnectionType) => void;
    onEdgeDelete?: (edgeId: string) => void;

    onNodeAdd?: (parentId: string) => void;
    onNodeEdit?: (nodeId: string) => void;
    onNodeDelete?: (nodeId: string) => void;
}

/** Data attached to each org node */
export interface OrgNodeData {
    label: string;
    description?: string;
    memberCount?: number;
    // Internal — injected by the widget, not user-facing
    onAddChild?: (parentId: string) => void;
    onEdit?: (nodeId: string) => void;
    onDelete?: (nodeId: string) => void;
    readOnly?: boolean;
    // Index signature required by React Flow's Record<string, unknown> constraint
    [key: string]: unknown;
}

/** Simplified node input for consumers */
export interface NodeInput {
    id: string;
    label: string;
    description?: string;
    memberCount?: number;
    type?: string
}

/** Simplified edge input for consumers */
export interface EdgeInput {
    source: string;
    target: string;
    connectionType?: ConnectionType;
}

// ─── Default demo data (used when no props are supplied) ────
const DEFAULT_NODES: NodeInput[] = [
    { id: 'hq', label: 'Headquarters', description: 'Global HQ', memberCount: 150 },
    { id: 'eng', label: 'Engineering', description: 'Product & Platform', memberCount: 65 },
    { id: 'sales', label: 'Sales', description: 'Revenue & Growth', memberCount: 40 },
    { id: 'hr', label: 'Human Resources', description: 'People & Culture', memberCount: 12 },
    { id: 'frontend', label: 'Frontend Team', description: 'Web & Mobile UI', memberCount: 20 },
    { id: 'backend', label: 'Backend Team', description: 'APIs & Services', memberCount: 25 },
    { id: 'devops', label: 'DevOps', description: 'Infrastructure & CI/CD', memberCount: 10 },
];

const DEFAULT_EDGES: EdgeInput[] = [
    { source: 'hq', target: 'eng', connectionType: 'reports-to' },
    { source: 'hq', target: 'sales', connectionType: 'reports-to' },
    { source: 'hq', target: 'hr', connectionType: 'reports-to' },
    { source: 'eng', target: 'frontend', connectionType: 'reports-to' },
    { source: 'eng', target: 'backend', connectionType: 'reports-to' },
    { source: 'eng', target: 'devops', connectionType: 'reports-to' },
];

// ─── Helpers: convert simplified inputs → React Flow shapes ─
function toRFNodes(inputs: NodeInput[]): Node<OrgNodeData>[] {
    return inputs.map((n) => ({
        id: n.id,
        type: 'orgNode',
        position: { x: 0, y: 0 },
        data: { label: n.label, description: n.description, memberCount: n.memberCount },
    }));
}

function toRFEdges(inputs: EdgeInput[]): Edge[] {
    return inputs.map((e) => {
        const connType: ConnectionType = e.connectionType ?? 'reports-to';
        const style = CONNECTION_TYPES[connType];
        return {
            id: `e-${e.source}-${e.target}-${connType}`,
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



    const reconnectingRef = useRef(false);



    const onNodeClick =
        (_event: React.MouseEvent, node: Node) => {
            onNodeSelect?.(node.id);
        }


    const onPaneClick = () => {
        onNodeSelect?.(null);
    }



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


            // Try to get position of the target node for better popup placement
            let popupX = centerX;
            let popupY = centerY;
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
        },
        [readOnly, reactFlowInstance]
    );





    // ─── Reconnect (relocate) an existing edge ──────────────
    const onReconnectStart = () => {
        reconnectingRef.current = true;
    }


    const onReconnectEnd =
        () => {
            reconnectingRef.current = false;
        }



    // ─── Add Child ──────────────────────────────────────────
    const handleAddChild =
        (parentId: string) => {
            const parentNode = initialData.nodes.find((n) => n.id === parentId);
            if (parentNode) {
                onNodeAdd?.(parentId)
            }
        }

    // ─── Edit Node ──────────────────────────────────────────
    const handleEdit = (nodeId: string) => {
        const node = initialData.nodes.find((n) => n.id === nodeId);
        if (node) {
            onNodeEdit?.(nodeId)
        }

    };

    // ─── Delete Node ────────────────────────────────────────
    const handleDelete = (nodeId: string) => {
        onNodeDelete?.(nodeId);
    };



    // ─── Edge Click — show detail panel ──────────────────────
    const onEdgeClick =
        (_event: React.MouseEvent, edge: Edge) => {

            onEdgeSelect?.(edge.id)
        }


    // ─── Inject callbacks into node data ────────────────────
    const nodesWithCallback = useMemo(
        () =>
            initialData.nodes.map((node) => ({
                ...node,
                data: {
                    ...node.data,
                    onAddChild: readOnly ? undefined : handleAddChild,
                    onEdit: readOnly ? undefined : handleEdit,
                    onDelete: readOnly ? undefined : handleDelete,
                    readOnly,
                },
            })),
        [initialData.nodes, handleAddChild, handleEdit, handleDelete, readOnly]
    );

    const nodeTypes = useMemo(() => ({ orgNode: OrgNode }), []);

    const containerStyle = primaryColor !== '#1976d2'
        ? { '--orgnet-primary': primaryColor } as React.CSSProperties
        : undefined;
    return (
        <div className="orgnet-flow-container" style={containerStyle}>
            <div className="orgnet-flow-main">
                <div className="orgnet-flow-canvas" ref={flowRef}>
                    <ReactFlow
                        nodes={nodesWithCallback}
                        edges={initialData.edges}
                        onNodesChange={(v) => {
                            console.log(v, "oNodeChange")
                            // onNodesChange(v)
                        }}
                        onEdgesChange={readOnly ? undefined : (v) => {
                            console.log(v, "onEdgeChange")
                            // onEdgesChange(v)
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

            </div>
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
