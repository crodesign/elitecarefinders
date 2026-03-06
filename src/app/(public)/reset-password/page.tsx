'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey, faEye, faEyeSlash, faCheck } from '@fortawesome/free-solid-svg-icons';
import { createClientComponentClient } from '@/lib/supabase';

const fieldBase = 'w-full bg-gray-100 rounded-lg py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#239ddb]';

export default function ResetPasswordPage() {
    const supabase = createClientComponentClient();
    const router = useRouter();

    const [ready, setReady] = useState(false);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState<'idle' | 'saving' | 'done'>('idle');

    // Supabase fires PASSWORD_RECOVERY when the user arrives via the reset link.
    // The session is set automatically from the URL hash by the Supabase client.
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setReady(true);
            }
        });

        // Also handle the case where the session is already set (page reload)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setReady(true);
        });

        return () => subscription.unsubscribe();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) { setError('Passwords do not match.'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        setStatus('saving');
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setStatus('done');
            setTimeout(() => router.push('/profile'), 2000);
        } catch (err: any) {
            setError(err.message ?? 'Failed to update password. Please try again.');
            setStatus('idle');
        }
    };

    return (
        <div className="max-w-[480px] mx-auto px-[15px] py-16">
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.1)] overflow-hidden">
                {/* Header */}
                <div className="h-14 bg-[#239ddb] flex items-center justify-center gap-2">
                    <FontAwesomeIcon icon={faKey} className="h-5 w-5 text-white" />
                    <span className="text-white font-bold tracking-widest uppercase text-sm">Reset Password</span>
                </div>

                <div className="p-6">
                    {status === 'done' ? (
                        <div className="py-8 text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                                <FontAwesomeIcon icon={faCheck} className="h-6 w-6 text-[#239ddb]" />
                            </div>
                            <p className="text-sm font-semibold text-gray-800">Password updated</p>
                            <p className="text-xs text-gray-500">Redirecting you to your profile…</p>
                        </div>
                    ) : !ready ? (
                        <div className="py-8 text-center">
                            <div className="w-8 h-8 border-2 border-[#239ddb] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-sm text-gray-500">Verifying reset link…</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <p className="text-sm text-gray-500 pb-1">Enter your new password below.</p>

                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none" />
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className={`${fieldBase} pl-6 pr-10`}
                                    placeholder="New password"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    tabIndex={-1}
                                >
                                    <FontAwesomeIcon icon={showPw ? faEyeSlash : faEye} className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none" />
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    required
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    className={`${fieldBase} pl-6 pr-3`}
                                    placeholder="Confirm new password"
                                />
                            </div>

                            {error && <p className="text-xs text-red-500">{error}</p>}

                            <button
                                type="submit"
                                disabled={status === 'saving'}
                                className="w-full bg-[#239ddb] text-white text-sm font-bold uppercase tracking-wider py-3 rounded-lg hover:bg-[#1a7fb3] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {status === 'saving' ? 'Saving…' : 'Update Password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
