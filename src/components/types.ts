// ─── Shared Types for OrgNetwork Widget ─────────────────────

// ─── Connection Types ───────────────────────────────────────
/** Available connection types between nodes */
export type ConnectionType = 'reports-to' | 'collaborates' | 'funds' | 'advises';

/** Visual style definition for a connection type */
export interface ConnectionTypeStyle {
    label: string;
    color: string;
    strokeDasharray?: string;
    animated: boolean;
    icon: string;
    /** React Flow edge type: 'default' (bezier), 'straight', 'step', 'smoothstep' */
    edgeType: 'default' | 'straight' | 'step' | 'smoothstep';
}

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
        edgeType: 'default',       // bezier curve
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

/** Data attached to each org node */
export interface OrgNode {
    label: string;
    description?: string;
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
    type?: string
}

/** Simplified edge input for consumers */
export interface EdgeInput {
    id: string
    source: string;
    target: string;
    connectionType?: ConnectionType;
}

/** Props accepted by the OrgNetworkFlow React component */
export interface OrgNetworkFlowProps {
    /** Array of organisation nodes to display */
    initialNodes?: NodeInput[];
    /** Array of edges (parent → child relationships) */
    initialEdges?: EdgeInput[];
    /** Layout direction: top-to-bottom or left-to-right */
    direction?: 'TB' | 'LR';
    /** If true, hides add / edit / delete buttons */
    readOnly?: boolean;
    /** Primary accent colour (CSS colour string). Default: #1976d2 */
    primaryColor?: string;
    /** Fired after a child node is added */
    onNodeAdd?: (parentId: string, name: string, description: string) => void;
    /** Fired after a node is edited */
    onNodeEdit?: (nodeId: string, name: string, description: string) => void;
    /** Fired after a node (and its descendants) are deleted */
    onNodeDelete?: (nodeId: string) => void;
    /** Fired when a node is selected or deselected (null) */
    onNodeSelect?: (nodeId: string | null) => void;
    onEdgeSelect?: (edgeId: string | null) => void;
    /** Fired when a new edge is connected via drag */
    onEdgeConnect?: (source: string, target: string, type: ConnectionType) => void;
    /** Fired when an edge's connection type is changed */
    onEdgeTypeChange?: (edgeId: string, newType: ConnectionType) => void;
    /**
     * Fired after ANY mutation (add / edit / delete node, connect / disconnect edge).
     * Receives the full current graph state as simplified NodeInput[] and EdgeInput[],
     * making it easy to persist or sync with an external store.
     */
    onChange?: (nodes: NodeInput[], edges: EdgeInput[]) => void;
    nodeTypes?: string[]

}
