import { useState, useCallback } from 'react';
import OrgNetworkFlow from './components/OrgNetworkflow2';
import type { NodeInput, EdgeInput } from './components/types';
import './index.css';

// ─── Initial Demo Data ──────────────────────────────────────
const INITIAL_NODES: NodeInput[] = [
    { id: 'hq', label: 'Headquarters', description: 'Global HQ', memberCount: 150 },
    { id: 'eng', label: 'Engineering', description: 'Product & Platform', memberCount: 65 },
    { id: 'sales', label: 'Sales', description: 'Revenue & Growth', memberCount: 40 },
    { id: 'hr', label: 'Human Resources', description: 'People & Culture', memberCount: 12 },
    { id: 'frontend', label: 'Frontend Team', description: 'Web & Mobile UI', memberCount: 20 },
    { id: 'backend', label: 'Backend Team', description: 'APIs & Services', memberCount: 25 },
    { id: 'devops', label: 'DevOps', description: 'Infrastructure & CI/CD', memberCount: 10 },
    { id: 'finance', label: 'Finance', description: 'Budgets & Accounting', memberCount: 8 },
];

const INITIAL_EDGES: EdgeInput[] = [
    { source: 'hq', target: 'eng', connectionType: 'reports-to' },
    { source: 'hq', target: 'sales', connectionType: 'reports-to' },
    { source: 'hq', target: 'hr', connectionType: 'reports-to' },
    { source: 'hq', target: 'finance', connectionType: 'reports-to' },
    { source: 'eng', target: 'frontend', connectionType: 'reports-to' },
    { source: 'eng', target: 'backend', connectionType: 'reports-to' },
    { source: 'eng', target: 'devops', connectionType: 'reports-to' },
    { source: 'frontend', target: 'backend', connectionType: 'collaborates' },
    { source: 'sales', target: 'eng', connectionType: 'collaborates' },
    { source: 'finance', target: 'eng', connectionType: 'funds' },
    { source: 'hr', target: 'eng', connectionType: 'advises' },
];

function App2() {
    const [nodes, setNodes] = useState<NodeInput[]>(INITIAL_NODES);
    const [edges, setEdges] = useState<EdgeInput[]>(INITIAL_EDGES);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

    const handleNodeAdd = useCallback((parentId: string, name: string, description: string) => {
        const newId = `node-${Date.now()}`;
        const newNode: NodeInput = { id: newId, label: name, description, memberCount: 0 };
        const newEdge: EdgeInput = { source: parentId, target: newId, connectionType: 'reports-to' };

        setNodes(prev => [...prev, newNode]);
        setEdges(prev => [...prev, newEdge]);
        console.log('Node added:', newNode);
    }, []);

    const handleNodeEdit = useCallback((nodeId: string, name: string, description: string) => {
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, label: name, description } : n));
        console.log('Node edited:', nodeId);
    }, []);

    const handleNodeDelete = useCallback((nodeId: string) => {
        if (!window.confirm('Delete this node and all connections?')) return;
        setNodes(prev => prev.filter(n => n.id !== nodeId));
        setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
        setSelectedNodeId(null);
        console.log('Node deleted:', nodeId);
    }, []);

    const handleEdgeConnect = useCallback((source: string, target: string, type: any) => {
        const newEdge: EdgeInput = { source, target, connectionType: type };
        setEdges(prev => [...prev, newEdge]);
        console.log('Edge connected:', newEdge);
    }, []);

    const handleEdgeDelete = useCallback((edgeId: string) => {
        if (!window.confirm('Remove this connection?')) return;
        setEdges(prev => prev.filter(e => {
            const id = `e-${e.source}-${e.target}-${e.connectionType ?? 'reports-to'}`;
            return id !== edgeId;
        }));
        setSelectedEdgeId(null);
    }, []);

    const handleEdgeTypeChange = useCallback((edgeId: string, type: any) => {
        setEdges(prev => prev.map(e => {
            const id = `e-${e.source}-${e.target}-${e.connectionType ?? 'reports-to'}`;
            return id === edgeId ? { ...e, connectionType: type } : e;
        }));
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <OrgNetworkFlow
                nodes={nodes}
                edges={edges}
                // selectedNodeId={selectedNodeId}
                // selectedEdgeId={selectedEdgeId}
                onNodeSelect={setSelectedNodeId}
                onEdgeSelect={setSelectedEdgeId}
                onNodeAdd={handleNodeAdd}
                onNodeEdit={handleNodeEdit}
                onNodeDelete={handleNodeDelete}
                onEdgeConnect={handleEdgeConnect}
                onEdgeDelete={handleEdgeDelete}
                onEdgeTypeChange={handleEdgeTypeChange}
                onChange={(n, e) => {
                    console.log('Structural change:', { nodes: n, edges: e });
                }}
            />
        </div>
    );
}

export default App2;
