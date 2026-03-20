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
                className={`form-input w-full flex items-center justify-between px-2 py-1 ${textSize} h-full min-h-[28px]${isOpen ? " select-open" : ""}`}
            >
                <span className={`truncate mr-2 ${value ? "text-content-primary" : "text-content-muted"}`}>
                    {value || placeholder}
                </span>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 text-content-muted ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="dropdown-menu absolute z-50 right-0 w-full min-w-[150px] mt-1 max-h-60 flex flex-col">
                    <div className="overflow-y-auto flex-1 p-1">
                        <button
                            type="button"
                            onClick={() => {
                                onChange("");
                                setIsOpen(false);
                            }}
                            className={`dropdown-item w-full rounded ${textSize}`}
                        >
                            <Ban className="h-3.5 w-3.5" />
                            <span>None</span>
                            {value === "" && <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></span>}
                        </button>

                        {options.map((opt) => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                    onChange(opt);
                                    setIsOpen(false);
                                }}
                                className={`dropdown-item w-full rounded ${textSize} ${value === opt ? "active" : ""}`}
                            >
                                <span>{opt}</span>
                                {value === opt && <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
