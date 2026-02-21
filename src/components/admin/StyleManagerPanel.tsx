'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sun, Moon, Check } from 'lucide-react';
import { SlidePanel } from './SlidePanel';
import { useTheme } from '@/contexts/ThemeContext';

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */

const COLOR_PALETTE = [
    { name: 'Red', hex: '#ef4444' },
    { name: 'Orange', hex: '#f97316' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Yellow', hex: '#eab308' },
    { name: 'Green', hex: '#22c55e' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Teal', hex: '#14b8a6' },
    { name: 'Cyan', hex: '#06b6d4' },
    { name: 'Sky', hex: '#0ea5e9' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Violet', hex: '#8b5cf6' },
    { name: 'Purple', hex: '#a855f7' },
    { name: 'Fuchsia', hex: '#d946ef' },
    { name: 'Pink', hex: '#ec4899' },
    { name: 'Rose', hex: '#f43f5e' },
];

import type { ThemeGrey } from '@/contexts/ThemeContext';

const GREYS: { name: string; id: ThemeGrey; hex: string }[] = [
    { name: 'Zinc', id: 'zinc', hex: '#18181b' },
    { name: 'Slate', id: 'slate', hex: '#0f172a' },
    { name: 'Stone', id: 'stone', hex: '#1c1917' },
    { name: 'Gray', id: 'gray', hex: '#111827' },
    { name: 'Neutral', id: 'neutral', hex: '#171717' },
];

const SEMANTIC = [
    { name: 'Destructive', hex: '#ef4444', badge: 'text-red-400 bg-red-500/15' },
    { name: 'Success', hex: '#10b981', badge: 'text-emerald-400 bg-emerald-500/15' },
    { name: 'Warning', hex: '#f59e0b', badge: 'text-amber-400 bg-amber-500/15' },
];

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */

function Divider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 mt-1">
            <p className="text-[10px] font-semibold text-content-muteduppercase tracking-widest whitespace-nowrap">
                {label}
            </p>
            <div className="flex-1 h-px bg-white/[0.06]" />
        </div>
    );
}

function Swatch({
    hex, name, onSelect, isSelected,
}: {
    hex: string; name: string;
    onSelect?: (hex: string) => void;
    isSelected?: boolean;
}) {
    return (
        <button
            onClick={() => onSelect?.(hex)}
            className={`
                group flex flex-col items-center gap-1.5 focus:outline-none w-full
                rounded-xl p-1.5 transition-all duration-150
                ${isSelected
                    ? 'ring-2 ring-accent bg-surface-hover'
                    : 'hover:bg-surface-hover'}
            `}
        >
            <div
                className="w-full h-10 rounded-lg transition-transform duration-150 flex items-center justify-center group-hover:scale-[1.03]"
                style={{ backgroundColor: hex }}
            >
                {isSelected && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
            </div>
            <span className={`text-[11px] leading-none transition-colors truncate w-full text-center ${isSelected ? 'text-content-primary' : 'text-content-muted group-hover:text-content-secondary'}`}>
                {name}
            </span>
        </button>
    );
}

/* ─────────────────────────────────────────────
   PANEL
───────────────────────────────────────────── */

interface StyleManagerPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function StyleManagerPanel({ isOpen, onClose }: StyleManagerPanelProps) {
    const { accent, mode, grey, setAccent, setMode, setGrey } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (!mounted) return null;

    const panel = (
        <SlidePanel
            isOpen={isOpen}
            onClose={onClose}
            title="Style Manager"
            subtitle="Live theme customization"
            width={300}
            showOverlay
            closeOnOverlayClick
            contentClassName="flex-1 overflow-y-auto p-5 space-y-6"
        >
            {/* ── Mode ── */}
            <div className="space-y-3">
                <Divider label="Mode" />
                <div className="flex bg-surface-input p-1 rounded-lg gap-1">
                    <button
                        onClick={() => setMode('light')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${mode === 'light' ? 'bg-surface-secondary text-content-primary shadow' : 'text-content-muted hover:text-content-primary'}`}
                    >
                        <Sun className="h-3.5 w-3.5" /> Light
                    </button>
                    <button
                        onClick={() => setMode('dark')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${mode === 'dark' ? 'bg-surface-secondary text-content-primary shadow' : 'text-content-muted hover:text-content-primary'}`}
                    >
                        <Moon className="h-3.5 w-3.5" /> Dark
                    </button>
                </div>
            </div>

            {/* ── Primary Palette ── */}
            <div className="space-y-3">
                <Divider label="Primary Palette" />
                <div className="grid grid-cols-4 gap-2">
                    {COLOR_PALETTE.map((c) => (
                        <Swatch
                            key={c.name}
                            {...c}
                            onSelect={setAccent}
                            isSelected={accent === c.hex}
                        />
                    ))}
                </div>
            </div>

            {/* ── Grey Scale ── */}
            <div className="space-y-3">
                <Divider label="Grey Scale" />
                <div className="grid grid-cols-5 gap-2">
                    {GREYS.map((g) => (
                        <Swatch
                            key={g.id}
                            name={g.name}
                            hex={g.hex}
                            isSelected={grey === g.id}
                            onSelect={() => setGrey(g.id)}
                        />
                    ))}
                </div>
            </div>

            {/* ── Semantic ── */}
            <div className="space-y-3">
                <Divider label="Semantic" />
                <div className="space-y-2">
                    {SEMANTIC.map((s) => (
                        <div key={s.name} className="flex items-center gap-3">
                            <div
                                className="w-4 h-4 rounded-md ring-1 ring-white/10 flex-shrink-0"
                                style={{ backgroundColor: s.hex }}
                            />
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.badge}`}>
                                {s.name}
                            </span>
                            <span className="ml-auto text-[10px] font-mono text-content-secondary">{s.hex}</span>
                        </div>
                    ))}
                </div>
            </div>
        </SlidePanel>
    );

    return createPortal(panel, document.body);
}
