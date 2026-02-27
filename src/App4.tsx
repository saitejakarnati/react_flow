import { useState, useCallback } from 'react';
import { type NodeChange, type EdgeChange } from '@xyflow/react';
import OrgNetworkFlow, { type EdgeProps, type NodeProps } from './components/index';
import './index.css';

// ─── Initial Demo Data ──────────────────────────────────────
const initialNodes: NodeProps[] = [
    {
        id: 'hq', label: 'Headquarters', description: 'Global HQ',
        type: 'orgNode'
    },
    { id: 'eng', label: 'Engineering', description: 'Product & Platform', type: 'orgNode' },
    { id: 'sales', label: 'Sales', description: 'Revenue & Growth', type: 'orgNode' },
    { id: 'hr', label: 'Human Resources', description: 'People & Culture', type: 'orgNode' },
    { id: 'frontend', label: 'Frontend Team', description: 'Web & Mobile UI', type: 'orgNode' },
    { id: 'backend', label: 'Backend Team', description: 'APIs & Services', type: 'orgNode' },
    { id: 'devops', label: 'DevOps', description: 'Infrastructure & CI/CD', type: 'orgNode' },
];

const initialEdges: EdgeProps[] = [
    { id: 'e1', source: 'hq', target: 'eng', connectionType: 'reports-to' },
    { id: 'e2', source: 'hq', target: 'sales', connectionType: 'reports-to' },
    { id: 'e3', source: 'hq', target: 'hr', connectionType: 'reports-to' },
    { id: 'e4', source: 'eng', target: 'frontend', connectionType: 'reports-to' },
    { id: 'e5', source: 'eng', target: 'backend', connectionType: 'reports-to' },
    { id: 'e6', source: 'eng', target: 'devops', connectionType: 'reports-to' },
];

function App4() {
    const [nodes, setNodes] = useState<NodeProps[]>(initialNodes);
    const [edges, setEdges] = useState<EdgeProps[]>(initialEdges);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    /* ── Node Changes (drag, select — ignore dimensions to prevent infinite loop) ── */
    const handleNodesChange = useCallback((changes: NodeChange[]) => {
        const relevant = changes.filter((c) => c.type !== 'dimensions');
        if (relevant.length === 0) return;

        setNodes((prev) => {
            let next = [...prev];
            for (const change of relevant) {
                if (change.type === 'position' && change.position && !change.dragging) {
                    // Only commit final position when drag ends (dragging=false)
                    // This prevents blinking from re-renders during drag
                    next = next.map((n) =>
                        n.id === change.id
                            ? { ...n, position: change.position }
                            : n
                    );
                } else if (change.type === 'select') {
                    next = next.map((n) =>
                        n.id === change.id ? { ...n, selected: change.selected } : n
                    );
                }
            }
            return next;
        });
        console.log('Nodes changed:', relevant);
    }, []);

    /* ── Edge Changes (select, remove) ────────────────────── */
    const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
        console.log('Edges changed:', changes);
    }, []);

    /* ── CRUD ─────────────────────────────────────────────── */
    const handleNodeAdd = useCallback((parentId: string) => {
        const newId = `org-${Date.now()}`;
        const newNode: NodeProps = {
            id: newId,
            label: 'New Organization',
            description: 'Added via parent',
        };
        const newEdge: EdgeProps = {
            id: `e-${Date.now()}`,
            source: parentId,
            target: newId,
            connectionType: 'reports-to',
        };

        setNodes((prev) => [...prev, newNode]);
        setEdges((prev) => [...prev, newEdge]);
        console.log(`Node added with parent ${parentId}`);
    }, []);

    const handleNodeEdit = useCallback((nodeId: string) => {
        setNodes((prev) =>
            prev.map((n) =>
                n.id === nodeId ? { ...n, label: `${n.label} (Edited)` } : n
            )
        );
        console.log(`Node ${nodeId} edited`);
    }, []);

    const handleNodeDelete = useCallback((nodeId: string) => {
        setNodes((prev) => prev.filter((n) => n.id !== nodeId));
        setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
        setSelectedNodeId(null);
        console.log(`Node ${nodeId} deleted`);
    }, []);

    /* ── Selection ────────────────────────────────────────── */
    const handleNodeSelect = useCallback((nodeId: string | null) => {
        setSelectedNodeId(nodeId);
        console.log('Node selected:', nodeId);
    }, []);

    return (
        <OrgNetworkFlow
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            onNodeAdd={handleNodeAdd}
            onNodeEdit={handleNodeEdit}
            onNodeDelete={handleNodeDelete}
            onNodeSelect={handleNodeSelect}
            onEdgeSelect={(edgeId) => console.log('Edge selected:', edgeId)}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={(connection) => console.log('Connected:', connection)}
            onReconnect={(connection) => console.log('Reconnected:', connection)}
            onPaneClick={() => console.log('Pane clicked')}
            onEdgeAdd={(edgeId) => console.log('Edge added:', edgeId)}
            onEdgeEdit={(edgeId) => console.log('Edge edited:', edgeId)}
            onEdgeDelete={(edgeId) => console.log('Edge deleted:', edgeId)}
            primaryColor="#1976d2"
        />
    );
}

export default App4;
