"use client";
import { Dispatch, SetStateAction, useState, useRef } from "react";
import { Check, X, ChevronUp, ChevronDown, Phone, Mail, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { ICON_MAP } from "@/components/ui/IconPicker";
import { RoomFieldCategory, RoomFieldDefinition, RoomDetails } from "@/types";
import { SimpleSelect } from "../../SimpleSelect";
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatDateForHawaii, parseHawaiiDate } from "@/lib/hawaiiDate";

interface HomeFieldCategoryProps {
    category: RoomFieldCategory;
    roomDefinitions: RoomFieldDefinition[];
    roomDetails: RoomDetails;
    setRoomDetails: Dispatch<SetStateAction<RoomDetails>>;
    setIsDirty: (value: boolean) => void;
    invalidEmailFields: Set<string>;
    setInvalidEmailFields: Dispatch<SetStateAction<Set<string>>>;
    lighterCheckboxes?: boolean;
}

export function HomeFieldCategory({
    category,
    roomDefinitions,
    roomDetails,
    setRoomDetails,
    setIsDirty,
    invalidEmailFields,
    setInvalidEmailFields,
    lighterCheckboxes = false
}: HomeFieldCategoryProps) {
    const categoryFields = roomDefinitions.filter(f =>
        f.categoryId === category.id &&
        f.isActive &&
        (f.targetType === 'home' || f.targetType === 'both' || !f.targetType)
    );

    const [dateCalendarMonth, setDateCalendarMonth] = useState<Record<string, Date>>({});
    const dateCalendarCloseRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => (currentYear - i).toString());

    const getCalendarMonth = (fieldId: string) => {
        if (dateCalendarMonth[fieldId]) return dateCalendarMonth[fieldId];
        const val = roomDetails.customFields[fieldId] as string;
        return val ? (parseHawaiiDate(val) || new Date()) : new Date();
    };

    if (categoryFields.length === 0) return null;

    const formatPhoneNumber = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length === 0) return '';
        if (numbers.length <= 3) return `(${numbers}`;
        if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
        return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
    };

    return (
        <div className="bg-surface-input rounded-lg p-[5px]">
            <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
                {category.icon && ICON_MAP[category.icon] && (() => { const CatIcon = ICON_MAP[category.icon!]; return <CatIcon className="h-4 w-4 text-accent" />; })()}
                <span className="lg:hidden">{category.name.replace("Management", "Mgmt")}</span>
                <span className="hidden lg:inline">{category.name}</span>
            </h3>
            <div className="space-y-2">
                {categoryFields.map(field => (
                    <div key={field.id} className="space-y-1">
                        {field.type !== 'boolean' && field.type !== 'single' && field.type !== 'multi' && field.type !== 'dropdown' && field.type !== 'text' && field.type !== 'textarea' && field.type !== 'number' && field.type !== 'phone' && field.type !== 'email' && field.type !== 'currency' && field.type !== 'date' && (
                            <label className="text-sm font-medium text-content-secondary pl-[5px]">{field.name}</label>
                        )}

                        {/* Boolean Field */}
                        {field.type === 'boolean' && (
                            <div className="bg-surface-hover rounded-lg p-[3px] flex items-center justify-between gap-3">
                                <span className="font-medium text-sm text-content-secondary pl-[5px]">{field.name}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const current = roomDetails.customFields[field.id];
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
                                    className={`h-8 px-3 rounded-md flex items-center gap-2 transition-all ${roomDetails.customFields[field.id] === true
                                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                        : roomDetails.customFields[field.id] === false
                                            ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                                            : "bg-surface-input text-content-muted hover:bg-surface-hover"
                                        }`}
                                >
                                    <span className="text-xs font-medium uppercase">
                                        {roomDetails.customFields[field.id] === true
                                            ? "Yes"
                                            : roomDetails.customFields[field.id] === false
                                                ? "No"
                                                : "Select"}
                                    </span>
                                    <div
                                        className="p-0.5 rounded-full"
                                        style={{ backgroundColor: roomDetails.customFields[field.id] !== undefined ? 'rgba(255,255,255,0.20)' : 'var(--form-border)' }}
                                    >
                                        {roomDetails.customFields[field.id] === true ? (
                                            <Check className="h-3 w-3" />
                                        ) : roomDetails.customFields[field.id] === false ? (
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
                                <div className={`space-y-2 ${lighterCheckboxes ? "" : "max-h-64 overflow-y-auto pr-2"}`}>
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
                                                return { ...prev, customFields: newCustomFields };
                                            })}
                                            className={`w-full flex items-center justify-between p-[3px] rounded-lg text-left transition-all ${roomDetails.customFields[field.id] === opt
                                                ? "bg-surface-hover text-content-primary"
                                                : "bg-surface-hover hover:bg-surface-input text-content-secondary"
                                                }`}
                                        >
                                            <span className="text-sm font-medium pl-[5px]">{opt}</span>
                                            <div
                                                className={`w-4 h-4 rounded-full flex items-center justify-center ${roomDetails.customFields[field.id] === opt ? "border border-emerald-500 bg-emerald-500 text-white" : ""}`}
                                                style={roomDetails.customFields[field.id] !== opt ? { backgroundColor: 'var(--radio-indicator)' } : undefined}
                                            >
                                                {roomDetails.customFields[field.id] === opt
                                                    ? <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                    : <X className="h-2.5 w-2.5 text-content-muted" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {field.type === 'dropdown' && (
                            <div className="flex items-center justify-between gap-2 p-[3px] rounded-lg transition-all bg-surface-hover">
                                <span className="font-medium text-sm text-content-secondary pl-[5px]">{field.name}</span>
                                <SimpleSelect
                                    value={roomDetails.customFields[field.id] as string || ""}
                                    onChange={(val) => {
                                        setIsDirty(true);
                                        setRoomDetails((prev: RoomDetails) => ({
                                            ...prev,
                                            customFields: { ...prev.customFields, [field.id]: val }
                                        }));
                                    }}
                                    options={field.options || []}
                                    placeholder="Select..."
                                    className="w-36 text-sm text-right"
                                />
                            </div>
                        )}

                        {/* Text Field */}
                        {field.type === 'text' && (
                            <div className="flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all">
                                <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">{field.name}</label>
                                <input
                                    type="text"
                                    value={roomDetails.customFields[field.id] as string || ""}
                                    onChange={(e) => {
                                        setIsDirty(true);
                                        setRoomDetails((prev: RoomDetails) => ({
                                            ...prev,
                                            customFields: { ...prev.customFields, [field.id]: e.target.value }
                                        }));
                                    }}
                                    className="w-40 rounded-md px-3 py-1 text-left text-sm form-input"
                                    placeholder={`Enter...`}
                                />
                            </div>
                        )}

                        {/* Text Block (Textarea) */}
                        {field.type === 'textarea' && (
                            <div className="bg-surface-input rounded-lg p-[3px] transition-all" style={{ border: '2px solid var(--form-border-subtle)' }}>
                                <label className="text-sm font-medium text-content-secondary block pl-[5px] pt-[2px] mb-[3px]">{field.name}</label>
                                <textarea
                                    value={roomDetails.customFields[field.id] as string || ""}
                                    onChange={(e) => {
                                        setIsDirty(true);
                                        setRoomDetails((prev: RoomDetails) => ({
                                            ...prev,
                                            customFields: { ...prev.customFields, [field.id]: e.target.value }
                                        }));
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
                                        value={roomDetails.customFields[field.id] as string || ""}
                                        onChange={(e) => {
                                            setIsDirty(true);
                                            setRoomDetails((prev: RoomDetails) => ({
                                                ...prev,
                                                customFields: { ...prev.customFields, [field.id]: e.target.value }
                                            }));
                                        }}
                                        className="w-full rounded-md px-2 pl-3 pr-8 py-1 text-sm text-left form-input [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="0"
                                    />
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = parseInt(roomDetails.customFields[field.id] as string) || 0;
                                                setIsDirty(true);
                                                setRoomDetails((prev: RoomDetails) => ({
                                                    ...prev,
                                                    customFields: { ...prev.customFields, [field.id]: (current + 1).toString() }
                                                }));
                                            }}
                                            className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"
                                        >
                                            <ChevronUp className="h-2 w-2" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = parseInt(roomDetails.customFields[field.id] as string) || 0;
                                                setIsDirty(true);
                                                setRoomDetails((prev: RoomDetails) => ({
                                                    ...prev,
                                                    customFields: { ...prev.customFields, [field.id]: Math.max(0, current - 1).toString() }
                                                }));
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
                            <div className="flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all">
                                <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">{field.name}</label>
                                <div className="relative w-40">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted" />
                                    <input
                                        type="tel"
                                        value={roomDetails.customFields[field.id] as string || ""}
                                        onChange={(e) => {
                                            const formatted = formatPhoneNumber(e.target.value);
                                            setRoomDetails((prev: RoomDetails) => ({
                                                ...prev,
                                                customFields: { ...prev.customFields, [field.id]: formatted }
                                            }));
                                        }}
                                        className="w-full rounded-md pl-9 pr-3 py-1 text-left text-sm form-input"
                                        placeholder="(555) 555-5555"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Email Field */}
                        {field.type === 'email' && (
                            <div className={`flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all ${invalidEmailFields.has(field.id) ? 'border border-red-500/50' : ''}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                    <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">{field.name}</label>
                                    {invalidEmailFields.has(field.id) && (
                                        <span className="text-[10px] text-red-400 font-medium px-1.5 py-0.5 bg-red-500/10 rounded">Invalid</span>
                                    )}
                                </div>
                                <div className="relative w-40">
                                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${invalidEmailFields.has(field.id) ? 'text-red-400' : 'text-content-muted'}`} />
                                    <input
                                        type="email"
                                        value={roomDetails.customFields[field.id] as string || ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setRoomDetails((prev: RoomDetails) => ({
                                                ...prev,
                                                customFields: { ...prev.customFields, [field.id]: val }
                                            }));

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
                                        className={`w-full rounded-md pl-9 pr-3 py-1 text-left text-sm focus:outline-none transition-colors ${invalidEmailFields.has(field.id)
                                            ? "bg-red-500/10 text-white placeholder-red-300/50 focus:bg-red-500/20"
                                            : "form-input"
                                            }`}
                                        placeholder="example@email.com"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Date Field */}
                        {field.type === 'date' && (
                            <div className="flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all">
                                <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">{field.name}</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className={cn(
                                                "form-input flex items-center justify-start text-left font-normal px-3 py-1.5 text-sm w-40 h-8",
                                                !roomDetails.customFields[field.id] && "text-content-muted"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {roomDetails.customFields[field.id]
                                                ? (parseHawaiiDate(roomDetails.customFields[field.id] as string)
                                                    ? format(parseHawaiiDate(roomDetails.customFields[field.id] as string)!, "MMM d, yyyy")
                                                    : "Invalid date")
                                                : "Pick a date"}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-auto p-0 bg-surface-secondary border-ui-border text-content-primary z-[200] [&_.rdp-caption_dropdowns]:!hidden [&_.rdp-caption_label]:!hidden [&_.rdp-nav]:!hidden [&_.rdp-dropdown]:!hidden [&_.rdp-head_cell]:text-content-muted"
                                        align="start"
                                    >
                                        <PopoverClose ref={(el) => { dateCalendarCloseRefs.current[field.id] = el; }} className="hidden" />
                                        <div className="p-3 pb-1 space-y-2">
                                            <div className="flex justify-end">
                                                <PopoverClose asChild>
                                                    <button
                                                        type="button"
                                                        className="p-1 rounded-md hover:bg-surface-hover text-content-muted hover:text-content-primary transition-colors"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </PopoverClose>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const prev = new Date(getCalendarMonth(field.id));
                                                        prev.setMonth(prev.getMonth() - 1);
                                                        setDateCalendarMonth(p => ({ ...p, [field.id]: prev }));
                                                    }}
                                                    className="h-7 w-7 rounded-md inline-flex items-center justify-center transition-colors hover:bg-surface-hover text-content-primary"
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </button>
                                                <div className="flex gap-1.5 flex-1 justify-center">
                                                    <SimpleSelect
                                                        value={monthNames[getCalendarMonth(field.id).getMonth()]}
                                                        onChange={(val: string) => {
                                                            const idx = monthNames.indexOf(val);
                                                            if (idx >= 0) {
                                                                const updated = new Date(getCalendarMonth(field.id));
                                                                updated.setMonth(idx);
                                                                setDateCalendarMonth(p => ({ ...p, [field.id]: updated }));
                                                            }
                                                        }}
                                                        options={monthNames}
                                                        placeholder="Month"
                                                        className="w-[110px]"
                                                        textSize="text-xs"
                                                    />
                                                    <SimpleSelect
                                                        value={getCalendarMonth(field.id).getFullYear().toString()}
                                                        onChange={(val: string) => {
                                                            const updated = new Date(getCalendarMonth(field.id));
                                                            updated.setFullYear(parseInt(val));
                                                            setDateCalendarMonth(p => ({ ...p, [field.id]: updated }));
                                                        }}
                                                        options={yearOptions}
                                                        placeholder="Year"
                                                        className="w-[70px]"
                                                        textSize="text-xs"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const next = new Date(getCalendarMonth(field.id));
                                                        next.setMonth(next.getMonth() + 1);
                                                        setDateCalendarMonth(p => ({ ...p, [field.id]: next }));
                                                    }}
                                                    className="h-7 w-7 rounded-md inline-flex items-center justify-center transition-colors hover:bg-surface-hover text-content-primary"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <Calendar
                                            mode="single"
                                            month={getCalendarMonth(field.id)}
                                            onMonthChange={(month) => setDateCalendarMonth(p => ({ ...p, [field.id]: month }))}
                                            selected={parseHawaiiDate(roomDetails.customFields[field.id] as string) || undefined}
                                            onSelect={(date) => {
                                                setIsDirty(true);
                                                setRoomDetails((prev: RoomDetails) => ({
                                                    ...prev,
                                                    customFields: { ...prev.customFields, [field.id]: date ? formatDateForHawaii(date) : '' }
                                                }));
                                                if (date) dateCalendarCloseRefs.current[field.id]?.click();
                                            }}
                                            className="p-3 pt-0 pointer-events-auto"
                                            classNames={{
                                                caption: "!hidden",
                                                caption_label: "!hidden",
                                                caption_dropdowns: "!hidden",
                                                dropdown_month: "!hidden",
                                                dropdown_year: "!hidden",
                                                nav: "!hidden",
                                                day_selected: "bg-accent text-white hover:bg-accent focus:bg-accent focus:text-white",
                                                day_today: "bg-surface-hover text-content-primary",
                                                day_outside: "text-content-muted opacity-50",
                                                day_disabled: "text-content-muted opacity-30",
                                                day: cn("h-9 w-9 p-0 font-normal text-content-secondary aria-selected:opacity-100 hover:bg-surface-hover hover:text-content-primary rounded-md transition-colors"),
                                                head_cell: "text-content-muted rounded-md w-9 font-normal text-[0.8rem] text-center",
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}

                        {/* Currency Field */}
                        {field.type === 'currency' && (
                            <div className="flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all">
                                <label className="text-sm font-medium text-content-secondary pl-[5px]">{field.name}</label>
                                <div className="relative w-32">
                                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${roomDetails.customFields[field.id] ? "text-content-secondary" : "text-content-muted"}`}>$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={roomDetails.customFields[field.id] as string || ""}
                                        onChange={(e) => setRoomDetails((prev: RoomDetails) => ({
                                            ...prev,
                                            customFields: { ...prev.customFields, [field.id]: e.target.value }
                                        }))}
                                        className="w-full rounded-md px-2 pl-6 pr-8 py-1 text-sm text-left form-input [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="0.00"
                                    />
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = parseFloat(roomDetails.customFields[field.id] as string) || 0;
                                                setRoomDetails((prev: RoomDetails) => ({
                                                    ...prev,
                                                    customFields: { ...prev.customFields, [field.id]: (current + 1).toFixed(2) }
                                                }));
                                            }}
                                            className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"
                                        >
                                            <ChevronUp className="h-2 w-2" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = parseFloat(roomDetails.customFields[field.id] as string) || 0;
                                                setRoomDetails((prev: RoomDetails) => ({
                                                    ...prev,
                                                    customFields: { ...prev.customFields, [field.id]: Math.max(0, current - 1).toFixed(2) }
                                                }));
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
                                lighterCheckboxes ? (
                                    <div className="space-y-2">
                                        {field.options?.map((opt) => {
                                            const currentValues = (roomDetails.customFields[field.id] as string[]) || [];
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
                                ) : (
                                    <div className="bg-surface-input rounded-lg p-[3px] space-y-2" style={{ border: '2px solid var(--form-border-subtle)' }}>
                                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                            {field.options?.map((opt) => {
                                                const currentValues = (roomDetails.customFields[field.id] as string[]) || [];
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
                            ) : (
                                <div className="bg-surface-input rounded-lg p-[3px] space-y-2" style={{ border: '2px solid var(--form-border-subtle)' }}>
                                    <label className="text-sm font-medium text-content-secondary block pl-[5px] pt-[2px] pb-0">{field.name}</label>
                                    <div className={`space-y-2 ${lighterCheckboxes ? "" : "max-h-64 overflow-y-auto pr-2"}`}>
                                        {field.options?.map((opt) => {
                                            const currentValues = (roomDetails.customFields[field.id] as string[]) || [];
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
