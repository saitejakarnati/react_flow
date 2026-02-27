import type { EdgeChange, NodeChange } from "@xyflow/react";

export interface ChartProps {
    nodes: NodeProps[];
    edges: EdgeProps[];
    readOnly?: boolean;

    onNodeSelect?: (nodeId: string | null) => void;
    onEdgeSelect?: (edgeId: string | null) => void;

    onNodeAdd?: (nodeId: string) => void;
    onNodeEdit?: (nodeId: string) => void;
    onNodeDelete?: (nodeId: string) => void;

    onEdgeAdd?: (edgeId: string) => void;
    onEdgeEdit?: (edgeId: string) => void;
    onEdgeDelete?: (edgeId: string) => void;

    onNodesChange?: (changes: NodeChange[]) => void;
    onEdgesChange?: (changes: EdgeChange[]) => void;
}

export interface NodeProps extends NodeLayoutProps {
    id: string;
    label: string;
    description?: string;
    type: string

}

export interface EdgeProps extends EdgeLayoutProps {
    id: string;
    source: string;
    destination: string;
    connectionType: string;
}
export interface NodeLayoutProps {
    /** Computed position from Dagre layout */
    position?: { x: number; y: number };
    /** Node width used by the layout engine */
    width?: number;
    /** Node height used by the layout engine */
    height?: number;
    /** Whether the node is currently selected */
    selected?: boolean;
    /** Whether the node is currently being dragged */
    dragging?: boolean;
    /** Z-index layer for overlapping control */
    zIndex?: number;
}

export interface EdgeLayoutProps {
    /** Source handle ID (e.g. 'bottom-source', 'right-source') */
    sourceHandle?: string;
    /** Target handle ID (e.g. 'top-target', 'left-target') */
    targetHandle?: string;
    /** Edge routing type */
    type?: 'default' | 'straight' | 'step' | 'smoothstep';
    /** Whether the edge is animated */
    animated?: boolean;
    /** Stroke color */
    strokeColor?: string;
    /** Dash pattern (SVG stroke-dasharray) */
    strokeDasharray?: string;
    /** Whether the edge is currently selected */
    selected?: boolean;
    /** Z-index layer for overlapping control */
    zIndex?: number;
}