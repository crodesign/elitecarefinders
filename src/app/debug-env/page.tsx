
'use client';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@/lib/supabase';

export default function DebugEnvPage() {
    const [envStatus, setEnvStatus] = useState<any>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        setEnvStatus({
            url_exists: !!url,
            url_value: url, // Be careful showing this if sensitive, but for debugging ok
            key_exists: !!key,
            key_length: key ? key.length : 0
        });

        const testSupabase = async () => {
            try {
                const supabase = createClientComponentClient();
                const { data, error } = await supabase.auth.getSession();
                if (error) throw error;
                console.log('Supabase session check:', data);
            } catch (err: any) {
                console.error('Supabase client error:', err);
                setError(err.message || String(err));
            }
        };

        testSupabase();
    }, []);

    return (
        <div className="p-8 text-white bg-black min-h-screen font-mono">
            <h1 className="text-xl font-bold mb-4">Environment Debug</h1>
            <pre className="bg-zinc-900 p-4 rounded mb-4">
                {JSON.stringify(envStatus, null, 2)}
            </pre>
            {error && (
                <div className="text-red-500 border border-red-500 p-4 rounded">
                    Error: {error}
                </div>
            )}
        </div>
    );
}
