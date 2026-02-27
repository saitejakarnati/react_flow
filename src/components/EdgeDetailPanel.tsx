import { useState } from 'react';

import type { Node, Edge } from '@xyflow/react';
import './DetailPanel.css';
import type { OrgNodeProps } from './OrgNode';
import { CONNECTION_TYPES } from '../App3';

interface EdgeDetailPanelProps {
    edge: Edge;
    allNodes: Node<OrgNodeProps>[];
    onClose: () => void;
    onDelete?: (edgeId: string) => void;
    onTypeChange?: (edgeId: string, newType: string) => void;
    readOnly?: boolean;
}

const typeEntries = Object.entries(CONNECTION_TYPES) as [ConnectionType, (typeof CONNECTION_TYPES)[ConnectionType]][];

export default function EdgeDetailPanel({
    edge,
    allNodes,
    onClose,
    onDelete,
    onTypeChange,
    readOnly = false,
}: EdgeDetailPanelProps) {
    const sourceNode = allNodes.find((n) => n.id === edge.source);
    const targetNode = allNodes.find((n) => n.id === edge.target);
    const sourceData = sourceNode?.data as OrgNodeProps | undefined;
    const targetData = targetNode?.data as OrgNodeProps | undefined;
    const currentType = ((edge.data as Record<string, unknown>)?.connectionType as string) ?? 'reports-to';
    const currentStyle = CONNECTION_TYPES[currentType];

    const [showTypeDropdown, setShowTypeDropdown] = useState(false);

    const handleTypeChange = (newType: string) => {
        onTypeChange?.(edge.id, newType);
        setShowTypeDropdown(false);
    };

    return (
        <div className="orgnet-detail-panel">
            <div className="orgnet-detail-panel__header">
                <h3>Connection Details</h3>
                <button className="orgnet-detail-panel__close" onClick={onClose} title="Close">
                    ✕
                </button>
            </div>

            <div className="orgnet-detail-panel__body">
                {/* Connection visual */}
                <div className="orgnet-edge-detail__visual">
                    <div className="orgnet-edge-detail__node-card">
                        <div className="orgnet-detail-panel__related-icon">
                            {sourceData?.label?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div className="orgnet-edge-detail__node-info">
                            <div className="orgnet-edge-detail__node-name">
                                {sourceData?.label ?? edge.source}
                            </div>
                            {sourceData?.description && (
                                <div className="orgnet-edge-detail__node-desc">
                                    {sourceData.description}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="orgnet-edge-detail__arrow">
                        <div
                            className="orgnet-edge-detail__arrow-line"
                            style={{ background: currentStyle.color }}
                        />
                        <div
                            className="orgnet-edge-detail__arrow-label"
                            style={{
                                color: currentStyle.color,
                                background: `${currentStyle.color}14`,
                            }}
                        >
                            {currentStyle.icon} {currentStyle.label}
                        </div>
                        <div
                            className="orgnet-edge-detail__arrow-head"
                            style={{ color: currentStyle.color }}
                        >
                            ▼
                        </div>
                    </div>

                    <div className="orgnet-edge-detail__node-card">
                        <div className="orgnet-detail-panel__related-icon">
                            {targetData?.label?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div className="orgnet-edge-detail__node-info">
                            <div className="orgnet-edge-detail__node-name">
                                {targetData?.label ?? edge.target}
                            </div>
                            {targetData?.description && (
                                <div className="orgnet-edge-detail__node-desc">
                                    {targetData.description}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Connection type badge + changer */}
                <div className="orgnet-edge-detail__type-section">
                    <div className="orgnet-detail-panel__section-title">Connection Type</div>
                    <div className="orgnet-edge-detail__type-badge-row">
                        <span
                            className="orgnet-edge-detail__type-badge"
                            style={{
                                background: `${currentStyle.color}18`,
                                color: currentStyle.color,
                                borderColor: `${currentStyle.color}40`,
                            }}
                        >
                            <span
                                className="orgnet-edge-detail__type-dot"
                                style={{ background: currentStyle.color }}
                            />
                            {currentStyle.icon} {currentStyle.label}
                        </span>
                        {!readOnly && onTypeChange && (
                            <button
                                className="orgnet-edge-detail__change-btn"
                                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                            >
                                Change
                            </button>
                        )}
                    </div>

                    {showTypeDropdown && (
                        <div className="orgnet-edge-detail__type-dropdown">
                            {typeEntries.map(([key, style]) => (
                                <button
                                    key={key}
                                    className={`orgnet-edge-detail__type-option ${key === currentType ? 'orgnet-edge-detail__type-option--active' : ''}`}
                                    onClick={() => handleTypeChange(key)}
                                    disabled={key === currentType}
                                >
                                    <span
                                        className="orgnet-edge-detail__type-dot"
                                        style={{ background: style.color }}
                                    />
                                    <span className="orgnet-edge-detail__type-option-icon">{style.icon}</span>
                                    {style.label}
                                    {key === currentType && <span className="orgnet-edge-detail__type-check">✓</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Connection metadata */}
                <div className="orgnet-detail-panel__stats">
                    <div className="orgnet-detail-panel__stat">
                        <span className="orgnet-detail-panel__stat-label">Edge ID</span>
                        <span className="orgnet-detail-panel__stat-value orgnet-detail-panel__stat-value--mono">
                            {edge.id}
                        </span>
                    </div>
                    <div className="orgnet-detail-panel__stat">
                        <span className="orgnet-detail-panel__stat-label">Source</span>
                        <span className="orgnet-detail-panel__stat-value orgnet-detail-panel__stat-value--mono">
                            {edge.source}
                        </span>
                    </div>
                    <div className="orgnet-detail-panel__stat">
                        <span className="orgnet-detail-panel__stat-label">Target</span>
                        <span className="orgnet-detail-panel__stat-value orgnet-detail-panel__stat-value--mono">
                            {edge.target}
                        </span>
                    </div>
                </div>
            </div>

            {!readOnly && onDelete && (
                <div className="orgnet-detail-panel__actions">
                    <button
                        className="orgnet-detail-panel__action-btn orgnet-detail-panel__action-btn--danger"
                        onClick={() => onDelete(edge.id)}
                    >
                        ✕ Remove Connection
                    </button>
                </div>
            )}
        </div>
    );
}
