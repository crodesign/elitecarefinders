'use client';

import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { ChevronDown } from 'lucide-react';
import { LogoIcon } from '@/components/icons/Logo';
import { DatePicker } from './DatePicker';

interface TourModalProps {
    entityName: string;
    entityType: 'home' | 'facility';
    onClose: () => void;
}

const fieldBase = 'w-full bg-gray-100 rounded-lg py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#239ddb]';

function TimeSelect({ value, onChange, options, className = '' }: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const label = options.find(o => o.value === value)?.label ?? value;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div ref={ref} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between gap-1.5 bg-gray-100 rounded-lg px-3 py-[9px] text-sm text-gray-900 focus:outline-none transition-all ${open ? 'ring-2 ring-[#239ddb]' : ''}`}
            >
                <span className="whitespace-nowrap">{label}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-1.5 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-[300] overflow-hidden min-w-full">
                    <div className="max-h-52 overflow-y-auto py-1">
                        {options.map(o => (
                            <button
                                key={o.value}
                                type="button"
                                onClick={() => { onChange(o.value); setOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-sm transition-colors ${o.value === value ? 'bg-[#239ddb] text-white font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const HOURS = [
    { value: '9', label: '9:00 AM' },
    { value: '10', label: '10:00 AM' },
    { value: '11', label: '11:00 AM' },
    { value: '12', label: '12:00 PM' },
    { value: '13', label: '1:00 PM' },
    { value: '14', label: '2:00 PM' },
    { value: '15', label: '3:00 PM' },
    { value: '16', label: '4:00 PM' },
    { value: '17', label: '5:00 PM' },
    { value: '18', label: '6:00 PM' },
];

const MINUTES = [
    { value: '00', label: ':00' },
    { value: '15', label: ':15' },
    { value: '30', label: ':30' },
    { value: '45', label: ':45' },
];

export function TourModal({ entityName, entityType, onClose }: TourModalProps) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [date, setDate] = useState('');
    const [hour, setHour] = useState('9');
    const [minute, setMinute] = useState('00');
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
            const res = await fetch('/api/contact/tour', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, email, phone, entityName, entityType, date, hour, minute }),
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
                    <span className="font-bold tracking-widest uppercase text-sm leading-tight">Schedule a Tour</span>
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
                            <p className="text-sm text-gray-500 max-w-xs">Thank you — a member of our team will be in touch with you to confirm your tour.</p>
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
                                Scheduling a tour of: <span className="font-semibold text-gray-600">{entityName}</span>
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

                            {/* Date + Time — all in one row */}
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1.5">Preferred Time of Tour</p>
                                <div className="flex gap-2">
                                    <DatePicker
                                        value={date}
                                        onChange={setDate}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                    <TimeSelect value={hour} onChange={setHour} options={HOURS} className="min-w-[130px]" />
                                    <TimeSelect value={minute} onChange={setMinute} options={MINUTES} className="min-w-[65px]" />
                                </div>
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
