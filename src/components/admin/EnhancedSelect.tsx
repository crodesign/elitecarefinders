import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Ban, LucideIcon } from "lucide-react";

interface OptionType {
    value: string;
    label: string;
    description?: string;
    icon?: LucideIcon;
}

interface EnhancedSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: OptionType[];
    placeholder?: string;
    className?: string;
    textSize?: string;
    leftIcon?: LucideIcon;
    allowNone?: boolean;
}

export function EnhancedSelect({
    value,
    onChange,
    options,
    placeholder = "Select...",
    className = "",
    textSize = "text-sm",
    leftIcon: LeftIcon,
    allowNone = false
}: EnhancedSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between rounded-md ${LeftIcon ? 'pl-10' : 'pl-3'} pr-10 py-2 ${textSize} focus:outline-none transition-colors bg-black/30 text-white hover:bg-black/50 focus:bg-black/50`}
            >
                {LeftIcon && (
                    <LeftIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                )}
                <span className={`truncate ${!selectedOption ? 'text-zinc-600' : 'text-white'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-zinc-900 rounded-md shadow-xl border border-white/10 max-h-60 flex flex-col overflow-hidden">
                    <div className="overflow-y-auto flex-1 p-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {allowNone && (
                            <button
                                type="button"
                                onClick={() => {
                                    onChange("");
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded ${textSize} text-zinc-400 hover:bg-white/5 hover:text-white flex items-center gap-2`}
                            >
                                <Ban className="h-3.5 w-3.5" />
                                <span>None</span>
                                {value === "" && <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></span>}
                            </button>
                        )}

                        {options.map((opt) => {
                            const OptionIcon = opt.icon;
                            const isSelected = opt.value === value;

                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded ${textSize} flex items-start gap-2.5 group transition-colors ${isSelected ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5 hover:text-white"
                                        }`}
                                >
                                    {OptionIcon && (
                                        <OptionIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isSelected ? 'text-accent' : 'text-zinc-500 group-hover:text-white'}`} />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{opt.label}</span>
                                            {isSelected && <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></span>}
                                        </div>
                                        {opt.description && (
                                            <p className="text-xs text-white/60 mt-0.5">{opt.description}</p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
