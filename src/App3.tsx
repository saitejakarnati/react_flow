import { useState, useCallback } from 'react';
import OrgNetworkFlow from './components/orgNetworkWidget';
import type { NodeInput, EdgeInput } from './components/types';
import './index.css';

// ─── Initial Demo Data ──────────────────────────────────────
const initialNodes: NodeInput[] = [
    { id: 'hq', label: 'Headquarters', description: 'Global HQ', memberCount: 150 },
    { id: 'eng', label: 'Engineering', description: 'Product & Platform', memberCount: 65 },
    { id: 'sales', label: 'Sales', description: 'Revenue & Growth', memberCount: 40 },
    { id: 'hr', label: 'Human Resources', description: 'People & Culture', memberCount: 12 },
    { id: 'frontend', label: 'Frontend Team', description: 'Web & Mobile UI', memberCount: 20 },
    { id: 'backend', label: 'Backend Team', description: 'APIs & Services', memberCount: 25 },
    { id: 'devops', label: 'DevOps', description: 'Infrastructure & CI/CD', memberCount: 10 },
];

const initialEdges: EdgeInput[] = [
    { source: 'hq', target: 'eng', connectionType: 'reports-to' },
    { source: 'hq', target: 'sales', connectionType: 'reports-to' },
    { source: 'hq', target: 'hr', connectionType: 'reports-to' },
    { source: 'eng', target: 'frontend', connectionType: 'reports-to' },
    { source: 'eng', target: 'backend', connectionType: 'reports-to' },
    { source: 'eng', target: 'devops', connectionType: 'reports-to' },
];

function App3() {
    const [nodes, setNodes] = useState<NodeInput[]>(initialNodes);
    const [edges, setEdges] = useState<EdgeInput[]>(initialEdges);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    const handleGraphChange = useCallback((newNodes: NodeInput[], newEdges: EdgeInput[]) => {
        setNodes(newNodes);
        setEdges(newEdges);
        console.log('Graph state updated:', { nodes: newNodes, edges: newEdges });
    }, []);

    const handleNodeAdd = useCallback((parentId: string) => {
        const newId = `org-${Date.now()}`;
        const newNode: NodeInput = {
            id: newId,
            label: 'New Organization',
            description: 'Added via parent',
            memberCount: 0,
        };
        const newEdge: EdgeInput = {
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
        console.log(`Node ${nodeId} deleted`);
    }, []);

    return (

        <OrgNetworkFlow
            nodes={nodes}
            edges={edges}
            onChange={handleGraphChange}
            onNodeSelect={setSelectedNodeId}
            onNodeAdd={handleNodeAdd}
            onNodeEdit={handleNodeEdit}
            onNodeDelete={handleNodeDelete}
            primaryColor="#1976d2"
        />

    );
}

export default App3;
