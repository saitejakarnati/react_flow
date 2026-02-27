import OrgNetworkFlow from './components/OrgNetworkFlow';
import type { NodeInput, EdgeInput } from './components/types';
import './index.css';

// ─── Demo data for development ──────────────────────────────
const demoNodes: NodeInput[] = [
  { id: 'hq', label: 'Headquarters', description: 'Global HQ' },
  { id: 'eng', label: 'Engineering', description: 'Product & Platform' },
  { id: 'sales', label: 'Sales', description: 'Revenue & Growth' },
  { id: 'hr', label: 'Human Resources', description: 'People & Culture' },
  { id: 'frontend', label: 'Frontend Team', description: 'Web & Mobile UI' },
  { id: 'backend', label: 'Backend Team', description: 'APIs & Services' },
  { id: 'devops', label: 'DevOps', description: 'Infrastructure & CI/CD' },
  { id: 'finance', label: 'Finance', description: 'Budgets & Accounting' },
];

const demoEdges: EdgeInput[] = [
  // Hierarchical (reports-to)
  { source: 'hq', target: 'eng', connectionType: 'reports-to' },
  { source: 'hq', target: 'sales', connectionType: 'reports-to' },
  { source: 'hq', target: 'hr', connectionType: 'reports-to' },
  { source: 'hq', target: 'finance', connectionType: 'reports-to' },
  { source: 'eng', target: 'frontend', connectionType: 'reports-to' },
  { source: 'eng', target: 'backend', connectionType: 'reports-to' },
  { source: 'eng', target: 'devops', connectionType: 'reports-to' },
  // Cross-functional
  { source: 'frontend', target: 'backend', connectionType: 'collaborates' },
  { source: 'sales', target: 'eng', connectionType: 'collaborates' },
  // Funding
  { source: 'finance', target: 'eng', connectionType: 'funds' },
  // Advisory
  { source: 'hr', target: 'eng', connectionType: 'advises' },
];

function App() {
  return (
    <OrgNetworkFlow
      initialNodes={demoNodes}
      initialEdges={demoEdges}
      direction="TB"
      primaryColor="#1976d2"
      onNodeAdd={(parentId, name, desc) =>
        console.log('Node added:', { parentId, name, desc })
      }
      onNodeEdit={(nodeId, name, desc) =>
        console.log('Node edited:', { nodeId, name, desc })
      }
      onNodeDelete={(nodeId) =>
        console.log('Node deleted:', nodeId)
      }
      onNodeSelect={(nodeId) =>
        console.log('Node selected:', nodeId)
      }
      onEdgeConnect={(source, target, type) =>
        console.log('Edge connected:', { source, target, type })
      }
      onEdgeTypeChange={(edgeId, newType) =>
        console.log('Edge type changed:', { edgeId, newType })
      }
      onChange={(nodes, edges) =>
        console.log('Graph changed:', { nodes, edges })
      }
    />
  );
}

export default App;
