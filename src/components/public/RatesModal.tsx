'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { LogoIcon } from '@/components/icons/Logo';

interface RatesModalProps {
    entityName: string;
    entityType: 'home' | 'facility';
    onClose: () => void;
}

const fieldBase = 'w-full bg-gray-100 rounded-lg py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#239ddb]';

function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function RatesModal({ entityName, entityType, onClose }: RatesModalProps) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('submitting');
        try {
            const res = await fetch('/api/contact/rates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, email, phone, entityName, entityType }),
            });
            if (!res.ok) throw new Error();
            setStatus('success');
        } catch {
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-white/50 backdrop-blur-md flex flex-col pt-14" onClick={onClose}>
            {/* Top bar */}
            <div className="absolute top-0 inset-x-0 h-14 bg-[#239ddb] flex items-center justify-center px-4 shadow-md z-10" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col items-center text-white">
                    <span className="text-[10px] italic font-medium opacity-80">Private Pay Options</span>
                    <span className="font-bold tracking-widest uppercase text-sm leading-tight">Get Monthly Rates</span>
                </div>
                <button
                    onClick={onClose}
                    className="absolute right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    aria-label="Close"
                >
                    <FontAwesomeIcon icon={faXmark} className="h-6 w-6" />
                </button>
            </div>

            {/* Scrolling content */}
            <div className="flex-1 overflow-y-auto w-full pb-6">
                <div className="max-w-[480px] mx-5 sm:mx-auto bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.15)] rounded-b-2xl" onClick={e => e.stopPropagation()}>

                    {status === 'success' ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                                <LogoIcon className="h-9 w-9" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Request Sent!</h3>
                            <p className="text-sm text-gray-500 max-w-xs">Thank you — a member of our team will be in touch with you shortly.</p>
                            <button
                                onClick={onClose}
                                className="mt-2 px-6 py-2 bg-[#239ddb] text-white text-sm font-semibold rounded-lg hover:bg-[#1a7fb3] transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <p className="text-xs text-gray-400 pb-1">
                                Requesting rates for: <span className="font-semibold text-gray-600">{entityName}</span>
                            </p>

                            {/* Full Name — required */}
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none" />
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    className={`${fieldBase} pl-6 pr-3`}
                                    placeholder="Full name"
                                />
                            </div>

                            {/* Email — required */}
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className={`${fieldBase} pl-6 pr-3`}
                                    placeholder="Email address"
                                />
                            </div>

                            {/* Phone — required */}
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none" />
                                <input
                                    type="tel"
                                    required
                                    value={phone}
                                    onChange={e => setPhone(formatPhone(e.target.value))}
                                    className={`${fieldBase} pl-6 pr-3`}
                                    placeholder="(808) 555-1234"
                                />
                            </div>

                            {status === 'error' && (
                                <p className="text-xs text-red-500">Something went wrong. Please try again or contact us directly.</p>
                            )}

                            <p className="text-xs text-gray-400 leading-relaxed pt-1">
                                By submitting this request, you are agreeing to being contacted by Elite CareFinders.
                            </p>

                            <button
                                type="submit"
                                disabled={status === 'submitting'}
                                className="w-full bg-[#239ddb] text-white text-sm font-bold uppercase tracking-wider py-3 rounded-lg hover:bg-[#1a7fb3] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {status === 'submitting' ? 'Sending…' : 'Send Request'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
