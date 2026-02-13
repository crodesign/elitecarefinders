import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Ban } from "lucide-react";

interface SimpleSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder?: string;
    className?: string;
    textSize?: string;
}

export function SimpleSelect({ value, onChange, options, placeholder = "Select...", className = "", textSize = "text-sm" }: SimpleSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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
                className={`w-full flex items-center justify-between rounded-md px-2 py-1 ${textSize} focus:outline-none transition-colors h-full min-h-[28px] ${value
                    ? `bg-black/30 text-white ${isOpen ? "bg-black/50" : "hover:bg-black/50"}`
                    : `text-white ${isOpen ? "bg-black/50" : "bg-black/30 hover:bg-black/50 focus:bg-black/50"}`
                    }`}
            >
                <span className={`truncate mr-2 ${value ? "text-white" : "text-zinc-500"}`}>
                    {value || placeholder}
                </span>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${value ? "text-white/80" : "text-zinc-500"} ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 right-0 w-full min-w-[150px] mt-1 bg-zinc-900 rounded-md shadow-xl max-h-60 flex flex-col overflow-hidden">
                    <div className="overflow-y-auto flex-1 p-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <button
                            type="button"
                            onClick={() => {
                                onChange("");
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded ${textSize} text-zinc-400 hover:bg-white/5 hover:text-white flex items-center gap-2`}
                        >
                            <Ban className="h-3.5 w-3.5" />
                            <span>None</span>
                            {value === "" && <Check className="h-3.5 w-3.5 ml-auto text-accent" />}
                        </button>

                        {options.map((opt) => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                    onChange(opt);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-2 py-1.5 rounded ${textSize} flex items-center group transition-colors ${value === opt ? "bg-accent/10 text-accent" : "text-zinc-300 hover:bg-white/5 hover:text-white"
                                    }`}
                            >
                                <span>{opt}</span>
                                {value === opt && <Check className="h-3.5 w-3.5 ml-auto text-accent" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
