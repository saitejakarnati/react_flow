# OrgNetwork Widget

A beautiful and highly interactive organization network widget built with React and React Flow. This widget allows you to visualize and manage organizational structures with ease, support for multiple connection types, and a fully controlled architecture.

## Features

-   **Interactive Graph:** Zoom, pan, and drag nodes to explore the network.
-   **Controlled Component:** Maintain full control over the graph state (nodes and edges) from the parent component.
-   **Custom Node Designs:** Premium-looking nodes with icons, descriptions, and member counts.
-   **Multiple Connection Types:** Support for various relationship types (Reports To, Collaborates, Funds, Advises) with distinct visual styles.
-   **Dynamic Layout:** Automatic layout positioning using Dagre.
-   **CRUD Operations:** Built-in callbacks for adding, editing, and deleting nodes.
-   **Responsive Design:** Adapts to different container sizes.

## Installation

```bash
npm install
```

## Usage

The primary component is `OrgNetworkFlow`, which can be imported and used in your React application.

### Basic Example (Controlled Mode)

```tsx
import { useState, useCallback } from 'react';
import OrgNetworkFlow from './components/orgNetworkWidget';
import type { NodeInput, EdgeInput } from './components/types';

const initialNodes: NodeInput[] = [
    { id: 'hq', label: 'Headquarters', description: 'Global HQ', memberCount: 150 },
    { id: 'eng', label: 'Engineering', description: 'Product & Platform', memberCount: 65 },
];

const initialEdges: EdgeInput[] = [
    { source: 'hq', target: 'eng', connectionType: 'reports-to' },
];

function App() {
    const [nodes, setNodes] = useState<NodeInput[]>(initialNodes);
    const [edges, setEdges] = useState<EdgeInput[]>(initialEdges);

    const handleGraphChange = useCallback((newNodes: NodeInput[], newEdges: EdgeInput[]) => {
        setNodes(newNodes);
        setEdges(newEdges);
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <OrgNetworkFlow
                nodes={nodes}
                edges={edges}
                onChange={handleGraphChange}
            />
        </div>
    );
}

export default App;
```

## API Reference

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `nodes` | `NodeInput[]` | `[]` | Array of nodes to display. |
| `edges` | `EdgeInput[]` | `[]` | Array of edges (relationships). |
| `direction` | `'TB' \| 'LR'` | `'TB'` | Layout direction: Top-to-Bottom or Left-to-Right. |
| `readOnly` | `boolean` | `false` | If true, disables editing and dragging. |
| `primaryColor` | `string` | `'#1976d2'` | Primary color for node icons and accents. |
| `onChange` | `(nodes, edges) => void` | `-` | Fired when nodes or edges are added, move, or deleted. |
| `onNodeSelect` | `(id) => void` | `-` | Fired when a node is selected. |
| `onNodeAdd` | `(parentId) => void` | `-` | Callback to handle adding a child node. |
| `onNodeEdit` | `(nodeId) => void` | `-` | Callback to handle editing a node. |
| `onNodeDelete` | `(nodeId) => void` | `-` | Callback to handle deleting a node. |

### Types

#### `NodeInput`
```typescript
{
    id: string;
    label: string;
    description?: string;
    memberCount?: number;
}
```

#### `EdgeInput`
```typescript
{
    source: string;
    target: string;
    connectionType?: 'reports-to' | 'collaborates' | 'funds' | 'advises';
}
```

## Styling

The widget uses standard CSS for styling. You can customize the look and feel by overriding the `orgnet-` prefixed classes in your own stylesheets.

## Development

To start the development server:

```bash
npm run dev
```

To build for production:

```bash
npm run build
```

## Technologies Used

-   React
-   React Flow (@xyflow/react)
-   Dagre (for layout)
-   MUI (for icons and basic components)
-   Vanilla CSS
