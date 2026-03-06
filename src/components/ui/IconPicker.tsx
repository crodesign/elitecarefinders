"use client";

import { useState, useRef, useEffect } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { Search, X, Smile } from "lucide-react";
import { ICON_LIST, ICON_MAP } from "@/components/ui/icon-map";

export { ICON_MAP } from "@/components/ui/icon-map";

interface IconPickerProps {
    value?: string;
    onChange: (iconName: string | undefined) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const popupRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        function handleClick(e: MouseEvent) {
            if (
                popupRef.current && !popupRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen]);

    const filtered = ICON_LIST.filter(entry =>
        entry.name.toLowerCase().includes(search.toLowerCase())
    );

    const SelectedIcon = value ? ICON_MAP[value] : null;

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                type="button"
                onClick={() => { setIsOpen(!isOpen); setSearch(""); }}
                className={`p-1.5 rounded transition-colors ${value
                    ? "text-accent bg-transparent hover:bg-white/5"
                    : "text-content-muted hover:text-white bg-black/20 hover:bg-black/40"
                    }`}
                title={value ? `Icon: ${value}` : "Choose icon"}
            >
                {SelectedIcon ? (
                    <SelectedIcon className="h-4 w-4" />
                ) : (
                    <Smile className="h-4 w-4" />
                )}
            </button>

            {isOpen && (
                <div
                    ref={popupRef}
                    className="absolute left-0 top-full mt-2 z-[1000] w-[320px] bg-surface-secondary border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                >
                    {/* Search bar */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
                        <Search className="h-4 w-4 text-content-muted shrink-0" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search icons..."
                            className="flex-1 bg-transparent text-sm text-white placeholder-content-muted focus:outline-none"
                            autoFocus
                        />
                        {value && (
                            <button
                                type="button"
                                onClick={() => { onChange(undefined); setIsOpen(false); }}
                                className="text-content-muted hover:text-red-400 text-xs shrink-0"
                                title="Remove icon"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Icon grid */}
                    <div className="grid grid-cols-8 gap-0.5 p-2 max-h-[240px] overflow-y-auto">
                        {filtered.map(entry => {
                            const IconComp = entry.icon;
                            const isSelected = value === entry.name;
                            return (
                                <Tooltip key={entry.name} content={entry.name}>
                                    <button
                                        type="button"
                                        onClick={() => { onChange(entry.name); setIsOpen(false); }}
                                        className={`p-2 rounded transition-colors flex items-center justify-center ${isSelected
                                            ? "bg-accent/20 text-accent"
                                            : "text-content-muted hover:text-white hover:bg-white/10"
                                            }`}
                                    >
                                        <IconComp className="h-4 w-4" />
                                    </button>
                                </Tooltip>
                            );
                        })}
                        {filtered.length === 0 && (
                            <div className="col-span-8 text-center text-content-muted text-xs py-4">
                                No icons match &ldquo;{search}&rdquo;
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
