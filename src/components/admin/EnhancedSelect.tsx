import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Ban, X } from "lucide-react";

interface OptionType {
    value: string;
    label: string;
    description?: string;
    icon?: React.ComponentType<{ className?: string }>;
    iconColor?: string;
    depth?: number;
    isGroupHeader?: boolean;
}

interface EnhancedSelectProps {
    value?: string;
    onChange?: (value: string) => void;
    multiValue?: string[];
    onMultiChange?: (values: string[]) => void;
    options: OptionType[];
    placeholder?: string;
    className?: string;
    textSize?: string;
    leftIcon?: React.ComponentType<{ className?: string }>;
    allowNone?: boolean;
    isActive?: boolean;
    onClear?: () => void;
    multiLabel?: string;
}

export function EnhancedSelect({
    value = "",
    onChange,
    multiValue,
    onMultiChange,
    options,
    placeholder = "Select...",
    className = "",
    textSize = "text-sm",
    leftIcon: LeftIcon,
    allowNone = false,
    isActive = false,
    onClear,
    multiLabel = "types"
}: EnhancedSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const isMulti = multiValue !== undefined && onMultiChange !== undefined;

    const selectedOption = !isMulti ? options.find(opt => opt.value === value) : null;

    const multiDisplayText = isMulti
        ? multiValue!.length === 0
            ? null
            : multiValue!.length === 1
                ? options.find(o => o.value === multiValue![0])?.label ?? null
                : `${multiValue!.length} ${multiLabel}`
        : null;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMultiToggle = (optValue: string) => {
        if (!isMulti) return;
        if (optValue === "") {
            onMultiChange!([]);
            setIsOpen(false);
            return;
        }
        const next = multiValue!.includes(optValue)
            ? multiValue!.filter(v => v !== optValue)
            : [...multiValue!, optValue];
        onMultiChange!(next);
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`form-input w-full flex items-center justify-between ${LeftIcon ? 'pl-10' : 'pl-3'} pr-10 py-2 ${textSize}${isActive ? ' ring-2 ring-accent' : ''}`}
            >
                {LeftIcon && (
                    <LeftIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted" />
                )}
                <span className={`truncate ${isMulti ? (multiValue!.length > 0 ? 'text-content-primary' : 'text-content-secondary') : (!selectedOption ? 'text-content-secondary' : 'text-content-primary')}`}>
                    {isMulti ? (multiDisplayText ?? placeholder) : (selectedOption ? selectedOption.label : placeholder)}
                </span>
                {!(isActive && onClear) && (
                    <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
            </button>

            {isActive && onClear && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onClear(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-content-muted hover:text-content-primary transition-colors z-10"
                >
                    <X className="h-3 w-3" />
                </button>
            )}

            {isOpen && (
                <div className="dropdown-menu absolute z-50 w-full mt-1 max-h-60 flex flex-col">
                    <div className="overflow-y-auto flex-1 p-1">
                        {allowNone && !isMulti && (
                            <button
                                type="button"
                                onClick={() => {
                                    onChange?.("");
                                    setIsOpen(false);
                                }}
                                className={`dropdown-item w-full rounded ${textSize}`}
                            >
                                <Ban className="h-3.5 w-3.5" />
                                <span>None</span>
                                {value === "" && <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></span>}
                            </button>
                        )}

                        {options.map((opt) => {
                            const indent = (opt.depth ?? 0) * 12 + 12;

                            if (opt.isGroupHeader) {
                                return (
                                    <div
                                        key={opt.value}
                                        className={`py-1 text-xs font-semibold text-content-muted uppercase tracking-wide select-none ${textSize}`}
                                        style={{ paddingLeft: `${indent}px`, paddingRight: '12px' }}
                                    >
                                        {opt.label}
                                    </div>
                                );
                            }

                            const OptionIcon = opt.icon;
                            const isSelected = isMulti
                                ? (opt.value === "" ? multiValue!.length === 0 : multiValue!.includes(opt.value))
                                : opt.value === value;

                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        if (isMulti) {
                                            handleMultiToggle(opt.value);
                                        } else {
                                            onChange?.(opt.value);
                                            setIsOpen(false);
                                        }
                                    }}
                                    className={`dropdown-item w-full rounded ${textSize} ${isSelected ? "active" : ""}`}
                                    style={{ paddingLeft: `${indent}px` }}
                                >
                                    {OptionIcon && (
                                        <OptionIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${opt.iconColor ?? (isSelected ? 'text-accent' : 'text-content-muted')}`} />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{opt.label}</span>
                                            {isSelected && <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></span>}
                                        </div>
                                        {opt.description && (
                                            <p className="text-xs text-content-muted mt-0.5">{opt.description}</p>
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
