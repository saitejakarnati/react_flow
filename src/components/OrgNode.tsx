import { memo, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { OrgNodeData } from './types';

type OrgNodeType = Node<OrgNodeData, 'orgNode'>;

function OrgNode({ id, data }: NodeProps<OrgNodeType>) {
    const [hovered, setHovered] = useState(false);
    const isReadOnly = data.readOnly ?? false;

    return (
        <div
            className={`orgnet-node ${hovered ? 'orgnet-node--hovered' : ''}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onDoubleClick={(e) => {
                if (isReadOnly) return;
                e.stopPropagation();
                data.onEdit?.(id);
            }}
        >
            {/* ─── Connection Handles — all 4 sides ─── */}
            {/* Top */}
            <Handle
                type="target"
                position={Position.Top}
                id="top-target"
                className="orgnet-handle orgnet-handle--top"
            />
            <Handle
                type="source"
                position={Position.Top}
                id="top-source"
                className="orgnet-handle orgnet-handle--top orgnet-handle--source-alt"
            />
            {/* Right */}
            <Handle
                type="source"
                position={Position.Right}
                id="right-source"
                className="orgnet-handle orgnet-handle--right"
            />
            <Handle
                type="target"
                position={Position.Right}
                id="right-target"
                className="orgnet-handle orgnet-handle--right orgnet-handle--target-alt"
            />
            {/* Bottom */}
            <Handle
                type="source"
                position={Position.Bottom}
                id="bottom-source"
                className="orgnet-handle orgnet-handle--bottom"
            />
            <Handle
                type="target"
                position={Position.Bottom}
                id="bottom-target"
                className="orgnet-handle orgnet-handle--bottom orgnet-handle--target-alt"
            />
            {/* Left */}
            <Handle
                type="target"
                position={Position.Left}
                id="left-target"
                className="orgnet-handle orgnet-handle--left"
            />
            <Handle
                type="source"
                position={Position.Left}
                id="left-source"
                className="orgnet-handle orgnet-handle--left orgnet-handle--source-alt"
            />

            <div className="orgnet-node__content">
                <div className="orgnet-node__icon">
                    {data.label.charAt(0).toUpperCase()}
                </div>
                <div className="orgnet-node__info">
                    <div className="orgnet-node__name">{data.label}</div>
                    {data.description && (
                        <div className="orgnet-node__desc">{data.description}</div>
                    )}
                    {data.memberCount !== undefined && (
                        <div className="orgnet-node__members">
                            <span className="orgnet-node__members-icon">👥</span>
                            {data.memberCount} members
                        </div>
                    )}
                </div>
            </div>

            {/* Action buttons on hover — hidden in readOnly mode */}
            {!isReadOnly && (
                <div className={`orgnet-node__actions ${hovered ? 'orgnet-node__actions--visible' : ''}`}>
                    <button
                        className="orgnet-node__action-btn orgnet-node__action-btn--add"
                        onClick={(e) => {
                            e.stopPropagation();
                            data.onAddChild?.(id);
                        }}
                        title="Add child organization"
                    >
                        ＋
                    </button>
                    <button
                        className="orgnet-node__action-btn orgnet-node__action-btn--edit"
                        onClick={(e) => {
                            e.stopPropagation();
                            data.onEdit?.(id);
                        }}
                        title="Edit organization"
                    >
                        ✎
                    </button>
                    <button
                        className="orgnet-node__action-btn orgnet-node__action-btn--delete"
                        onClick={(e) => {
                            e.stopPropagation();
                            data.onDelete?.(id);
                        }}
                        title="Delete organization"
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
}

export default memo(OrgNode);



