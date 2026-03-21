"use client";

import { Dispatch, SetStateAction } from "react";
import { Check, X, Phone, Mail, ChevronUp, ChevronDown, DollarSign } from "lucide-react";
import { ICON_MAP } from "@/components/ui/IconPicker";
import type { RoomDetails, RoomFieldCategory, RoomFieldDefinition } from "@/types";
import { SimpleSelect } from "../../SimpleSelect";

interface FacilityFieldCategoryProps {
    category: RoomFieldCategory;
    roomDetails: RoomDetails;
    setRoomDetails: Dispatch<SetStateAction<RoomDetails>>;
    setIsDirty: (value: boolean) => void;
    roomDefinitions: RoomFieldDefinition[];
    invalidEmailFields: Set<string>;
    setInvalidEmailFields: Dispatch<SetStateAction<Set<string>>>;
    lighterCheckboxes?: boolean;
}

const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 0) return '';
    if (numbers.length <= 3) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
};

export function FacilityFieldCategory({
    category,
    roomDetails,
    setRoomDetails,
    setIsDirty,
    roomDefinitions,
    invalidEmailFields,
    setInvalidEmailFields,
    lighterCheckboxes = false,
}: FacilityFieldCategoryProps) {
    const categoryFields = roomDefinitions.filter(f =>
        f.categoryId === category.id &&
        f.isActive &&
        (f.targetType === 'facility' || f.targetType === 'both')
    );
    if (categoryFields.length === 0) return null;

    // Defensive fallback: ensure customFields is always defined
    const customFields = roomDetails.customFields || {};

    return (
        <div className="bg-surface-input rounded-lg p-[5px]">
            <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
                {category.icon && ICON_MAP[category.icon] && (() => { const CatIcon = ICON_MAP[category.icon!]; return <CatIcon className="h-4 w-4 text-accent" />; })()}
                {category.name}
            </h3>
            <div className="space-y-2">
                {categoryFields.map(field => (
                    <div key={field.id} className="space-y-1">
                        {field.type !== 'boolean' && field.type !== 'single' && field.type !== 'multi' && field.type !== 'dropdown' && field.type !== 'text' && field.type !== 'textarea' && field.type !== 'number' && field.type !== 'phone' && field.type !== 'email' && field.type !== 'currency' && (
                            <label className="text-sm font-medium text-content-secondary pl-[5px]">{field.name}</label>
                        )}

                        {/* Boolean Field */}
                        {field.type === 'boolean' && (
                            <div className="bg-surface-hover rounded-lg p-[3px] flex items-center justify-between gap-3">
                                <span className="font-medium text-sm text-content-secondary pl-[5px]">{field.name}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const current = customFields[field.id];
                                        let nextVal: boolean | undefined;
                                        if (current === true) nextVal = false;
                                        else if (current === false) nextVal = undefined;
                                        else nextVal = true;
                                        setRoomDetails((prev: RoomDetails) => {
                                            const newCustomFields = { ...prev.customFields };
                                            if (nextVal === undefined) {
                                                delete newCustomFields[field.id];
                                            } else {
                                                newCustomFields[field.id] = nextVal;
                                            }
                                            setIsDirty(true);
                                            return { ...prev, customFields: newCustomFields };
                                        });
                                    }}
                                    className={`h-8 px-3 rounded-md flex items-center gap-2 transition-all ${customFields[field.id] === true
                                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                        : customFields[field.id] === false
                                            ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                                            : "bg-surface-input text-content-muted hover:bg-surface-hover"
                                        }`}
                                >
                                    <span className="text-xs font-medium uppercase">
                                        {customFields[field.id] === true
                                            ? "Yes"
                                            : customFields[field.id] === false
                                                ? "No"
                                                : "Select"}
                                    </span>
                                    <div
                                        className="p-0.5 rounded-full"
                                        style={{ backgroundColor: customFields[field.id] !== undefined ? 'rgba(255,255,255,0.20)' : 'var(--form-border)' }}
                                    >
                                        {customFields[field.id] === true ? (
                                            <Check className="h-3 w-3" />
                                        ) : customFields[field.id] === false ? (
                                            <X className="h-3 w-3" />
                                        ) : (
                                            <div className="h-3 w-3" />
                                        )}
                                    </div>
                                </button>
                            </div>
                        )}

                        {/* Single Select */}
                        {field.type === 'single' && (
                            <div className="bg-surface-input rounded-lg p-[3px] space-y-2" style={{ border: '2px solid var(--form-border-subtle)' }}>
                                <label className="text-sm font-medium text-content-secondary block pl-[5px] pt-[2px] pb-0">{field.name}</label>
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                    {field.options?.map((opt) => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setRoomDetails((prev: RoomDetails) => {
                                                const current = prev.customFields[field.id];
                                                const newCustomFields = { ...prev.customFields };
                                                if (current === opt) {
                                                    delete newCustomFields[field.id];
                                                } else {
                                                    newCustomFields[field.id] = opt;
                                                }
                                                setIsDirty(true);
                                                return { ...prev, customFields: newCustomFields };
                                            })}
                                            className={`w-full flex items-center justify-between p-[3px] rounded-lg text-left transition-all ${customFields[field.id] === opt
                                                ? "text-content-primary"
                                                : "text-content-secondary hover:text-content-primary hover:bg-surface-hover"
                                                }`}
                                            style={customFields[field.id] === opt ? { backgroundColor: 'var(--nav-active-bg)' } : undefined}
                                        >
                                            <span className="text-sm font-medium pl-[5px]">{opt}</span>
                                            {customFields[field.id] === opt && (
                                                <span className="flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center">
                                                    <Check className="h-2.5 w-2.5 text-white" />
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Dropdown */}
                        {field.type === 'dropdown' && (
                            <div className="flex items-center justify-between gap-2 p-[3px] rounded-lg transition-all bg-surface-hover">
                                <span className="font-medium text-sm text-content-secondary pl-[5px]">{field.name}</span>
                                <SimpleSelect
                                    value={customFields[field.id] as string || ""}
                                    onChange={(val) => {
                                        setRoomDetails((prev: RoomDetails) => ({
                                            ...prev,
                                            customFields: { ...prev.customFields, [field.id]: val }
                                        }));
                                        setIsDirty(true);
                                    }}
                                    options={field.options || []}
                                    placeholder="Select..."
                                    className="w-36 text-sm text-right"
                                />
                            </div>
                        )}

                        {/* Text Field */}
                        {field.type === 'text' && (
                            <div className="bg-surface-hover rounded-lg p-[3px] transition-all space-y-2">
                                <label className="text-sm font-medium text-content-secondary block pl-[5px]">{field.name}</label>
                                <input
                                    type="text"
                                    value={customFields[field.id] as string || ""}
                                    onChange={(e) => {
                                        setRoomDetails((prev: RoomDetails) => ({
                                            ...prev,
                                            customFields: { ...prev.customFields, [field.id]: e.target.value }
                                        }));
                                        setIsDirty(true);
                                    }}
                                    className="w-full rounded-md px-3 py-2 text-left text-sm form-input"
                                    placeholder={`Enter ${field.name.toLowerCase()}...`}
                                />
                            </div>
                        )}

                        {/* Text Block (Textarea) */}
                        {field.type === 'textarea' && (
                            <div className="bg-surface-input rounded-lg p-[3px] transition-all" style={{ border: '2px solid var(--form-border-subtle)' }}>
                                <label className="text-sm font-medium text-content-secondary block pl-[5px] pt-[2px] mb-[3px]">{field.name}</label>
                                <textarea
                                    value={customFields[field.id] as string || ""}
                                    onChange={(e) => {
                                        setRoomDetails((prev: RoomDetails) => ({
                                            ...prev,
                                            customFields: { ...prev.customFields, [field.id]: e.target.value }
                                        }));
                                        setIsDirty(true);
                                    }}
                                    className="w-full rounded-md px-3 py-2 text-left text-sm form-input min-h-[100px] resize-y"
                                    placeholder={`Enter ${field.name.toLowerCase()}...`}
                                />
                            </div>
                        )}

                        {/* Number Field */}
                        {field.type === 'number' && (
                            <div className="flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all">
                                <label className="text-sm font-medium text-content-secondary pl-[5px]">{field.name}</label>
                                <div className="relative w-32">
                                    <input
                                        type="number"
                                        value={customFields[field.id] as string || ""}
                                        onChange={(e) => {
                                            setRoomDetails((prev: RoomDetails) => ({
                                                ...prev,
                                                customFields: { ...prev.customFields, [field.id]: e.target.value }
                                            }));
                                            setIsDirty(true);
                                        }}
                                        className="w-full rounded-md px-2 pl-3 pr-8 py-1 text-sm text-left form-input [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="0"
                                    />
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = parseInt(customFields[field.id] as string) || 0;
                                                setRoomDetails((prev: RoomDetails) => ({
                                                    ...prev,
                                                    customFields: { ...prev.customFields, [field.id]: (current + 1).toString() }
                                                }));
                                                setIsDirty(true);
                                            }}
                                            className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"
                                        >
                                            <ChevronUp className="h-2 w-2" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = parseInt(customFields[field.id] as string) || 0;
                                                setRoomDetails((prev: RoomDetails) => ({
                                                    ...prev,
                                                    customFields: { ...prev.customFields, [field.id]: Math.max(0, current - 1).toString() }
                                                }));
                                                setIsDirty(true);
                                            }}
                                            className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"
                                        >
                                            <ChevronDown className="h-2 w-2" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Phone Field */}
                        {field.type === 'phone' && (
                            <div className="bg-surface-hover rounded-lg p-[3px] transition-all space-y-2">
                                <label className="text-sm font-medium text-content-secondary block pl-[5px]">{field.name}</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted" />
                                    <input
                                        type="tel"
                                        value={customFields[field.id] as string || ""}
                                        onChange={(e) => {
                                            const formatted = formatPhoneNumber(e.target.value);
                                            setRoomDetails((prev: RoomDetails) => ({
                                                ...prev,
                                                customFields: { ...prev.customFields, [field.id]: formatted }
                                            }));
                                            setIsDirty(true);
                                        }}
                                        className="w-full rounded-md pl-9 pr-3 py-2 text-left text-sm form-input"
                                        placeholder="(555) 555-5555"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Email Field */}
                        {field.type === 'email' && (
                            <div className={`bg-surface-hover rounded-lg p-[3px] transition-all space-y-2 ${invalidEmailFields.has(field.id) ? 'border border-red-500/50' : ''}`}>
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-content-secondary block pl-[5px]">{field.name}</label>
                                    {invalidEmailFields.has(field.id) && (
                                        <span className="text-[10px] text-red-400 font-medium px-1.5 py-0.5 bg-red-500/10 rounded">Invalid format</span>
                                    )}
                                </div>
                                <div className="relative">
                                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${invalidEmailFields.has(field.id) ? 'text-red-400' : 'text-content-muted'}`} />
                                    <input
                                        type="email"
                                        value={customFields[field.id] as string || ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setRoomDetails((prev: RoomDetails) => ({
                                                ...prev,
                                                customFields: { ...prev.customFields, [field.id]: val }
                                            }));
                                            setIsDirty(true);
                                            if (val && (!val.includes('@') || val.indexOf('.', val.indexOf('@')) === -1)) {
                                                setInvalidEmailFields(prev => new Set(prev).add(field.id));
                                            } else {
                                                setInvalidEmailFields(prev => {
                                                    const next = new Set(prev);
                                                    next.delete(field.id);
                                                    return next;
                                                });
                                            }
                                        }}
                                        className={`w-full rounded-md pl-9 pr-3 py-2 text-left text-sm focus:outline-none transition-colors ${invalidEmailFields.has(field.id)
                                            ? "bg-red-500/10 text-white placeholder-red-300/50 focus:bg-red-500/20"
                                            : "form-input"
                                            }`}
                                        placeholder="example@email.com"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Currency Field */}
                        {field.type === 'currency' && (
                            <div className="flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all">
                                <label className="text-sm font-medium text-content-secondary pl-[5px]">{field.name}</label>
                                <div className="relative w-32">
                                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${customFields[field.id] ? "text-content-secondary" : "text-content-muted"}`}>$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={customFields[field.id] as string || ""}
                                        onChange={(e) => {
                                            setRoomDetails((prev: RoomDetails) => ({
                                                ...prev,
                                                customFields: { ...prev.customFields, [field.id]: e.target.value }
                                            }));
                                            setIsDirty(true);
                                        }}
                                        className="w-full rounded-md px-2 pl-6 pr-8 py-1 text-sm text-left form-input [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="0.00"
                                    />
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = parseFloat(customFields[field.id] as string) || 0;
                                                setRoomDetails((prev: RoomDetails) => ({
                                                    ...prev,
                                                    customFields: { ...prev.customFields, [field.id]: (current + 1).toFixed(2) }
                                                }));
                                                setIsDirty(true);
                                            }}
                                            className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"
                                        >
                                            <ChevronUp className="h-2 w-2" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = parseFloat(customFields[field.id] as string) || 0;
                                                setRoomDetails((prev: RoomDetails) => ({
                                                    ...prev,
                                                    customFields: { ...prev.customFields, [field.id]: Math.max(0, current - 1).toFixed(2) }
                                                }));
                                                setIsDirty(true);
                                            }}
                                            className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"
                                        >
                                            <ChevronDown className="h-2 w-2" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Multi Select */}
                        {field.type === 'multi' && (
                            categoryFields.length === 1 ? (
                                <div className={`space-y-2 ${lighterCheckboxes ? "" : "max-h-64 overflow-y-auto pr-2"}`}>
                                    {field.options?.map((opt) => {
                                        const currentValues = (customFields[field.id] as string[]) || [];
                                        const isSelected = currentValues.includes(opt);
                                        return (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => {
                                                    const updated = isSelected
                                                        ? currentValues.filter(v => v !== opt)
                                                        : [...currentValues, opt];
                                                    setRoomDetails((prev: RoomDetails) => ({
                                                        ...prev,
                                                        customFields: { ...prev.customFields, [field.id]: updated }
                                                    }));
                                                    setIsDirty(true);
                                                }}
                                                className={`w-full flex items-center justify-between p-[3px] rounded-lg text-left transition-all ${isSelected
                                                    ? "text-content-primary"
                                                    : "text-content-secondary hover:text-content-primary hover:bg-surface-hover"
                                                    }`}
                                                style={isSelected ? { backgroundColor: 'var(--nav-active-bg)' } : undefined}
                                            >
                                                <span className="text-sm font-medium pl-[5px]">{opt}</span>
                                                {isSelected && (
                                                    <span className="flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center">
                                                        <Check className="h-2.5 w-2.5 text-white" />
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-surface-input rounded-lg p-[3px] space-y-2" style={{ border: '2px solid var(--form-border-subtle)' }}>
                                    <label className="text-sm font-medium text-content-secondary block pl-[5px] pt-[2px] pb-0">{field.name}</label>
                                    <div className={`space-y-2 ${lighterCheckboxes ? "" : "max-h-64 overflow-y-auto pr-2"}`}>
                                        {field.options?.map((opt) => {
                                            const currentValues = (customFields[field.id] as string[]) || [];
                                            const isSelected = currentValues.includes(opt);
                                            return (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = isSelected
                                                            ? currentValues.filter(v => v !== opt)
                                                            : [...currentValues, opt];
                                                        setRoomDetails((prev: RoomDetails) => ({
                                                            ...prev,
                                                            customFields: { ...prev.customFields, [field.id]: updated }
                                                        }));
                                                        setIsDirty(true);
                                                    }}
                                                    className={`w-full flex items-center justify-between p-[3px] rounded-lg text-left transition-all ${isSelected
                                                        ? "bg-surface-hover text-content-primary"
                                                        : "bg-surface-hover hover:bg-surface-input text-content-secondary"
                                                        }`}
                                                >
                                                    <span className="text-sm font-medium pl-[5px]">{opt}</span>
                                                    <div
                                                        className={`w-4 h-4 rounded flex items-center justify-center ${isSelected ? "border border-emerald-500 bg-emerald-500 text-white" : ""}`}
                                                        style={!isSelected ? { backgroundColor: 'var(--radio-indicator)' } : undefined}
                                                    >
                                                        {isSelected ? <Check className="h-3 w-3 text-white" /> : <X className="h-3 w-3 text-content-muted" />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}


