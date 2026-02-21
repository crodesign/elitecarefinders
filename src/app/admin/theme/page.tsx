"use client";

import { useState, useEffect } from "react";
import {
    Sun,
    Moon,
    Palette,
    Check,
    Paintbrush,
    RotateCcw,
} from "lucide-react";
import { useTheme, type ThemeGrey } from "@/contexts/ThemeContext";

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */

const COLOR_PALETTE = [
    { name: "Red", bg: "bg-red-500", hex: "#ef4444" },
    { name: "Orange", bg: "bg-orange-500", hex: "#f97316" },
    { name: "Amber", bg: "bg-amber-500", hex: "#f59e0b" },
    { name: "Yellow", bg: "bg-yellow-500", hex: "#eab308" },
    { name: "Green", bg: "bg-green-500", hex: "#22c55e" },
    { name: "Emerald", bg: "bg-emerald-500", hex: "#10b981" },
    { name: "Teal", bg: "bg-teal-500", hex: "#14b8a6" },
    { name: "Cyan", bg: "bg-cyan-500", hex: "#06b6d4" },
    { name: "Sky", bg: "bg-sky-500", hex: "#0ea5e9" },
    { name: "Blue", bg: "bg-blue-500", hex: "#3b82f6" },
    { name: "Indigo", bg: "bg-indigo-500", hex: "#6366f1" },
    { name: "Violet", bg: "bg-violet-500", hex: "#8b5cf6" },
    { name: "Purple", bg: "bg-purple-500", hex: "#a855f7" },
    { name: "Fuchsia", bg: "bg-fuchsia-500", hex: "#d946ef" },
    { name: "Pink", bg: "bg-pink-500", hex: "#ec4899" },
    { name: "Rose", bg: "bg-rose-500", hex: "#f43f5e" },
];

const GREYS: { name: string; id: ThemeGrey; hex: string }[] = [
    { name: "Zinc", id: "zinc", hex: "#18181b" },
    { name: "Slate", id: "slate", hex: "#0f172a" },
    { name: "Stone", id: "stone", hex: "#1c1917" },
    { name: "Gray", id: "gray", hex: "#111827" },
    { name: "Neutral", id: "neutral", hex: "#171717" },
];

const SEMANTIC = [
    { name: "Destructive", hex: "#ef4444", badge: "text-red-400 bg-red-500/15" },
    { name: "Success", hex: "#10b981", badge: "text-emerald-400 bg-emerald-500/15" },
    { name: "Warning", hex: "#f59e0b", badge: "text-amber-400 bg-amber-500/15" },
];

const DEFAULT_ACCENT = "#239ddb";

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   COMPONENTS
───────────────────────────────────────────── */

function PanelDivider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 pt-1">
            <p className="text-[10px] font-semibold text-content-muted uppercase tracking-widest whitespace-nowrap">{label}</p>
            <div className="flex-1 h-px bg-white/[0.06]" />
        </div>
    );
}

function Swatch({
    hex, name, bg, onSelect, isSelected,
}: {
    hex: string; name: string; bg?: string;
    onSelect?: (hex: string) => void;
    isSelected?: boolean;
}) {
    return (
        <button
            onClick={() => onSelect?.(hex)}
            title={`${name} — ${hex}`}
            className="group flex flex-col items-center gap-1.5 focus:outline-none"
        >
            <div
                className={`
                    w-9 h-9 rounded-lg transition-all duration-150 flex items-center justify-center
                    ${bg ?? ""}
                    ${isSelected
                        ? "ring-2 ring-white ring-offset-2 ring-offset-[#111] scale-110"
                        : "ring-1 ring-white/10 group-hover:ring-white/40 group-hover:scale-105"}
                `}
                style={!bg ? { backgroundColor: hex } : undefined}
            >
                {isSelected && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
            </div>
            <span className={`text-[9px] leading-none transition-colors ${isSelected ? "text-content-primary" : "text-content-muted group-hover:text-content-secondary"}`}>
                {name}
            </span>
        </button>
    );
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function ThemePage() {
    const { accent, mode, grey, setAccent, setMode, setGrey } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (!mounted) return null;

    return (
        <div className="flex h-full overflow-hidden bg-[#09090b]">

            {/* ── Side Panel ── */}
            <aside className="w-72 flex-shrink-0 h-full border-r border-white/[0.07] bg-[#111111] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.07]">
                    <Paintbrush className="h-4 w-4 text-accent flex-shrink-0" />
                    <div className="min-w-0">
                        <h1 className="text-sm font-semibold text-content-primary">Style Manager</h1>
                        <p className="text-[10px] text-content-muted truncate">Live theme customization</p>
                    </div>
                    <button
                        onClick={() => setAccent(DEFAULT_ACCENT)}
                        title="Reset to default"
                        className="ml-auto flex-shrink-0 p-1.5 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-hover transition-colors"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5">

                    {/* Current Accent Preview */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                        <div
                            className="w-10 h-10 rounded-lg flex-shrink-0 ring-2 ring-white/20 shadow-lg transition-all duration-300"
                            style={{ backgroundColor: accent }}
                        />
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-content-primary">Accent Color</p>
                            <p className="text-[11px] font-mono text-content-muted mt-0.5">{accent}</p>
                        </div>
                        <div className="ml-auto">
                            <Palette className="h-4 w-4 text-content-muted" />
                        </div>
                    </div>

                    {/* Mode Toggle */}
                    <div>
                        <PanelDivider label="Mode" />
                        <div className="flex bg-surface-input p-1 rounded-lg gap-1 mt-3">
                            <button
                                onClick={() => setMode("light")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "light" ? "bg-surface-secondary text-content-primary shadow" : "text-content-muted hover:text-content-primary"}`}
                            >
                                <Sun className="h-3.5 w-3.5" /> Light
                            </button>
                            <button
                                onClick={() => setMode("dark")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "dark" ? "bg-surface-secondary text-content-primary shadow" : "text-content-muted hover:text-content-primary"}`}
                            >
                                <Moon className="h-3.5 w-3.5" /> Dark
                            </button>
                        </div>
                    </div>

                    {/* Primary Palette */}
                    <div>
                        <PanelDivider label="Primary Palette" />
                        <div className="flex flex-wrap gap-2 mt-3">
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

                    {/* Grey Scale */}
                    <div>
                        <PanelDivider label="Grey Scale" />
                        <div className="flex flex-wrap gap-2 mt-3">
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

                    {/* Semantic */}
                    <div>
                        <PanelDivider label="Semantic" />
                        <div className="mt-3 space-y-2">
                            {SEMANTIC.map((s) => (
                                <div key={s.name} className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-md ring-1 ring-white/10 flex-shrink-0" style={{ backgroundColor: s.hex }} />
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.badge}`}>{s.name}</span>
                                    <span className="ml-auto text-[10px] font-mono text-content-secondary">{s.hex}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </aside>

            {/* ── Main Area (placeholder for future content) ── */}
            <main className="flex-1 h-full flex items-center justify-center">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center" style={{ backgroundColor: `${accent}22` }}>
                        <Paintbrush className="h-6 w-6" style={{ color: accent }} />
                    </div>
                    <p className="text-sm font-medium text-content-muted">More style options coming soon</p>
                    <p className="text-xs text-content-secondary">Typography, spacing, and component settings</p>
                </div>
            </main>

        </div>
    );
}


