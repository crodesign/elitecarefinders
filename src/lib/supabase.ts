import { createBrowserClient } from '@supabase/ssr'

export function createClientComponentClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

// For backwards compatibility, export a default instance
// Only create if running in browser to avoid server-side errors
export const supabase = typeof window !== 'undefined'
    ? createClientComponentClient()
    : null as any
