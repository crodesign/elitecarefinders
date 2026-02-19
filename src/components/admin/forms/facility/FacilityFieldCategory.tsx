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
        <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
                {category.icon && ICON_MAP[category.icon] && (() => { const CatIcon = ICON_MAP[category.icon!]; return <CatIcon className="h-4 w-4 text-accent" />; })()}
                {category.name}
            </h3>
            <div className="space-y-3">
                {categoryFields.map(field => (
                    <div key={field.id} className="space-y-1">
                        {field.type !== 'boolean' && field.type !== 'single' && field.type !== 'multi' && field.type !== 'dropdown' && field.type !== 'text' && field.type !== 'textarea' && field.type !== 'number' && field.type !== 'phone' && field.type !== 'email' && field.type !== 'currency' && (
                            <label className="text-sm font-medium text-white/80">{field.name}</label>
                        )}

                        {/* Boolean Field */}
                        {field.type === 'boolean' && (
                            <div className="bg-white/10 border border-white/10 rounded-lg p-3 flex items-center justify-between gap-3">
                                <span className="font-medium text-sm text-white/80">{field.name}</span>
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
                                    className={`h-8 px-3 rounded-full flex items-center gap-2 transition-all ${customFields[field.id] === true
                                        ? "bg-accent text-white shadow-lg shadow-accent/20"
                                        : customFields[field.id] === false
                                            ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                                            : "bg-black/20 text-zinc-500 hover:bg-black/40"
                                        }`}
                                >
                                    <span className="text-xs font-medium uppercase">
                                        {customFields[field.id] === true
                                            ? "Yes"
                                            : customFields[field.id] === false
                                                ? "No"
                                                : "Select"}
                                    </span>
                                    <div className={`p-0.5 rounded-full bg-white/20`}>
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
                            <div className="bg-white/10 border border-white/10 rounded-lg p-3 space-y-3">
                                <label className="text-sm font-medium text-white/80 block">{field.name}</label>
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
                                            className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${customFields[field.id] === opt
                                                ? "bg-black/20 border-transparent text-white"
                                                : "bg-black/20 border-transparent hover:bg-black/40 text-zinc-400"
                                                }`}
                                        >
                                            <span className="text-sm font-medium">{opt}</span>
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${customFields[field.id] === opt
                                                ? "border-accent bg-accent text-white"
                                                : "border-zinc-600 bg-transparent"
                                                }`}>
                                                {customFields[field.id] === opt && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Dropdown */}
                        {field.type === 'dropdown' && (
                            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 rounded-lg transition-all bg-white/10">
                                <span className="font-medium text-sm text-white/80">{field.name}</span>
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
                            <div className="bg-white/10 rounded-lg p-3 transition-all space-y-2">
                                <label className="text-sm font-medium text-white/80 block">{field.name}</label>
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
                                    className="w-full rounded-md px-3 py-2 text-left text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                    placeholder={`Enter ${field.name.toLowerCase()}...`}
                                />
                            </div>
                        )}

                        {/* Text Block (Textarea) */}
                        {field.type === 'textarea' && (
                            <div className="bg-white/10 rounded-lg p-3 transition-all space-y-2">
                                <label className="text-sm font-medium text-white/80 block">{field.name}</label>
                                <textarea
                                    value={customFields[field.id] as string || ""}
                                    onChange={(e) => {
                                        setRoomDetails((prev: RoomDetails) => ({
                                            ...prev,
                                            customFields: { ...prev.customFields, [field.id]: e.target.value }
                                        }));
                                        setIsDirty(true);
                                    }}
                                    className="w-full rounded-md px-3 py-2 text-left text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50 min-h-[100px] resize-y"
                                    placeholder={`Enter ${field.name.toLowerCase()}...`}
                                />
                            </div>
                        )}

                        {/* Number Field */}
                        {field.type === 'number' && (
                            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
                                <label className="text-sm font-medium text-white/80">{field.name}</label>
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
                                        className="w-full rounded-md px-2 pl-3 pr-8 py-1 text-sm text-left focus:outline-none transition-colors [&::-webkit-inner-spin-button]:appearance-none bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
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
                                            className="p-0.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
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
                                            className="p-0.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                                        >
                                            <ChevronDown className="h-2 w-2" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Phone Field */}
                        {field.type === 'phone' && (
                            <div className="bg-white/10 rounded-lg p-3 transition-all space-y-2">
                                <label className="text-sm font-medium text-white/80 block">{field.name}</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
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
                                        className="w-full rounded-md pl-9 pr-3 py-2 text-left text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                        placeholder="(555) 555-5555"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Email Field */}
                        {field.type === 'email' && (
                            <div className={`bg-white/10 rounded-lg p-3 transition-all space-y-2 ${invalidEmailFields.has(field.id) ? 'border border-red-500/50' : ''}`}>
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-white/80 block">{field.name}</label>
                                    {invalidEmailFields.has(field.id) && (
                                        <span className="text-[10px] text-red-400 font-medium px-1.5 py-0.5 bg-red-500/10 rounded">Invalid format</span>
                                    )}
                                </div>
                                <div className="relative">
                                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${invalidEmailFields.has(field.id) ? 'text-red-400' : 'text-zinc-500'}`} />
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
                                            : "bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                            }`}
                                        placeholder="example@email.com"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Currency Field */}
                        {field.type === 'currency' && (
                            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
                                <label className="text-sm font-medium text-white/80">{field.name}</label>
                                <div className="relative w-32">
                                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${customFields[field.id] ? "text-white/80" : "text-zinc-500"}`}>$</span>
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
                                        className="w-full rounded-md px-2 pl-6 pr-8 py-1 text-sm text-left focus:outline-none transition-colors [&::-webkit-inner-spin-button]:appearance-none bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
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
                                            className="p-0.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
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
                                            className="p-0.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                                        >
                                            <ChevronDown className="h-2 w-2" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Multi Select */}
                        {field.type === 'multi' && (
                            <div className="bg-white/10 border border-white/10 rounded-lg p-3 space-y-3">
                                <label className="text-sm font-medium text-white/80 block">{field.name}</label>
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
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
                                                className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${isSelected
                                                    ? `${lighterCheckboxes ? 'bg-white/10' : 'bg-black/20'} border-transparent text-white`
                                                    : `${lighterCheckboxes ? 'bg-white/10' : 'bg-black/20'} border-transparent ${lighterCheckboxes ? 'hover:bg-white/15' : 'hover:bg-black/40'} text-zinc-400`
                                                    }`}
                                            >
                                                <span className="text-sm font-medium">{opt}</span>
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected
                                                    ? "border-accent bg-accent text-white"
                                                    : "border-zinc-600 bg-transparent"
                                                    }`}>
                                                    {isSelected && <Check className="h-3 w-3 text-white" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
