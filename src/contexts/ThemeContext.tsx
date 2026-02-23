'use client';

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from 'react';
import { createClientComponentClient } from '@/lib/supabase';

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */

export type ThemeMode = 'dark' | 'light';
export type ThemeGrey = 'zinc' | 'slate' | 'stone' | 'gray' | 'neutral';

interface ThemeContextType {
    accent: string;
    mode: ThemeMode;
    grey: ThemeGrey;
    setAccent: (hex: string) => void;
    setMode: (mode: ThemeMode) => void;
    setGrey: (grey: ThemeGrey) => void;
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

const DEFAULT_ACCENT = '#239ddb';
const DEFAULT_MODE: ThemeMode = 'dark';
const DEFAULT_GREY: ThemeGrey = 'zinc';

function hexToHsl(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function lighten(hex: string, amount: number) {
    const [h, s, l] = hexToHsl(hex);
    return `hsl(${h}, ${s}%, ${Math.min(100, l + amount)}%)`;
}

function darken(hex: string, amount: number) {
    const [h, s, l] = hexToHsl(hex);
    return `hsl(${h}, ${s}%, ${Math.max(0, l - amount)}%)`;
}

/** Apply accent CSS variables to the document root */
function applyAccent(hex: string, mode: ThemeMode = 'dark') {
    const root = document.documentElement;
    root.style.setProperty('--accent', hex);
    if (mode === 'dark') {
        // In dark mode, 'accent-light' diminishes (darkens) the button
        root.style.setProperty('--accent-light', darken(hex, 12));
        root.style.setProperty('--accent-dark', lighten(hex, 12));
    } else {
        // In light mode, 'accent-light' brightens the button
        root.style.setProperty('--accent-light', lighten(hex, 12));
        root.style.setProperty('--accent-dark', darken(hex, 12));
    }
}

/** Apply mode (light/dark) to the document root */
function applyMode(mode: ThemeMode) {
    const root = document.documentElement;
    if (mode === 'light') {
        root.setAttribute('data-theme', 'light');
    } else {
        root.removeAttribute('data-theme');
    }
}

/** Apply grey scale to the document root */
function applyGrey(grey: ThemeGrey) {
    document.documentElement.setAttribute('data-grey', grey);
}

/* ─────────────────────────────────────────────
   CONTEXT
───────────────────────────────────────────── */

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/** Read theme from cookie synchronously (client-side only) */
function getInitialFromCookie(): { accent: string; mode: ThemeMode; grey: ThemeGrey } {
    if (typeof document === 'undefined') {
        return { accent: DEFAULT_ACCENT, mode: DEFAULT_MODE, grey: DEFAULT_GREY };
    }
    const match = document.cookie.match(/(?:^|;\s*)elite_theme=([^;]*)/);
    if (match) {
        try {
            const parsed = JSON.parse(decodeURIComponent(match[1]));
            return {
                accent: parsed.accent || DEFAULT_ACCENT,
                mode: parsed.mode === 'light' ? 'light' : 'dark',
                grey: parsed.grey || DEFAULT_GREY,
            };
        } catch {
            // ignore bad cookie
        }
    }
    return { accent: DEFAULT_ACCENT, mode: DEFAULT_MODE, grey: DEFAULT_GREY };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const initial = getInitialFromCookie();
    const [accent, setAccentState] = useState(initial.accent);
    const [mode, setModeState] = useState<ThemeMode>(initial.mode);
    const [grey, setGreyState] = useState<ThemeGrey>(initial.grey);
    const supabase = createClientComponentClient();
    const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Apply initial theme from cookie before the first Supabase fetch
    useEffect(() => {
        applyAccent(initial.accent, initial.mode);
        applyMode(initial.mode);
        applyGrey(initial.grey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* Load preferences from Supabase on mount */
    useEffect(() => {
        const loadPrefs = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                // Apply defaults even if not logged in
                applyAccent(DEFAULT_ACCENT, DEFAULT_MODE);
                applyMode(DEFAULT_MODE);
                applyGrey(DEFAULT_GREY);
                return;
            }

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('theme_accent, theme_mode')
                .eq('user_id', session.user.id)
                .single();

            if (profile) {
                const savedAccent = profile.theme_accent || DEFAULT_ACCENT;
                const savedMode: ThemeMode = profile.theme_mode === 'light' ? 'light' : 'dark';
                const savedGrey: ThemeGrey = DEFAULT_GREY;

                setAccentState(savedAccent);
                setModeState(savedMode);
                setGreyState(savedGrey);

                applyAccent(savedAccent, savedMode);
                applyMode(savedMode);
                applyGrey(savedGrey);

                // Sync to cookies for SSR
                document.cookie = `elite_theme=${encodeURIComponent(JSON.stringify({
                    accent: savedAccent,
                    mode: savedMode,
                    grey: savedGrey
                }))}; path=/; max-age=31536000`; // 1 year expiry
            }
        };

        loadPrefs();

        // Re-load if auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            loadPrefs();
        });

        return () => subscription.unsubscribe();
    }, []);

    const savePrefs = useCallback((newAccent: string, newMode: ThemeMode, newGrey: ThemeGrey) => {
        // 1. Immediately sync to cookie so refreshes instantly pick it up
        document.cookie = `elite_theme=${encodeURIComponent(JSON.stringify({
            accent: newAccent,
            mode: newMode,
            grey: newGrey
        }))}; path=/; max-age=31536000`; // 1 year expiry

        // 2. Debounce the Supabase save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { error } = await supabase
                .from('user_profiles')
                .update({
                    theme_accent: newAccent,
                    theme_mode: newMode,
                    // theme_grey: newGrey // Add back when column exists
                })
                .eq('user_id', session.user.id);

            if (error) {
                console.error("Failed to save theme preferences:", error);
            }
        }, 500);
    }, [supabase]);

    const setAccent = useCallback((hex: string) => {
        setAccentState(hex);
        applyAccent(hex, mode);
        savePrefs(hex, mode, grey);
    }, [mode, grey, savePrefs]);

    const setMode = useCallback((newMode: ThemeMode) => {
        setModeState(newMode);
        applyMode(newMode);
        applyAccent(accent, newMode);
        savePrefs(accent, newMode, grey);
    }, [accent, grey, savePrefs]);

    const setGrey = useCallback((newGrey: ThemeGrey) => {
        setGreyState(newGrey);
        applyGrey(newGrey);
        savePrefs(accent, mode, newGrey);
    }, [accent, mode, savePrefs]);

    return (
        <ThemeContext.Provider value={{ accent, mode, grey, setAccent, setMode, setGrey }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextType {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
    return ctx;
}
