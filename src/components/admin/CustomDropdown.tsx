"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface DropdownOption {
    value: string;
    label: string;
    description?: string;
    icon?: React.ComponentType<{ className?: string }>;
}

interface CustomDropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: DropdownOption[];
    placeholder?: string;
    leftIcon?: React.ComponentType<{ className?: string }>;
    className?: string;
}

export function CustomDropdown({
    value,
    onChange,
    options,
    placeholder = "Select option",
    leftIcon: LeftIcon,
    className = ""
}: CustomDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full rounded-md py-2 ${LeftIcon ? 'pl-10' : 'pl-3'} pr-10 text-sm text-left focus:outline-none transition-colors bg-black/30 text-white hover:bg-black/50 focus:bg-black/50 ${className}`}
            >
                {LeftIcon && (
                    <LeftIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                )}
                <span className={!selectedOption ? 'text-zinc-600' : ''}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg bg-[rgb(13,17,21)] border border-white/10 shadow-xl max-h-60 overflow-auto">
                    {options.map((option) => {
                        const OptionIcon = option.icon;
                        const isSelected = option.value === value;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleSelect(option.value)}
                                className="w-full px-3 py-2.5 text-left hover:bg-white/10 transition-colors flex items-start gap-2.5 group"
                            >
                                {OptionIcon && (
                                    <OptionIcon className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-white">{option.label}</span>
                                        {isSelected && (
                                            <Check className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                                        )}
                                    </div>
                                    {option.description && (
                                        <p className="text-xs text-white/60 mt-0.5">{option.description}</p>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
