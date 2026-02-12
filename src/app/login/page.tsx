'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { Logo } from '@/components/icons/Logo';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();
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

        // Redirect to admin dashboard on successful login
        router.push('/admin');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-low px-4">
            <div className="w-full max-w-md">
                <div className="bg-surface p-8 rounded-lg border border-border shadow-lg">
                    <div className="flex justify-center mb-6">
                        <Logo className="h-16" />
                    </div>
                    <p className="text-content-secondary text-center mb-8">
                        Sign in to access the admin dashboard
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-error-light border border-error text-error-dark px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        <div className="bg-white/5 rounded-lg p-3 transition-all space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-white/80 block">
                                Email or Nickname
                            </label>
                            <input
                                id="email"
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="username"
                                className="w-full rounded-md px-3 py-2 text-left text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50 autofill:bg-black/30 autofill:text-white [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0px_1000px_rgb(13_17_21)_inset]"
                                placeholder="you@example.com or nickname"
                                disabled={loading}
                            />
                            <p className="text-xs text-zinc-500 italic">
                                You can sign in with either your email address or nickname
                            </p>
                        </div>

                        <div className="bg-white/5 rounded-lg p-3 transition-all space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-white/80 block">
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
                                    className="w-full rounded-md px-3 py-2 pr-10 text-left text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50 autofill:bg-black/30 autofill:text-white [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0px_1000px_rgb(13_17_21)_inset]"
                                    placeholder="••••••••"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white transition-colors rounded hover:bg-white/10"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
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
                </div>
            </div>
        </div>
    );
}
