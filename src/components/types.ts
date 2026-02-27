// ─── Shared Types for OrgNetwork Widget ─────────────────────

import type { NodeProps } from "@xyflow/react";
import type { OrgNodeType } from "./OrgNode";

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

/** Simplified node input for consumers (no nulls) */
export interface NodeInput {
    id: string;
    label: string;
    position: { x: number; y: number };
    description?: string;
    type?: string;
}

/** Simplified edge input for consumers (no nulls) */
export interface EdgeInput {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    connectionType?: string;
    label?: string;
    type?: string;
}

/** Props accepted by the OrgNetworkFlow React component */
export interface OrgNetworkFlowProps {
    nodes: NodeInput[];
    edges: EdgeInput[];
    selectedNodeId?: string;
    selectedEdgeId?: string;
    direction?: 'TB' | 'LR';
    readOnly?: boolean;
    primaryColor?: string;

    onNodeSelect?: (nodeId: string) => void;
    onEdgeSelect?: (edgeId: string) => void;
    onNodeAdd?: (parentId: string) => void;
    onNodeEdit?: (nodeId: string) => void;
    onNodeDelete?: (nodeId: string) => void;

    onEdgeAdd?: (edge: { source: string; target: string; sourceHandle?: string; targetHandle?: string }) => void;
    onEdgeEdit?: (edgeId: string, edge: { source: string; target: string; sourceHandle?: string; targetHandle?: string }) => void;
    onEdgeDelete?: (edgeId: string) => void;
    onEdgeTypeChange?: (edgeId: string, newType: string) => void;

    onNodesLayoutChange?: (changes: any[]) => void; // Using any for React Flow Change types to keep it simple but can be refined
    onEdgesChange?: (changes: any[]) => void;
    nodeTypes?: Record<string, React.FC<NodeProps<OrgNodeType<string>>>>;
    edgeTypes?: Record<string, ConnectionTypeStyle>;
    onPaneClick?: () => void;
}
