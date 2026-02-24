import { useEffect, useRef } from 'react';
import { CONNECTION_TYPES, type ConnectionType } from './types';
import './ConnectionTypeSelector.css';

interface ConnectionTypeSelectorProps {
    /** Viewport position to render near */
    position: { x: number; y: number };
    onSelect: (type: ConnectionType) => void;
    onCancel: () => void;
}

const typeEntries = Object.entries(CONNECTION_TYPES) as [ConnectionType, (typeof CONNECTION_TYPES)[ConnectionType]][];

export default function ConnectionTypeSelector({
    position,
    onSelect,
    onCancel,
}: ConnectionTypeSelectorProps) {
    const ref = useRef<HTMLDivElement>(null);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onCancel]);

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as globalThis.Node)) {
                onCancel();
            }
        };
        // Use a timeout so the current click doesn't immediately close it
        const timer = setTimeout(() => {
            window.addEventListener('mousedown', handler);
        }, 0);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('mousedown', handler);
        };
    }, [onCancel]);

    return (
        <div
            ref={ref}
            className="orgnet-conn-selector"
            style={{ left: position.x, top: position.y }}
        >
            <div className="orgnet-conn-selector__title">Connection Type</div>
            <div className="orgnet-conn-selector__list">
                {typeEntries.map(([key, style]) => (
                    <button
                        key={key}
                        className="orgnet-conn-selector__item"
                        onClick={() => onSelect(key)}
                    >
                        <span
                            className="orgnet-conn-selector__swatch"
                            style={{ background: style.color }}
                        />
                        <span className="orgnet-conn-selector__icon">{style.icon}</span>
                        <span className="orgnet-conn-selector__label">{style.label}</span>
                        {style.animated && (
                            <span className="orgnet-conn-selector__badge">animated</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
