'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { Logo } from '@/components/icons/Logo';
import { createClientComponentClient } from '@/lib/supabase';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [view, setView] = useState<'login' | 'forgot' | 'forgot-sent'>('login');
    const [fpEmail, setFpEmail] = useState('');
    const [fpError, setFpError] = useState('');
    const [fpLoading, setFpLoading] = useState(false);

    const { signIn } = useAuth();
    const supabase = createClientComponentClient();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error: signInError } = await signIn(email, password);

        if (signInError) {
            setError(signInError.message);
            setLoading(false);
            return;
        }

        router.push('/admin');
    };

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

    const inputClass = 'w-full rounded-md px-3 py-2 text-sm focus:outline-none transition-colors bg-white text-gray-900 placeholder-content-muted border border-ui-border hover:border-ui-border-h focus:border-[var(--accent)]';

    return (
        <div data-theme="light" style={{ colorScheme: 'light' }} className="min-h-screen flex items-center justify-center bg-surface-primary px-4">
            <div className="w-full max-w-md">
                <div className="bg-surface-card p-8 rounded-lg border border-ui-border shadow-lg">
                    <div className="flex justify-center mb-6">
                        <Logo className="h-16" />
                    </div>

                    {view === 'login' && (
                        <>
                            <p className="text-content-secondary text-center mb-8">
                                Sign in to access the admin dashboard
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label htmlFor="email" className="text-sm font-medium text-content-primary block">
                                        Email or Nickname
                                    </label>
                                    <input
                                        id="email"
                                        type="text"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="username"
                                        className={inputClass}
                                        placeholder="you@example.com or nickname"
                                        disabled={loading}
                                    />
                                    <p className="text-xs text-content-muted italic">
                                        You can sign in with either your email address or nickname
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <label htmlFor="password" className="text-sm font-medium text-content-primary block">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            autoComplete="current-password"
                                            className={`${inputClass} pr-10`}
                                            placeholder="••••••••"
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-content-muted hover:text-content-primary transition-colors rounded hover:bg-surface-hover"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <div className="flex justify-end pt-0.5">
                                        <button
                                            type="button"
                                            onClick={() => { setView('forgot'); setFpEmail(email); }}
                                            className="text-xs text-[var(--accent)] hover:underline"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                    {loading ? 'Signing in...' : 'Sign In'}
                                </button>
                            </form>
                        </>
                    )}

                    {view === 'forgot' && (
                        <>
                            <p className="text-content-secondary text-center mb-8">
                                Enter your email and we&apos;ll send you a reset link.
                            </p>

                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                {fpError && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                                        {fpError}
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label htmlFor="fp-email" className="text-sm font-medium text-content-primary block">
                                        Email address
                                    </label>
                                    <input
                                        id="fp-email"
                                        type="email"
                                        value={fpEmail}
                                        onChange={(e) => setFpEmail(e.target.value)}
                                        required
                                        autoFocus
                                        className={inputClass}
                                        placeholder="you@example.com"
                                        disabled={fpLoading}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={fpLoading}
                                    className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                    {fpLoading ? 'Sending…' : 'Send Reset Link'}
                                </button>

                                <p className="text-xs text-center text-content-muted">
                                    <button type="button" onClick={() => setView('login')} className="text-[var(--accent)] hover:underline">
                                        Back to sign in
                                    </button>
                                </p>
                            </form>
                        </>
                    )}

                    {view === 'forgot-sent' && (
                        <div className="py-4 text-center space-y-3">
                            <p className="text-sm font-semibold text-content-primary">Check your email</p>
                            <p className="text-sm text-content-secondary">
                                We sent a password reset link to <strong>{fpEmail}</strong>.
                            </p>
                            <button
                                type="button"
                                onClick={() => { setView('login'); setFpEmail(''); }}
                                className="mt-2 text-sm text-[var(--accent)] hover:underline"
                            >
                                Back to sign in
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
