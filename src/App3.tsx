import { useState, useCallback } from 'react';
import OrgNetworkFlow from './components/orgNetworkWidget';
import type { ConnectionTypeStyle, EdgeInput, NodeInput } from './components/types';
import type { NodeChange } from '@xyflow/react';
import AddOrgModal from './components/AddOrgModal';
import './components/AddOrgModal.css';
import './index.css';

// ─── Initial Demo Data ──────────────────────────────────────
const initialNodes: NodeInput[] = [
    { id: 'hq', label: 'Headquarters', description: 'Global HQ', position: { x: 0, y: 0 }, type: 'orgNode' },
    { id: 'eng', label: 'Engineering', description: 'Product & Platform', position: { x: 0, y: 0 }, type: 'orgNode' },
    { id: 'sales', label: 'Sales', description: 'Revenue & Growth', position: { x: 0, y: 0 }, type: 'orgNode' },
    { id: 'hr', label: 'Human Resources', description: 'People & Culture', position: { x: 0, y: 0 }, type: 'orgNode' },
    { id: 'frontend', label: 'Frontend Team', description: 'Web & Mobile UI', position: { x: 0, y: 0 }, type: 'orgNode' },
    { id: 'backend', label: 'Backend Team', description: 'APIs & Services', position: { x: 0, y: 0 }, type: 'orgNode' },
    { id: 'devops', label: 'DevOps', description: 'Infrastructure & CI/CD', position: { x: 0, y: 0 }, type: 'orgNode' },
];

const initialEdges: EdgeInput[] = [
    { id: 'e1', source: 'hq', target: 'eng', connectionType: 'reports-to', sourceHandle: 'bottom-source', targetHandle: 'top-target' },
    { id: 'e2', source: 'hq', target: 'sales', connectionType: 'reports-to', sourceHandle: 'bottom-source', targetHandle: 'top-target' },
    { id: 'e3', source: 'hq', target: 'hr', connectionType: 'reports-to', sourceHandle: 'bottom-source', targetHandle: 'top-target' },
    { id: 'e4', source: 'eng', target: 'frontend', connectionType: 'reports-to', sourceHandle: 'bottom-source', targetHandle: 'top-target' },
    { id: 'e5', source: 'eng', target: 'backend', connectionType: 'reports-to', sourceHandle: 'bottom-source', targetHandle: 'top-target' },
    { id: 'e6', source: 'eng', target: 'devops', connectionType: 'reports-to', sourceHandle: 'bottom-source', targetHandle: 'top-target' },
];

/** Available connection types between nodes */
export type ConnectionType = 'reports-to' | 'collaborates' | 'funds' | 'advises';

/** Registry mapping each ConnectionType to its visual style */
export const CONNECTION_TYPES: Record<ConnectionType, ConnectionTypeStyle> = {
    'reports-to': {
        label: 'Reports To',
        color: '#1976d2',
        animated: false,
        icon: '⬆',
        edgeType: 'smoothstep',
    },
    collaborates: {
        label: 'Collaborates',
        color: '#16a34a',
        strokeDasharray: '6 3',
        animated: true,
        icon: '🤝',
        edgeType: 'default',
    },
    funds: {
        label: 'Funds',
        color: '#d97706',
        strokeDasharray: '2 4',
        animated: false,
        icon: '💰',
        edgeType: 'straight',
    },
    advises: {
        label: 'Advises',
        color: '#9333ea',
        strokeDasharray: '8 4 2 4',
        animated: true,
        icon: '💡',
        edgeType: 'step',
    },
};




function App3() {
    const [nodes, setNodes] = useState<NodeInput[]>(initialNodes);
    const [edges, setEdges] = useState<EdgeInput[]>(initialEdges);
    const [selectedNodeId, setSelectedNodeId] = useState<string>('');
    const [selectedEdgeId, setSelectedEdgeId] = useState<string>('');

    // ─── Add Modal State ────────────────────────────────────
    const [addModalParentId, setAddModalParentId] = useState<string | null>(null);

    // ─── Edit Modal State ───────────────────────────────────
    const [editModalNodeId, setEditModalNodeId] = useState<string | null>(null);

    // Derived: find the parent node's label for the modal subtitle
    const addModalParentName = addModalParentId
        ? nodes.find((n) => n.id === addModalParentId)?.label ?? addModalParentId
        : undefined;

    // Widget fires onNodeAdd(parentId) → we open the modal
    const handleNodeAdd = useCallback((parentId: string) => {
        setAddModalParentId(parentId);
    }, []);

    // Modal confirmed → create the node + edge, close modal
    const handleAddConfirm = useCallback((name: string, description: string) => {
        if (!addModalParentId) return;

        const newId = `org-${Date.now()}`;
        const newNode: NodeInput = {
            id: newId,
            label: name,
            description,
            position: { x: 0, y: 0 },
            type: 'orgNode',
        };
        const newEdge: EdgeInput = {
            id: `e-${Date.now()}`,
            source: addModalParentId,
            target: newId,
            connectionType: 'reports-to',
            sourceHandle: 'bottom-source',
            targetHandle: 'top-target',
        };

        setNodes((prev) => [...prev, newNode]);
        setEdges((prev) => [...prev, newEdge]);
        setAddModalParentId(null); // close modal
        console.log(`Node "${name}" added under ${addModalParentId}`);
    }, [addModalParentId]);

    // Modal cancelled → close modal
    const handleAddCancel = useCallback(() => {
        setAddModalParentId(null);
    }, []);

    // Widget fires onNodeEdit(nodeId) → open modal in edit mode
    const editNode = editModalNodeId
        ? nodes.find((n) => n.id === editModalNodeId)
        : undefined;

    const handleNodeEdit = useCallback((nodeId: string) => {
        setEditModalNodeId(nodeId);
    }, []);

    const handleEditConfirm = useCallback((name: string, description: string) => {
        if (!editModalNodeId) return;
        setNodes((prev) =>
            prev.map((n) =>
                n.id === editModalNodeId
                    ? { ...n, label: name, description }
                    : n
            )
        );
        setEditModalNodeId(null);
        console.log(`Node ${editModalNodeId} updated to "${name}"`);
    }, [editModalNodeId]);

    const handleEditCancel = useCallback(() => {
        setEditModalNodeId(null);
    }, []);

    const handleNodeDelete = useCallback((nodeId: string) => {
        setNodes((prev) => prev.filter((n) => n.id !== nodeId));
        setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
        console.log(`Node ${nodeId} deleted`);
    }, []);

    const handleEdgeDelete = useCallback((edgeId: string) => {
        setEdges((prev) => prev.filter((e) => e.id !== edgeId));
        setSelectedEdgeId('');
        console.log(`Edge ${edgeId} deleted`);
    }, []);

    const handleEdgeTypeChange = useCallback((edgeId: string, newType: ConnectionType) => {
        setEdges((prev) =>
            prev.map((e) =>
                e.id === edgeId ? { ...e, connectionType: newType } : e
            )
        );
        console.log(`Edge ${edgeId} type changed to ${newType}`);
    }, []);

    // ─── Handle Node Changes from React Flow ────────────────
    const handleNodeLayoutChange = useCallback((changes: NodeChange[]) => {
        console.log('Node changes:', changes);
        setNodes((prev) => {
            let updated = [...prev];
            for (const change of changes) {
                switch (change.type) {
                    case 'position':
                        if (change.position) {
                            updated = updated.map((n) =>
                                n.id === change.id
                                    ? { ...n, position: change.position! }
                                    : n
                            );
                        }
                        break;
                    case 'remove':
                        updated = updated.filter((n) => n.id !== change.id);
                        setEdges((prevEdges) =>
                            prevEdges.filter(
                                (e) => e.source !== change.id && e.target !== change.id
                            )
                        );
                        break;
                    default:
                        break;
                }
            }
            console.log(updated)
            return updated;
        });

    }, []);
    console.log(nodes, 'nodes')
    return (
        <>
            <OrgNetworkFlow
                nodes={nodes}
                edges={edges}
                selectedNodeId={selectedNodeId}
                selectedEdgeId={selectedEdgeId}
                onNodeSelect={setSelectedNodeId}
                onEdgeSelect={setSelectedEdgeId}
                onNodeAdd={handleNodeAdd}
                onNodeEdit={handleNodeEdit}
                onNodeDelete={handleNodeDelete}
                primaryColor="#1976d2"
                onEdgeAdd={(c) => { console.log('Edge added:', c); }}
                onEdgeDelete={handleEdgeDelete}
                onEdgeEdit={(edgeId, c) => { console.log('Edge reconnected:', edgeId, c); }}
                onEdgesChange={(changes) => { console.log('Edge changes:', changes) }}
                onNodesLayoutChange={handleNodeLayoutChange}
                edgeTypes={CONNECTION_TYPES}
                direction='TB'
            />

            {/* Add Org Modal */}
            {addModalParentId && (
                <AddOrgModal
                    mode="add"
                    parentName={addModalParentName}
                    onConfirm={handleAddConfirm}
                    onCancel={handleAddCancel}
                />
            )}

            {/* Edit Org Modal */}
            {editModalNodeId && editNode && (
                <AddOrgModal
                    mode="edit"
                    initialName={editNode.label ?? ''}
                    initialDescription={editNode.description ?? ''}
                    onConfirm={handleEditConfirm}
                    onCancel={handleEditCancel}
                />
            )}
        </>
    );
}

export default App3;
