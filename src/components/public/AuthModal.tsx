'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faUser, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { createClientComponentClient } from '@/lib/supabase';
import { readFavoritesCookie } from '@/lib/favorites-cookie';

interface AuthModalProps {
    onClose: () => void;
    defaultTab?: 'signin' | 'signup';
}

const fieldBase = 'w-full bg-gray-100 rounded-lg py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#239ddb]';

function validatePassword(pw: string): string | null {
    if (pw.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(pw)) return 'Password must contain at least one uppercase letter.';
    if (!/[a-z]/.test(pw)) return 'Password must contain at least one lowercase letter.';
    if (!/[0-9]/.test(pw)) return 'Password must contain at least one number.';
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must contain at least one special character.';
    return null;
}

function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function AuthModal({ onClose, defaultTab = 'signin' }: AuthModalProps) {
    const supabase = createClientComponentClient();
    const [tab, setTab] = useState<'signin' | 'signup'>(defaultTab);
    const [view, setView] = useState<'main' | 'forgot' | 'forgot-sent'>('main');

    // Sign in state
    const [siEmail, setSiEmail] = useState('');
    const [siPassword, setSiPassword] = useState('');
    const [siShowPw, setSiShowPw] = useState(false);
    const [siError, setSiError] = useState('');
    const [siLoading, setSiLoading] = useState(false);

    // Forgot password state
    const [fpEmail, setFpEmail] = useState('');
    const [fpError, setFpError] = useState('');
    const [fpLoading, setFpLoading] = useState(false);

    // Sign up state
    const [suEmail, setSuEmail] = useState('');
    const [suPassword, setSuPassword] = useState('');
    const [suConfirm, setSuConfirm] = useState('');
    const [suNickname, setSuNickname] = useState('');
    const [suPhone, setSuPhone] = useState('');
    const [suShowPw, setSuShowPw] = useState(false);
    const [suShowConfirm, setSuShowConfirm] = useState(false);
    const [suError, setSuError] = useState('');
    const [suLoading, setSuLoading] = useState(false);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setFpError('');
        setFpLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(fpEmail, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            setView('forgot-sent');
        } catch (err: any) {
            setFpError(err.message ?? 'Failed to send reset email. Please try again.');
        } finally {
            setFpLoading(false);
        }
    };

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setSiError('');
        setSiLoading(true);
        try {
            let email = siEmail.trim();
            // Nickname login: if no @ symbol, look up the email
            if (!email.includes('@')) {
                const res = await fetch('/api/public/auth/lookup-nickname', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nickname: email }),
                });
                if (!res.ok) throw new Error('No account found with that nickname.');
                const data = await res.json();
                email = data.email;
            }
            const { error } = await supabase.auth.signInWithPassword({ email, password: siPassword });
            if (error) throw error;
            onClose();
        } catch (err: any) {
            setSiError(err.message ?? 'Sign in failed. Please try again.');
        } finally {
            setSiLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuError('');
        if (suPassword !== suConfirm) {
            setSuError('Passwords do not match.');
            return;
        }
        const pwValidation = validatePassword(suPassword);
        if (pwValidation) {
            setSuError(pwValidation);
            return;
        }
        setSuLoading(true);
        try {
            const cookieFavorites = readFavoritesCookie();
            const res = await fetch('/api/public/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: suEmail,
                    password: suPassword,
                    nickname: suNickname || undefined,
                    phone: suPhone || undefined,
                    favorites: cookieFavorites,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Registration failed.');

            // Set the session from the registration response
            if (data.session) {
                await supabase.auth.setSession(data.session);
            }
            onClose();
        } catch (err: any) {
            setSuError(err.message ?? 'Registration failed. Please try again.');
        } finally {
            setSuLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-white/50 backdrop-blur-md flex flex-col pt-14" onClick={onClose}>
            {/* Top bar */}
            <div className="absolute top-0 inset-x-0 h-14 bg-[#239ddb] flex items-center justify-center px-4 shadow-md z-10" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 text-white font-bold tracking-widest uppercase text-sm">
                    <FontAwesomeIcon icon={faUser} className="h-5 w-5" />
                    {view === 'forgot' || view === 'forgot-sent' ? 'Reset Password' : tab === 'signin' ? 'Sign In' : 'Create Account'}
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
            <div className="modal-content-slide-in flex-1 overflow-y-auto w-full pb-6">
                <div className="max-w-[480px] mx-5 sm:mx-auto bg-white shadow-[0_8px_30px_rgba(0,0,0,0.15)] rounded-b-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                    {/* Tabs — hidden when in forgot password view */}
                    {view === 'main' && (
                        <div className="flex border-b border-gray-100">
                            <button
                                type="button"
                                onClick={() => setTab('signin')}
                                className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === 'signin' ? 'text-[#239ddb] border-b-2 border-[#239ddb]' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab('signup')}
                                className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === 'signup' ? 'text-[#239ddb] border-b-2 border-[#239ddb]' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Create Account
                            </button>
                        </div>
                    )}

                    <div className="p-6">
                        {/* Forgot password — email entry */}
                        {view === 'forgot' && (
                            <form onSubmit={handleForgotPassword} className="space-y-3">
                                <p className="text-sm text-gray-500 pb-1">Enter your email and we&apos;ll send you a link to reset your password.</p>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none" />
                                    <input
                                        type="email"
                                        required
                                        value={fpEmail}
                                        onChange={e => setFpEmail(e.target.value)}
                                        className={`${fieldBase} pl-6 pr-3`}
                                        placeholder="Email address"
                                        autoFocus
                                    />
                                </div>
                                {fpError && <p className="text-xs text-red-500">{fpError}</p>}
                                <button
                                    type="submit"
                                    disabled={fpLoading}
                                    className="w-full bg-[#239ddb] text-white text-sm font-bold uppercase tracking-wider py-3 rounded-lg hover:bg-[#1a7fb3] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {fpLoading ? 'Sending…' : 'Send Reset Link'}
                                </button>
                                <p className="text-xs text-center text-gray-400 pt-1">
                                    <button type="button" onClick={() => setView('main')} className="text-[#239ddb] hover:underline font-medium">
                                        Back to sign in
                                    </button>
                                </p>
                            </form>
                        )}

                        {/* Forgot password — sent confirmation */}
                        {view === 'forgot-sent' && (
                            <div className="py-8 text-center space-y-3">
                                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                                    <FontAwesomeIcon icon={faUser} className="h-6 w-6 text-[#239ddb]" />
                                </div>
                                <p className="text-sm font-semibold text-gray-800">Check your email</p>
                                <p className="text-xs text-gray-500">We sent a password reset link to <strong>{fpEmail}</strong>.</p>
                                <button
                                    type="button"
                                    onClick={() => { setView('main'); setFpEmail(''); }}
                                    className="mt-2 text-xs text-[#239ddb] hover:underline font-medium"
                                >
                                    Back to sign in
                                </button>
                            </div>
                        )}

                        {view === 'main' && tab === 'signin' && (
                            <form onSubmit={handleSignIn} className="space-y-3">
                                {/* Email or Nickname */}
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        required
                                        value={siEmail}
                                        onChange={e => setSiEmail(e.target.value)}
                                        className={`${fieldBase} pl-6 pr-3`}
                                        placeholder="Email or nickname"
                                    />
                                </div>

                                {/* Password */}
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none" />
                                    <input
                                        type={siShowPw ? 'text' : 'password'}
                                        required
                                        value={siPassword}
                                        onChange={e => setSiPassword(e.target.value)}
                                        className={`${fieldBase} pl-6 pr-10`}
                                        placeholder="Password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setSiShowPw(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        tabIndex={-1}
                                    >
                                        <FontAwesomeIcon icon={siShowPw ? faEyeSlash : faEye} className="h-4 w-4" />
                                    </button>
                                </div>

                                {siError && <p className="text-xs text-red-500">{siError}</p>}

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => { setView('forgot'); setFpEmail(siEmail); }}
                                        className="text-xs text-[#239ddb] hover:underline"
                                    >
                                        Forgot password?
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={siLoading}
                                    className="w-full bg-[#239ddb] text-white text-sm font-bold uppercase tracking-wider py-3 rounded-lg hover:bg-[#1a7fb3] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {siLoading ? 'Signing in…' : 'Sign In'}
                                </button>

                                <p className="text-xs text-center text-gray-400 pt-1">
                                    Don&apos;t have an account?{' '}
                                    <button type="button" onClick={() => setTab('signup')} className="text-[#239ddb] hover:underline font-medium">
                                        Create one
                                    </button>
                                </p>
                            </form>
                        )}

                        {view === 'main' && tab === 'signup' && (
                            <form onSubmit={handleSignUp} className="space-y-3">
                                {/* Email */}
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none" />
                                    <input
                                        type="email"
                                        required
                                        value={suEmail}
                                        onChange={e => setSuEmail(e.target.value)}
                                        className={`${fieldBase} pl-6 pr-3`}
                                        placeholder="Email address"
                                    />
                                </div>

                                {/* Password */}
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none" />
                                    <input
                                        type={suShowPw ? 'text' : 'password'}
                                        required
                                        value={suPassword}
                                        onChange={e => setSuPassword(e.target.value)}
                                        className={`${fieldBase} pl-6 pr-10`}
                                        placeholder="Password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setSuShowPw(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        tabIndex={-1}
                                    >
                                        <FontAwesomeIcon icon={suShowPw ? faEyeSlash : faEye} className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Confirm password */}
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400 pointer-events-none" />
                                    <input
                                        type={suShowConfirm ? 'text' : 'password'}
                                        required
                                        value={suConfirm}
                                        onChange={e => setSuConfirm(e.target.value)}
                                        className={`${fieldBase} pl-6 pr-10`}
                                        placeholder="Confirm password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setSuShowConfirm(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        tabIndex={-1}
                                    >
                                        <FontAwesomeIcon icon={suShowConfirm ? faEyeSlash : faEye} className="h-4 w-4" />
                                    </button>
                                </div>

                                <p className="text-[11px] text-gray-400 leading-relaxed">Must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.</p>

                                {/* Nickname — optional */}
                                <input
                                    type="text"
                                    value={suNickname}
                                    onChange={e => setSuNickname(e.target.value)}
                                    className={`${fieldBase} px-3`}
                                    placeholder="Nickname (optional)"
                                />

                                {/* Phone — optional */}
                                <input
                                    type="tel"
                                    value={suPhone}
                                    onChange={e => setSuPhone(formatPhone(e.target.value))}
                                    className={`${fieldBase} px-3`}
                                    placeholder="Phone number (optional)"
                                />

                                {suError && <p className="text-xs text-red-500">{suError}</p>}

                                <button
                                    type="submit"
                                    disabled={suLoading}
                                    className="w-full bg-[#239ddb] text-white text-sm font-bold uppercase tracking-wider py-3 rounded-lg hover:bg-[#1a7fb3] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {suLoading ? 'Creating account…' : 'Create Account'}
                                </button>

                                <p className="text-xs text-center text-gray-400 pt-1">
                                    Already have an account?{' '}
                                    <button type="button" onClick={() => setTab('signin')} className="text-[#239ddb] hover:underline font-medium">
                                        Sign in
                                    </button>
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
