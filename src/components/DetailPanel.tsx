import type { OrgNodeData } from './types';
import type { Node, Edge } from '@xyflow/react';
import './DetailPanel.css';

interface DetailPanelProps {
    node: Node<OrgNodeData>;
    edges: Edge[];
    allNodes: Node<OrgNodeData>[];
    onClose: () => void;
    onEdit: (nodeId: string) => void;
    onDelete: (nodeId: string) => void;
    onAddChild: (nodeId: string) => void;
    readOnly?: boolean;
}

export default function DetailPanel({
    node,
    edges,
    allNodes,
    onClose,
    onEdit,
    onDelete,
    onAddChild,
    readOnly = false,
}: DetailPanelProps) {
    const data = node.data as OrgNodeData;

    const parentNodes = edges
        .filter((e) => e.target === node.id)
        .map((e) => allNodes.find((n) => n.id === e.source))
        .filter(Boolean) as Node<OrgNodeData>[];

    const childNodes = edges
        .filter((e) => e.source === node.id)
        .map((e) => allNodes.find((n) => n.id === e.target))
        .filter(Boolean) as Node<OrgNodeData>[];

    return (
        <div className="orgnet-detail-panel">
            <div className="orgnet-detail-panel__header">
                <h3>Organization Details</h3>
                <button className="orgnet-detail-panel__close" onClick={onClose} title="Close">
                    ✕
                </button>
            </div>

            <div className="orgnet-detail-panel__body">
                <div className="orgnet-detail-panel__avatar">
                    {data.label.charAt(0).toUpperCase()}
                </div>
                <div className="orgnet-detail-panel__name">{data.label}</div>
                {data.description && (
                    <div className="orgnet-detail-panel__desc">{data.description}</div>
                )}

                <div className="orgnet-detail-panel__stats">
                    {data.memberCount !== undefined && (
                        <div className="orgnet-detail-panel__stat">
                            <span className="orgnet-detail-panel__stat-label">Members</span>
                            <span className="orgnet-detail-panel__stat-value">{data.memberCount}</span>
                        </div>
                    )}
                    <div className="orgnet-detail-panel__stat">
                        <span className="orgnet-detail-panel__stat-label">Children</span>
                        <span className="orgnet-detail-panel__stat-value">{childNodes.length}</span>
                    </div>
                    <div className="orgnet-detail-panel__stat">
                        <span className="orgnet-detail-panel__stat-label">Node ID</span>
                        <span className="orgnet-detail-panel__stat-value orgnet-detail-panel__stat-value--mono">{node.id}</span>
                    </div>
                </div>

                {parentNodes.length > 0 && (
                    <div className="orgnet-detail-panel__section">
                        <div className="orgnet-detail-panel__section-title">Parent</div>
                        {parentNodes.map((p) => (
                            <div key={p.id} className="orgnet-detail-panel__related-node">
                                <span className="orgnet-detail-panel__related-icon">
                                    {(p.data as OrgNodeData).label.charAt(0).toUpperCase()}
                                </span>
                                {(p.data as OrgNodeData).label}
                            </div>
                        ))}
                    </div>
                )}

                {childNodes.length > 0 && (
                    <div className="orgnet-detail-panel__section">
                        <div className="orgnet-detail-panel__section-title">Children</div>
                        {childNodes.map((c) => (
                            <div key={c.id} className="orgnet-detail-panel__related-node">
                                <span className="orgnet-detail-panel__related-icon">
                                    {(c.data as OrgNodeData).label.charAt(0).toUpperCase()}
                                </span>
                                {(c.data as OrgNodeData).label}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {!readOnly && (
                <div className="orgnet-detail-panel__actions">
                    <button className="orgnet-detail-panel__action-btn" onClick={() => onAddChild(node.id)}>
                        ＋ Add Child
                    </button>
                    <button className="orgnet-detail-panel__action-btn" onClick={() => onEdit(node.id)}>
                        ✎ Edit
                    </button>
                    <button className="orgnet-detail-panel__action-btn orgnet-detail-panel__action-btn--danger" onClick={() => onDelete(node.id)}>
                        ✕ Delete
                    </button>
                </div>
            )}
        </div>
    );
}
