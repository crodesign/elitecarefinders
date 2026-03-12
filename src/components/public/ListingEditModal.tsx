'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faPencil } from '@fortawesome/free-solid-svg-icons';

interface ListingEditModalProps {
    entityId: string;
    entityType: 'home' | 'facility';
    entityTitle: string;
    onClose: () => void;
}

export function ListingEditModal({ entityId, entityType, entityTitle, onClose }: ListingEditModalProps) {
    const [description, setDescription] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
    }, [onClose]);

    // Load current values
    useEffect(() => {
        fetch(`/api/profile/listing/${entityId}`)
            .then(r => r.json())
            .then(d => {
                setDescription(d.description ?? '');
                setPhone(d.phone ?? '');
                setEmail(d.email ?? '');
                setStatus('idle');
            })
            .catch(() => setStatus('idle'));
    }, [entityId, entityType]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('saving');
        setErrorMsg('');
        try {
            const res = await fetch(`/api/profile/listing/${entityId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description, phone, email }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error ?? 'Failed to save');
            }
            setStatus('saved');
            setTimeout(() => setStatus('idle'), 2500);
        } catch (err: any) {
            setErrorMsg(err.message);
            setStatus('error');
        }
    };

    const fieldBase = 'w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#239ddb]';

    return (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg modal-fade-in-fast"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#239ddb]/10 flex items-center justify-center">
                            <FontAwesomeIcon icon={faPencil} className="h-3.5 w-3.5 text-[#239ddb]" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#239ddb]">
                                {entityType === 'home' ? 'Care Home' : 'Facility'}
                            </p>
                            <p className="text-sm font-semibold text-gray-900 leading-tight">{entityTitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {status === 'loading' ? (
                        <div className="flex justify-center py-8">
                            <div className="w-6 h-6 border-2 border-[#239ddb] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Description
                                </label>
                                <textarea
                                    rows={5}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className={`${fieldBase} resize-none`}
                                    placeholder="Describe your listing — services, specialties, environment…"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className={fieldBase}
                                    placeholder="(808) 555-1234"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className={fieldBase}
                                    placeholder="contact@example.com"
                                />
                            </div>

                            {status === 'error' && (
                                <p className="text-xs text-red-500">{errorMsg || 'Something went wrong. Please try again.'}</p>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'saving'}
                                className="w-full bg-[#239ddb] text-white text-sm font-bold uppercase tracking-wider py-3 rounded-xl hover:bg-[#1a7fb3] transition-colors disabled:opacity-50"
                            >
                                {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved!' : 'Save Changes'}
                            </button>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
