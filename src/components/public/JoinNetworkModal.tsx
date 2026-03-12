'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faNetworkWired } from '@fortawesome/free-solid-svg-icons';
import { LogoIcon } from '@/components/icons/Logo';

interface JoinNetworkModalProps {
    onClose: () => void;
}

const US_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
    'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
    'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
    'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming',
];

const HAWAII_ISLANDS = [
    'Oahu', 'Maui', 'Hawaii Island (Big Island)', 'Kauai', 'Molokai', 'Lanai',
];

const LISTING_TYPES = [
    'Care Home',
    'Adult Foster Home',
    'Assisted Living',
    'Memory Care',
    'Independent Living',
    'Nursing Facility',
    'Adult Day Care',
    'Other',
];

const fieldBase = 'w-full bg-gray-100 rounded-lg py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#239ddb]';

function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#239ddb] mb-2 mt-4 first:mt-0">
            {children}
        </p>
    );
}

export function JoinNetworkModal({ onClose }: JoinNetworkModalProps) {
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [state, setState] = useState('');
    const [island, setIsland] = useState('');
    const [city, setCity] = useState('');
    const [listingName, setListingName] = useState('');
    const [listingType, setListingType] = useState('');
    const [description, setDescription] = useState('');
    const [careProvider, setCareProvider] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

    const isHawaii = state === 'Hawaii';

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    // Reset island/city when state changes
    useEffect(() => {
        setIsland('');
        setCity('');
    }, [state]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('submitting');
        try {
            const res = await fetch('/api/contact/join-network', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName, phone, email,
                    state,
                    location: isHawaii ? island : city,
                    listingName, listingType,
                    description, careProvider,
                }),
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
            <div className="absolute top-0 inset-x-0 h-14 bg-[#191b21] flex items-center justify-center px-4 shadow-md z-10" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 text-white font-bold tracking-widest uppercase text-sm">
                    <FontAwesomeIcon icon={faNetworkWired} className="h-4 w-4 text-[#239ddb]" />
                    Join Our Network
                </div>
                <button
                    onClick={onClose}
                    className="absolute right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    aria-label="Close"
                >
                    <FontAwesomeIcon icon={faXmark} className="h-6 w-6" />
                </button>
            </div>

            {/* Scrolling content */}
            <div className="modal-content-slide-in flex-1 overflow-y-auto w-full pb-6">
                <div className="max-w-[520px] mx-5 sm:mx-auto bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.15)] rounded-b-2xl" onClick={e => e.stopPropagation()}>

                    {status === 'success' ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                                <LogoIcon className="h-9 w-9" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Application Received!</h3>
                            <p className="text-sm text-gray-500 max-w-xs">
                                Thank you for your interest in joining the Elite CareFinders network. We will review your submission and reach out to you shortly.
                            </p>
                            <button
                                onClick={onClose}
                                className="mt-2 px-6 py-2 bg-[#239ddb] text-white text-sm font-semibold rounded-lg hover:bg-[#1a7fb3] transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-3">

                            {/* ── Contact Info ── */}
                            <SectionLabel>Contact Information</SectionLabel>

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

                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none" />
                                <input
                                    type="tel"
                                    required
                                    value={phone}
                                    onChange={e => setPhone(formatPhone(e.target.value))}
                                    className={`${fieldBase} pl-6 pr-3`}
                                    placeholder="Phone number"
                                />
                            </div>

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

                            {/* ── Location ── */}
                            <SectionLabel>Location</SectionLabel>

                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none" />
                                <select
                                    required
                                    value={state}
                                    onChange={e => setState(e.target.value)}
                                    className={`${fieldBase} pl-6 pr-3 appearance-none`}
                                >
                                    <option value="">Select state</option>
                                    {US_STATES.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            {state && isHawaii && (
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none" />
                                    <select
                                        required
                                        value={island}
                                        onChange={e => setIsland(e.target.value)}
                                        className={`${fieldBase} pl-6 pr-3 appearance-none`}
                                    >
                                        <option value="">Select island</option>
                                        {HAWAII_ISLANDS.map(i => (
                                            <option key={i} value={i}>{i}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {state && !isHawaii && (
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        required
                                        value={city}
                                        onChange={e => setCity(e.target.value)}
                                        className={`${fieldBase} pl-6 pr-3`}
                                        placeholder="City"
                                    />
                                </div>
                            )}

                            {/* ── About Your Listing ── */}
                            <SectionLabel>About Your Home / Facility</SectionLabel>

                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none" />
                                <input
                                    type="text"
                                    required
                                    value={listingName}
                                    onChange={e => setListingName(e.target.value)}
                                    className={`${fieldBase} pl-6 pr-3`}
                                    placeholder="Name of your home or facility"
                                />
                            </div>

                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none" />
                                <select
                                    required
                                    value={listingType}
                                    onChange={e => setListingType(e.target.value)}
                                    className={`${fieldBase} pl-6 pr-3 appearance-none`}
                                >
                                    <option value="">Type of listing</option>
                                    {LISTING_TYPES.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative">
                                <span className="absolute left-3 top-3 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none" />
                                <textarea
                                    required
                                    rows={4}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className={`${fieldBase} pl-6 pr-3 resize-none`}
                                    placeholder="Describe your home or facility — location, capacity, amenities, specialties…"
                                />
                            </div>

                            {/* ── Care Provider (optional) ── */}
                            <SectionLabel>About the Care Provider <span className="normal-case font-normal text-gray-400">(optional)</span></SectionLabel>

                            <textarea
                                rows={3}
                                value={careProvider}
                                onChange={e => setCareProvider(e.target.value)}
                                className={`${fieldBase} px-3 resize-none`}
                                placeholder="Tell us about the care provider — qualifications, certifications, experience, specialties…"
                            />

                            {status === 'error' && (
                                <p className="text-xs text-red-500">Something went wrong. Please try again or contact us directly.</p>
                            )}

                            <p className="text-xs text-gray-400 leading-relaxed pt-1">
                                By submitting this form, you agree to be contacted by Elite CareFinders regarding your application to join our directory network.
                            </p>

                            <button
                                type="submit"
                                disabled={status === 'submitting'}
                                className="w-full bg-[#239ddb] text-white text-sm font-bold uppercase tracking-wider py-3 rounded-lg hover:bg-[#1a7fb3] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {status === 'submitting' ? 'Submitting…' : 'Submit Application'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
