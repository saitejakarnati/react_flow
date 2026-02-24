import { useState, useRef, useEffect } from 'react';

interface AddOrgModalProps {
    mode: 'add' | 'edit';
    parentName?: string;
    initialName?: string;
    initialDescription?: string;
    onConfirm: (name: string, description: string) => void;
    onCancel: () => void;
}

export default function AddOrgModal({
    mode,
    parentName,
    initialName = '',
    initialDescription = '',
    onConfirm,
    onCancel,
}: AddOrgModalProps) {
    const [name, setName] = useState(initialName);
    const [description, setDescription] = useState(initialDescription);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onConfirm(name.trim(), description.trim());
        }
    };

    const isEdit = mode === 'edit';

    return (
        <div className="orgnet-modal-overlay" onClick={onCancel}>
            <div className="orgnet-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="orgnet-modal-header">
                    <h3>{isEdit ? 'Edit Organization' : 'Add Child Organization'}</h3>
                    {!isEdit && parentName && (
                        <p className="orgnet-modal-subtitle">
                            Under <span className="orgnet-modal-parent-name">{parentName}</span>
                        </p>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="orgnet-modal-form">
                    <div className="orgnet-modal-field">
                        <label htmlFor="org-name">Organization Name *</label>
                        <input
                            ref={inputRef}
                            id="org-name"
                            type="text"
                            placeholder="Enter org name..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="orgnet-modal-field">
                        <label htmlFor="org-desc">Description</label>
                        <input
                            id="org-desc"
                            type="text"
                            placeholder="Brief description (optional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="orgnet-modal-actions">
                        <button type="button" className="orgnet-modal-btn orgnet-modal-btn--cancel" onClick={onCancel}>
                            Cancel
                        </button>
                        <button type="submit" className="orgnet-modal-btn orgnet-modal-btn--confirm" disabled={!name.trim()}>
                            {isEdit ? 'Save' : '＋ Add Org'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
