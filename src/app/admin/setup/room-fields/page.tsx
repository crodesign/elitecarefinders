"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Bed, GripVertical, Pencil, Trash2, X, Check, ChevronDown, ChevronRight, Home, Building2, Layers, ToggleLeft, CircleDot, CheckSquare, Type, List, ChevronsUp, ChevronsDown, AlignLeft, Hash, Phone, Mail, DollarSign, Eye, EyeOff, CalendarIcon } from "lucide-react";
import { HeartLoader } from "@/components/ui/HeartLoader";
import type { RoomFieldCategory, RoomFieldDefinition, RoomFixedFieldOption, FixedFieldType, Taxonomy } from "@/types";
import {
    getRoomFieldCategories,
    createRoomFieldCategory,
    updateRoomFieldCategory,
    deleteRoomFieldCategory,
    getRoomFieldDefinitions,
    createRoomFieldDefinition,
    updateRoomFieldDefinition,
    deleteRoomFieldDefinition,
    toggleRoomFieldPublic,
    getFixedFieldOptions,
    createFixedFieldOption,
    updateFixedFieldOption,
    deleteFixedFieldOption,
    reorderFixedFieldOptions,
    reorderRoomFieldCategories,
    getFixedFieldTypeIcons,
    updateFixedFieldTypeIcon,
} from "@/lib/services/roomFieldService";
import { useNotification } from "@/contexts/NotificationContext";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { reorderRoomFields } from "@/lib/services/roomFieldService";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { IconPicker, ICON_MAP } from "@/components/ui/IconPicker";

const FIXED_FIELD_TYPES: { type: FixedFieldType; label: string }[] = [
    { type: "bedroom", label: "Bedroom Types" },
    { type: "bathroom", label: "Bathroom Types" },
    { type: "shower", label: "Shower Types" },
    { type: "roomType", label: "Room Types (Facilities Only)" },
    { type: "levelOfCare", label: "Levels of Care (Facilities Only)" },
    { type: "language", label: "Languages Spoken" },
];

function SortableFieldItem({
    field,
    editingFieldId,
    startEditingField,
    handleDeleteField,
    handleTogglePublic,
    editFieldName,
    setEditFieldName,
    editFieldType,
    setEditFieldType,
    editFieldTarget,
    setEditFieldTarget,
    editFieldOptions,
    setEditFieldOptions,
    handleSaveEditField,
    cancelEditField,
}: {
    field: RoomFieldDefinition;
    editingFieldId: string | null;
    startEditingField: (field: RoomFieldDefinition) => void;
    handleDeleteField: (id: string) => void;
    handleTogglePublic: (id: string, isPublic: boolean) => void;
    editFieldName: string;
    setEditFieldName: (val: string) => void;
    editFieldType: "boolean" | "single" | "multi" | "text" | "textarea" | "number" | "currency" | "phone" | "email" | "date" | "dropdown";
    setEditFieldType: (val: "boolean" | "single" | "multi" | "text" | "textarea" | "number" | "currency" | "phone" | "email" | "date" | "dropdown") => void;
    editFieldTarget: 'home' | 'facility' | 'both';
    setEditFieldTarget: (val: 'home' | 'facility' | 'both') => void;
    editFieldOptions: string[];
    setEditFieldOptions: (val: string[]) => void;
    handleSaveEditField: () => void;
    cancelEditField: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: field.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    if (editingFieldId === field.id) {
        return (
            <div ref={setNodeRef} style={{ ...style, border: '2px solid var(--form-border)' }} className="p-[3px] bg-accent/10 rounded-lg space-y-3 cursor-default">
                {/* Inline Edit Form - Note: Dragging disabled while editing */}
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={editFieldName}
                        onChange={(e) => setEditFieldName(e.target.value)}
                        placeholder="Field name..."
                        className="form-input flex-1 rounded px-3 py-2 text-sm focus:border-accent"
                        autoFocus
                    />
                    <div className="flex bg-surface-input rounded p-1 gap-1">
                        <button
                            onClick={() => setEditFieldType("boolean")}
                            className={`p-1.5 rounded transition-colors ${editFieldType === "boolean" ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                        >
                            <ToggleLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setEditFieldType("single")}
                            className={`p-1.5 rounded transition-colors ${editFieldType === "single" ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                        >
                            <CircleDot className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setEditFieldType("multi")}
                            className={`p-1.5 rounded transition-colors ${editFieldType === "multi" ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                        >
                            <CheckSquare className="h-4 w-4" />
                        </button>
                        <div className="relative">
                            <FieldTypeSelector value={editFieldType} onChange={(val) => setEditFieldType(val as any)} />
                        </div>
                        <button
                            onClick={() => setEditFieldType("dropdown")}
                            className={`p-1.5 rounded transition-colors ${editFieldType === "dropdown" ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="flex bg-surface-input rounded p-1 gap-1">
                        <button
                            onClick={() => setEditFieldTarget('home')}
                            className={`p-1.5 rounded transition-colors ${editFieldTarget === 'home' ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                        >
                            <Home className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setEditFieldTarget('facility')}
                            className={`p-1.5 rounded transition-colors ${editFieldTarget === 'facility' ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                        >
                            <Building2 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setEditFieldTarget('both')}
                            className={`p-1.5 rounded transition-colors ${editFieldTarget === 'both' ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                        >
                            <Layers className="h-4 w-4" />
                        </button>
                    </div>

                    <button
                        onClick={handleSaveEditField}
                        disabled={!editFieldName.trim()}
                        className="p-1.5 bg-accent text-white rounded hover:bg-accent-light disabled:opacity-50"
                    >
                        <Check className="h-4 w-4" />
                    </button>
                    <button
                        onClick={cancelEditField}
                        className="p-1.5 text-content-muted hover:text-content-primary bg-surface-input rounded hover:bg-surface-hover"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {["single", "multi", "dropdown"].includes(editFieldType) && (
                    <div className="space-y-2">
                        <label className="text-xs text-content-muted">Options (one per line)</label>
                        <textarea
                            value={editFieldOptions.join("\n")}
                            onChange={(e) => setEditFieldOptions(e.target.value.split("\n"))}
                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                            className="form-input w-full rounded px-3 py-2 text-sm focus:border-accent resize-none"
                            rows={3}
                        />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-3 py-2 px-3 bg-black/20 rounded group">
            <div {...attributes} {...listeners} className="cursor-grab hover:text-content-primary text-content-muted">
                <GripVertical className="h-4 w-4" />
            </div>
            {field.type === "boolean" && <ToggleLeft className="h-4 w-4 text-white" />}
            {field.type === "single" && <CircleDot className="h-4 w-4 text-white" />}
            {field.type === "multi" && <CheckSquare className="h-4 w-4 text-white" />}
            {field.type === "text" && <Type className="h-4 w-4 text-white" />}
            {field.type === "textarea" && <AlignLeft className="h-4 w-4 text-white" />}
            {field.type === "number" && <Hash className="h-4 w-4 text-white" />}
            {field.type === "phone" && <Phone className="h-4 w-4 text-white" />}
            {field.type === "email" && <Mail className="h-4 w-4 text-white" />}
            {field.type === "date" && <CalendarIcon className="h-4 w-4 text-white" />}
            {field.type === "currency" && <DollarSign className="h-4 w-4 text-white" />}
            {field.type === "dropdown" && <List className="h-4 w-4 text-white" />}
            <span className="flex-1 text-sm text-content-secondary">{field.name}</span>

            <span className="px-2 py-0.5 rounded text-xs flex items-center gap-1 bg-zinc-500/20 text-content-muted">
                {field.targetType === 'home' && <Home className="h-3 w-3" />}
                {field.targetType === 'facility' && <Building2 className="h-3 w-3" />}
                {field.targetType === 'both' && <Layers className="h-3 w-3" />}
                <span className="capitalize">{field.targetType || 'both'}</span>
            </span>
            <button
                onClick={() => handleTogglePublic(field.id, !field.isPublic)}
                className={`p-1 transition-colors ${field.isPublic ? "text-content-secondary hover:text-content-primary" : "text-content-muted hover:text-content-secondary"}`}
            >
                {field.isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button
                onClick={() => startEditingField(field)}
                className="p-1 text-content-muted hover:text-content-primary transition-opacity"
            >
                <Pencil className="h-4 w-4" />
            </button>
            <button
                onClick={() => handleDeleteField(field.id)}
                className="p-1 text-content-muted hover:text-red-400 transition-opacity"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}


function SortableFixedOptionItem({
    option,
    editingId,
    editValue,
    setEditValue,
    startEditing,
    cancelEditing,
    saveEditing,
    deleteOption
}: {
    option: RoomFixedFieldOption;
    editingId: string | null;
    editValue: string;
    setEditValue: (val: string) => void;
    startEditing: (id: string, currentVal: string) => void;
    cancelEditing: () => void;
    saveEditing: () => void;
    deleteOption: (id: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: option.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    if (editingId === option.id) {
        return (
            <div ref={setNodeRef} style={{ ...style, border: '2px solid var(--form-border)' }} className="p-[3px] bg-accent/10 rounded-lg flex items-center gap-3 cursor-default">
                <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditing();
                        if (e.key === "Escape") cancelEditing();
                    }}
                    className="form-input flex-1 rounded px-2 py-1 text-sm focus:border-accent"
                    autoFocus
                />
                <button
                    onClick={saveEditing}
                    disabled={!editValue.trim()}
                    className="p-1.5 bg-accent text-white rounded hover:bg-accent-light disabled:opacity-50"
                >
                    <Check className="h-4 w-4" />
                </button>
                <button
                    onClick={cancelEditing}
                    className="p-1.5 text-content-muted hover:text-content-primary bg-surface-input rounded hover:bg-surface-hover"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-3 py-2 px-3 bg-black/20 rounded group border border-ui-border hover:border-ui-border transition-colors mb-2 last:mb-0">
            <div {...attributes} {...listeners} className="cursor-grab hover:text-content-primary text-content-muted">
                <GripVertical className="h-4 w-4" />
            </div>
            <span className="flex-1 text-sm text-content-secondary">{option.value}</span>
            <button
                onClick={() => startEditing(option.id, option.value)}
                className="p-1 text-content-muted hover:text-content-primary transition-opacity"
            >
                <Pencil className="h-3 w-3" />
            </button>
            <button
                onClick={() => deleteOption(option.id)}
                className="p-1 text-content-muted hover:text-red-400 transition-opacity"
            >
                <Trash2 className="h-3 w-3" />
            </button>
        </div>
    );
}

function SortableCategoryItem({
    category,
    isExpanded,
    toggleCategory,
    editingCategory,
    setEditingCategory,
    editCategoryName,
    setEditCategoryName,
    handleUpdateCategory,
    editCategorySection,
    setEditCategorySection,
    editCategoryColumn,
    setEditCategoryColumn,
    editCategoryPublicColumn,
    setEditCategoryPublicColumn,
    editCategoryIcon,
    setEditCategoryIcon,
    handleDeleteCategory,
    setAddingFieldToCategory,
    setExpandedCategories,
    children
}: {
    category: RoomFieldCategory;
    isExpanded: boolean;
    toggleCategory: (id: string) => void;
    editingCategory: string | null;
    setEditingCategory: (id: string | null) => void;
    editCategoryName: string;
    setEditCategoryName: (val: string) => void;
    handleUpdateCategory: (id: string) => void;
    editCategorySection: 'room_details' | 'location_details' | 'care_provider_details';
    setEditCategorySection: (val: 'room_details' | 'location_details' | 'care_provider_details') => void;
    editCategoryColumn: number;
    setEditCategoryColumn: (val: number) => void;
    editCategoryPublicColumn: number | null;
    setEditCategoryPublicColumn: (val: number | null) => void;
    editCategoryIcon: string | undefined;
    setEditCategoryIcon: (val: string | undefined) => void;
    handleDeleteCategory: (id: string) => void;
    setAddingFieldToCategory: (id: string) => void;
    setExpandedCategories: (val: (prev: Set<string>) => Set<string>) => void;
    children: React.ReactNode;
    style?: React.CSSProperties;
}) {
    const props = arguments[0];
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: category.id });

    const style = {
        ...props.style,
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 500 : (props.style?.zIndex ?? 'auto'),
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={{ ...style, border: '2px solid var(--form-border)', backgroundColor: 'var(--form-bg)' }} className="rounded-lg mb-3">
            {/* Category Header */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-t-lg" style={{ backgroundColor: 'var(--form-hover)' }}>
                <div {...attributes} {...listeners} className="cursor-grab hover:text-content-primary text-content-muted">
                    <GripVertical className="h-4 w-4" />
                </div>
                <button
                    onClick={() => toggleCategory(category.id)}
                    className="p-1 text-content-muted hover:text-content-primary"
                >
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                </button>

                {editingCategory === category.id ? (
                    <div className="flex items-center gap-2 flex-1">
                        <IconPicker value={editCategoryIcon} onChange={setEditCategoryIcon} />
                        <input
                            type="text"
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdateCategory(category.id);
                                if (e.key === "Escape") setEditingCategory(null);
                            }}
                            className="form-input flex-1 rounded px-2 py-1 text-sm focus:border-accent"
                            autoFocus
                        />
                        <div className="flex bg-surface-input rounded p-1 gap-1">
                            <button
                                onClick={() => setEditCategorySection('room_details')}
                                className={`px-2 py-1 rounded text-xs transition-colors ${editCategorySection === 'room_details' ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                            >
                                Room
                            </button>
                            <button
                                onClick={() => setEditCategorySection('location_details')}
                                className={`px-2 py-1 rounded text-xs transition-colors ${editCategorySection === 'location_details' ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                            >
                                Location
                            </button>
                            <button
                                onClick={() => setEditCategorySection('care_provider_details')}
                                className={`px-2 py-1 rounded text-xs transition-colors ${editCategorySection === 'care_provider_details' ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                            >
                                Provider
                            </button>
                        </div>
                        <div className="flex bg-surface-input rounded p-1 gap-1">
                            <span className="px-1 text-[10px] text-content-muted self-center uppercase tracking-wider">Admin</span>
                            {[1, 2, 3].map((col) => (
                                <button
                                    key={col}
                                    onClick={() => setEditCategoryColumn(col)}
                                    className={`px-2 py-1 rounded text-xs transition-colors ${editCategoryColumn === col ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                                >
                                    {col}
                                </button>
                            ))}
                        </div>
                        <div className="flex bg-surface-input rounded p-1 gap-1">
                            <span className="px-1 text-[10px] text-content-muted self-center uppercase tracking-wider">Public</span>
                            <button
                                onClick={() => setEditCategoryPublicColumn(null)}
                                className={`px-2 py-1 rounded text-xs transition-colors ${editCategoryPublicColumn === null ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                            >
                                –
                            </button>
                            {[1, 2, 3].map((col) => (
                                <button
                                    key={col}
                                    onClick={() => setEditCategoryPublicColumn(col)}
                                    className={`px-2 py-1 rounded text-xs transition-colors ${editCategoryPublicColumn === col ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                                >
                                    {col}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => handleUpdateCategory(category.id)}
                            className="p-1.5 bg-accent text-white rounded hover:bg-accent-light"
                        >
                            <Check className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setEditingCategory(null)}
                            className="p-1.5 text-content-muted hover:text-content-primary bg-surface-input rounded hover:bg-surface-hover"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <>
                        {category.icon && ICON_MAP[category.icon] && (() => { const CatIcon = ICON_MAP[category.icon!]; return <CatIcon className="h-4 w-4 text-accent shrink-0" />; })()}
                        <span className="flex-1 font-medium text-content-primary">{category.name}</span>
                        {category.section && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-surface-hover/50 text-content-muted uppercase tracking-wider">
                                {category.section.replace('_', ' ')}
                            </span>
                        )}
                        {category.columnNumber && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-surface-hover/50 text-content-muted uppercase tracking-wider">
                                Col {category.columnNumber}
                            </span>
                        )}
                        {category.publicColumnNumber != null && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-accent/20 text-accent uppercase tracking-wider">
                                Pub {category.publicColumnNumber}
                            </span>
                        )}
                        <button
                            onClick={() => {
                                setEditingCategory(category.id);
                                setEditCategoryName(category.name);
                                setEditCategorySection(category.section);
                                setEditCategoryColumn(category.columnNumber);
                                setEditCategoryPublicColumn(category.publicColumnNumber ?? null);
                                setEditCategoryIcon(category.icon);
                            }}
                            className="p-1 text-content-muted hover:text-white"
                        >
                            <Pencil className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="p-1 text-content-muted hover:text-red-400"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => {
                                setAddingFieldToCategory(category.id);
                                setExpandedCategories(prev => new Set([...Array.from(prev), category.id]));
                            }}
                            className="p-1 text-accent hover:text-accent-light"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </>
                )}
            </div>

            {/* Category Fields */}
            {isExpanded && (
                <div className="px-4 py-3 space-y-2">
                    {children}
                </div>
            )}
        </div>
    );
}

interface TaxonomyWithEntries extends Taxonomy {
    entries: any[];
}

function FieldTypeSelector({ value, onChange }: { value: string, onChange: (val: string) => void }) {
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

    const isActive = ['text', 'textarea', 'number', 'currency', 'phone', 'email', 'date'].includes(value);

    const options = [
        { id: 'text', label: 'Text', icon: Type },
        { id: 'textarea', label: 'Text Block', icon: AlignLeft },
        { id: 'number', label: 'Number', icon: Hash },
        { id: 'currency', label: 'Currency', icon: DollarSign },
        { id: 'phone', label: 'Phone', icon: Phone },
        { id: 'email', label: 'Email', icon: Mail },
        { id: 'date', label: 'Date', icon: CalendarIcon },
    ];

    const currentOption = options.find(o => o.id === value) || options[0];
    const Icon = currentOption.icon;

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-center p-1.5 rounded transition-colors ${isActive ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"
                    }`}
            >
                <Icon className="h-4 w-4" />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 bg-[#111111] border border-ui-border rounded-lg shadow-xl overflow-hidden z-50 p-1 min-w-[32px]">
                    {options.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                                onChange(opt.id);
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center justify-center p-1.5 mb-1 last:mb-0 rounded transition-colors ${value === opt.id
                                ? "bg-accent text-white"
                                : "text-content-muted hover:bg-surface-input hover:text-white"
                                }`}
                        >
                            <opt.icon className="h-4 w-4" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function RoomFieldsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isInitialLoad = useRef(true);

    // Fixed field options state
    const [addingToFixedField, setAddingToFixedField] = useState<FixedFieldType | null>(null);
    const [newFixedValue, setNewFixedValue] = useState("");
    const [editingFixedOption, setEditingFixedOption] = useState<string | null>(null);
    const [editFixedValue, setEditFixedValue] = useState("");
    const [editFixedIcon, setEditFixedIcon] = useState<string | undefined>(undefined);
    const [newFixedIcon, setNewFixedIcon] = useState<string | undefined>(undefined);

    // Data state
    const [categories, setCategories] = useState<RoomFieldCategory[]>([]);
    const [fieldDefinitions, setFieldDefinitions] = useState<RoomFieldDefinition[]>([]);
    const [fixedOptions, setFixedOptions] = useState<RoomFixedFieldOption[]>([]);
    const [fixedFieldIcons, setFixedFieldIcons] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    // Categories state
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [addingCategory, setAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newCategorySection, setNewCategorySection] = useState<'room_details' | 'location_details' | 'care_provider_details'>('room_details');
    const [newCategoryColumn, setNewCategoryColumn] = useState<number>(1);
    const [newCategoryIcon, setNewCategoryIcon] = useState<string | undefined>(undefined);
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editCategoryName, setEditCategoryName] = useState("");
    const [editCategorySection, setEditCategorySection] = useState<'room_details' | 'location_details' | 'care_provider_details'>('room_details');
    const [editCategoryColumn, setEditCategoryColumn] = useState<number>(1);
    const [editCategoryPublicColumn, setEditCategoryPublicColumn] = useState<number | null>(null);
    const [editCategoryIcon, setEditCategoryIcon] = useState<string | undefined>(undefined);
    const [sectionFilter, setSectionFilter] = useState<'all' | 'room_details' | 'location_details' | 'care_provider_details'>('all');

    // Field definitions state
    const [addingFieldToCategory, setAddingFieldToCategory] = useState<string | null>(null);
    const [newFieldName, setNewFieldName] = useState("");
    const [newFieldType, setNewFieldType] = useState<"boolean" | "single" | "multi" | "text" | "textarea" | "number" | "currency" | "phone" | "email" | "date" | "dropdown">("boolean");
    const [newFieldTarget, setNewFieldTarget] = useState<'home' | 'facility' | 'both'>('both');
    const [newFieldOptions, setNewFieldOptions] = useState<string[]>([]);

    // Editing Field State
    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
    const [editFieldName, setEditFieldName] = useState("");
    const [editFieldType, setEditFieldType] = useState<"boolean" | "single" | "multi" | "text" | "textarea" | "number" | "currency" | "phone" | "email" | "date" | "dropdown">("boolean");
    const [editFieldTarget, setEditFieldTarget] = useState<'home' | 'facility' | 'both'>('both');
    const [editFieldOptions, setEditFieldOptions] = useState<string[]>([]);

    // Delete confirmation modal state
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        type: 'category' | 'field' | 'fixed_option';
        id: string;
        name: string;
    }>({ isOpen: false, type: 'category', id: '', name: '' });

    const { showNotification } = useNotification();

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const [cats, fields, fixed, icons] = await Promise.all([
                getRoomFieldCategories(),
                getRoomFieldDefinitions(),
                getFixedFieldOptions(),
                getFixedFieldTypeIcons(),
            ]);
            setCategories(cats);
            setFieldDefinitions(fields);
            setFixedOptions(fixed);
            setFixedFieldIcons(icons);
            // Expand all categories by default ONLY on initial load
            if (isInitialLoad.current) {
                setExpandedCategories(new Set(cats.map(c => c.id)));
                isInitialLoad.current = false;
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // =========================================================================
    // Fixed Field Options Handlers
    // =========================================================================

    const handleAddFixedOption = async () => {
        if (!addingToFixedField || !newFixedValue.trim()) return;
        try {
            await createFixedFieldOption(addingToFixedField, newFixedValue.trim(), newFixedIcon);
            await fetchData();
            setNewFixedValue("");
            setNewFixedIcon(undefined);
            setAddingToFixedField(null);
            showNotification("Option Added", newFixedValue.trim());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add option");
        }
    };

    const handleUpdateFixedOption = async (id: string) => {
        if (!editFixedValue.trim()) return;
        try {
            await updateFixedFieldOption(id, editFixedValue.trim(), editFixedIcon || null);
            await fetchData();
            setEditingFixedOption(null);
            showNotification("Option Updated", editFixedValue.trim());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update option");
        }
    };

    const handleDeleteFixedOption = async (id: string) => {
        const option = fixedOptions.find(o => o.id === id);
        setDeleteModal({
            isOpen: true,
            type: 'fixed_option',
            id,
            name: option?.value || 'this option'
        });
    };

    const handleFixedTypeIconChange = async (type: FixedFieldType, icon: string | undefined) => {
        try {
            // Update local state immediately for UI responsiveness
            setFixedFieldIcons(prev => ({ ...prev, [type]: icon || '' }));

            await updateFixedFieldTypeIcon(type, icon || null);
            // Background refresh to ensure sync
            const icons = await getFixedFieldTypeIcons();
            setFixedFieldIcons(icons);
            setFixedFieldIcons(icons);
        } catch (err: any) {
            console.error("Icon update error:", err);
            showNotification(`Failed to update icon: ${err.message || JSON.stringify(err)}`, "error");
        }
    };

    // =========================================================================
    // Category Handlers
    // =========================================================================

    async function handleAddCategory() {
        if (!newCategoryName.trim()) return;
        try {
            await createRoomFieldCategory(newCategoryName.trim(), newCategorySection, newCategoryColumn, newCategoryIcon);
            await fetchData();
            setNewCategoryName("");
            setNewCategorySection('room_details');
            setNewCategoryColumn(1);
            setNewCategoryIcon(undefined);
            setAddingCategory(false);
            showNotification("Category Added", newCategoryName.trim());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add category");
        }
    }

    async function handleUpdateCategory(id: string) {
        if (!editCategoryName.trim()) return;
        try {
            await updateRoomFieldCategory(id, editCategoryName.trim(), editCategorySection, editCategoryColumn, editCategoryIcon || null, editCategoryPublicColumn);
            await fetchData();
            setEditingCategory(null);
            showNotification("Category Updated", editCategoryName.trim());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update category");
        }
    };

    const handleDeleteCategory = async (id: string) => {
        const category = categories.find(c => c.id === id);
        setDeleteModal({
            isOpen: true,
            type: 'category',
            id,
            name: category?.name || 'this category'
        });
    };

    const confirmDelete = async () => {
        try {
            if (deleteModal.type === 'category') {
                await deleteRoomFieldCategory(deleteModal.id);
                showNotification("Category Deleted", "");
            } else if (deleteModal.type === 'field') {
                await deleteRoomFieldDefinition(deleteModal.id);
                showNotification("Field Deleted", "");
            } else {
                await deleteFixedFieldOption(deleteModal.id);
                showNotification("Option Deleted", "");
            }
            await fetchData();
            setDeleteModal({ isOpen: false, type: 'category', id: '', name: '' });
        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to delete ${deleteModal.type}`);
        }
    };

    const toggleCategory = (id: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // =========================================================================
    // Field Definition Handlers
    // =========================================================================

    const handleAddField = async (categoryId: string) => {
        if (!newFieldName.trim()) return;
        try {
            const newField = await createRoomFieldDefinition({
                name: newFieldName.trim(),
                type: newFieldType,
                targetType: newFieldTarget,
                options: newFieldType !== "boolean" ? newFieldOptions.filter(o => o.trim()) : undefined,
                categoryId,
            });
            await fetchData();
            // startEditingField(newField); // Removed per user request
            setNewFieldName("");
            setNewFieldType("boolean");
            setNewFieldTarget("both");
            setNewFieldOptions([]);
            setAddingFieldToCategory(null);
            showNotification("Field Added", newFieldName.trim());
        } catch (err: any) {
            console.error("Error adding field:", err);
            setError(err instanceof Error ? err.message : `Failed to add field: ${JSON.stringify(err)}`);
        }
    };

    const startEditingField = (field: RoomFieldDefinition) => {
        setEditingFieldId(field.id);
        setEditFieldName(field.name);
        setEditFieldType(field.type);
        setEditFieldTarget(field.targetType || 'both');
        setEditFieldOptions(field.options || []);
        setAddingFieldToCategory(null); // Close add form
    };

    const cancelEditField = () => {
        setEditingFieldId(null);
        setEditFieldName("");
        setEditFieldType("boolean");
        setEditFieldTarget('both');
        setEditFieldOptions([]);
    };

    const handleSaveEditField = async () => {
        if (!editingFieldId) return;
        try {
            console.log("Saving field:", editingFieldId, {
                name: editFieldName,
                type: editFieldType,
                targetType: editFieldTarget,
                options: editFieldType === 'boolean' ? [] : editFieldOptions.filter(o => o.trim()),
            });
            await updateRoomFieldDefinition(editingFieldId, {
                name: editFieldName,
                type: editFieldType,
                targetType: editFieldTarget,
                options: editFieldType === 'boolean' ? [] : editFieldOptions.filter(o => o.trim()),
            });
            await fetchData();
            showNotification("Field updated successfully", "success");
            cancelEditField();
        } catch (error: any) {
            console.error("Failed to update field. Error details:", error);
            const msg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
            showNotification(`Error: ${msg}`, "error");
        }
    };

    const handleTogglePublic = async (id: string, isPublic: boolean) => {
        setFieldDefinitions(prev => prev.map(f => f.id === id ? { ...f, isPublic } : f));
        try {
            await toggleRoomFieldPublic(id, isPublic);
        } catch (err: any) {
            setFieldDefinitions(prev => prev.map(f => f.id === id ? { ...f, isPublic: !isPublic } : f));
            const msg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
            showNotification("Failed to update visibility", msg);
        }
    };

    const handleDeleteField = async (id: string) => {
        const field = fieldDefinitions.find(f => f.id === id);
        setDeleteModal({
            isOpen: true,
            type: 'field',
            id,
            name: field?.name || 'this field'
        });
    };

    // =========================================================================
    // Render
    // =========================================================================

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    async function handleDragEndFields(event: DragEndEvent) {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setFieldDefinitions((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over?.id);
                if (oldIndex === -1 || newIndex === -1) return items;

                const categoryId = items[oldIndex].categoryId;
                const reorderedItems = arrayMove(items, oldIndex, newIndex);

                // Calculate new display orders for the affected category
                const catItems = reorderedItems.filter(f => f.categoryId === categoryId);
                const orderMap = new Map(catItems.map((item, index) => [item.id, index]));

                // Update items with new display order
                const finalItems = reorderedItems.map(item => {
                    if (item.categoryId === categoryId && orderMap.has(item.id)) {
                        return { ...item, displayOrder: orderMap.get(item.id)! };
                    }
                    return item;
                });

                // Prepare DB updates
                const updates = catItems.map((field, index) => ({
                    id: field.id,
                    display_order: index
                }));

                // Fire and forget update (optimistic UI)
                reorderRoomFields(updates).catch(err => {
                    console.error("Failed to reorder fields", err);
                    showNotification("Failed to save new order", "error");
                });

                return finalItems;
            });
        }
    }

    const handleDragEndCategories = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = categories.findIndex(c => c.id === active.id);
        const newIndex = categories.findIndex(c => c.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newCategories = arrayMove(categories, oldIndex, newIndex);
            setCategories(newCategories);

            const updates = newCategories.map((cat, idx) => cat.id);

            reorderRoomFieldCategories(updates).catch(err => {
                console.error("Failed to reorder categories", err);
                showNotification("Failed to save category order", "error");
                fetchData();
            });
        }
    };

    const handleDragEndFixed = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeOption = fixedOptions.find(o => o.id === active.id);
        if (!activeOption) return;

        const typeOptions = fixedOptions
            .filter(o => o.fieldType === activeOption.fieldType)
            .sort((a, b) => a.displayOrder - b.displayOrder); // Ensure current sorted order

        const oldIndex = typeOptions.findIndex(o => o.id === active.id);
        const newIndex = typeOptions.findIndex(o => o.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const reorderedTypeOptions = arrayMove(typeOptions, oldIndex, newIndex).map((opt, idx) => ({
                ...opt,
                displayOrder: idx
            }));

            // Optimistic update
            const otherOptions = fixedOptions.filter(o => o.fieldType !== activeOption.fieldType);
            const newFixedOptions = [...otherOptions, ...reorderedTypeOptions];
            setFixedOptions(newFixedOptions);

            const updates = reorderedTypeOptions.map((opt, idx) => ({
                id: opt.id,
                display_order: idx
            }));

            reorderFixedFieldOptions(updates).catch(err => {
                console.error("Reorder failed", err);
                showNotification("Error", "Failed to save order");
                fetchData();
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <HeartLoader />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex-none space-y-4 md:space-y-6 p-4 md:p-8 pb-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">Detail Fields</h1>
                        <p className="text-content-muted mt-1 text-sm md:text-base">
                            Configure detail options and custom fields
                        </p>
                    </div>
                    <button
                        onClick={() => setAddingCategory(true)}
                        className="p-2 bg-accent hover:bg-accent-light text-white rounded-lg transition-colors md:px-4 md:py-2"
                    >
                        <Plus className="h-5 w-5 md:hidden" />
                        <span className="hidden md:flex md:items-center md:gap-2">
                            <Plus className="h-5 w-5" />
                            Add Category
                        </span>
                    </button>
                </div>

                {error && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
                        {error}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-auto px-4 md:px-8 pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Custom Field Categories (2/3 width) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Custom Field Categories Section */}
                        <div className="card p-6">
                            <h2 className="text-lg font-semibold text-white mb-1">Custom Field Categories</h2>
                            <p className="text-sm text-content-muted mb-4">
                                Create categories to organize custom Yes/No or choice fields
                            </p>

                            {/* Section Filter */}
                            <div className="flex items-center justify-between gap-2 mb-6">
                                <div className="flex bg-surface-input rounded p-1 gap-1">
                                    <button
                                        onClick={() => setSectionFilter('all')}
                                        className={`px-3 py-1.5 rounded text-xs transition-colors ${sectionFilter === 'all' ? "bg-accent text-white" : "text-content-muted hover:text-white hover:bg-surface-hover"}`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setSectionFilter('room_details')}
                                        className={`px-3 py-1.5 rounded text-xs transition-colors ${sectionFilter === 'room_details' ? "bg-accent text-white" : "text-content-muted hover:text-white hover:bg-surface-hover"}`}
                                    >
                                        Room Details
                                    </button>
                                    <button
                                        onClick={() => setSectionFilter('location_details')}
                                        className={`px-3 py-1.5 rounded text-xs transition-colors ${sectionFilter === 'location_details' ? "bg-accent text-white" : "text-content-muted hover:text-white hover:bg-surface-hover"}`}
                                    >
                                        Location Details
                                    </button>
                                    <button
                                        onClick={() => setSectionFilter('care_provider_details')}
                                        className={`px-3 py-1.5 rounded text-xs transition-colors ${sectionFilter === 'care_provider_details' ? "bg-accent text-white" : "text-content-muted hover:text-white hover:bg-surface-hover"}`}
                                    >
                                        Care Provider Details
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        if (expandedCategories.size > 0) {
                                            setExpandedCategories(new Set());
                                        } else {
                                            setExpandedCategories(new Set(categories.map(c => c.id)));
                                        }
                                    }}
                                    className="p-2 text-content-muted hover:text-white hover:bg-surface-hover rounded-lg transition-colors border border-ui-border"
                                    title={expandedCategories.size > 0 ? "Collapse All" : "Expand All"}
                                >
                                    {expandedCategories.size > 0 ? (
                                        <ChevronsUp className="h-4 w-4" />
                                    ) : (
                                        <ChevronsDown className="h-4 w-4" />
                                    )}
                                </button>
                            </div>

                            {/* Add Category Form */}
                            {addingCategory && (
                                <div className="mb-4 p-4 bg-surface-input rounded-lg" style={{ border: 'none' }}>
                                    <div className="flex items-center gap-3">
                                        <IconPicker value={newCategoryIcon} onChange={setNewCategoryIcon} />
                                        <input
                                            type="text"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") handleAddCategory();
                                                if (e.key === "Escape") {
                                                    setAddingCategory(false);
                                                    setNewCategoryName("");
                                                }
                                            }}
                                            placeholder="Category name..."
                                            className="flex-1 bg-surface-input rounded-lg px-3 py-2 text-sm text-white placeholder-content-muted focus:outline-none focus:border-accent"
                                            autoFocus
                                        />
                                        <div className="flex bg-surface-input rounded p-1 gap-1">
                                            <button
                                                onClick={() => setNewCategorySection('room_details')}
                                                className={`px-2 py-1 rounded text-xs transition-colors ${newCategorySection === 'room_details' ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                                            >
                                                Room
                                            </button>
                                            <button
                                                onClick={() => setNewCategorySection('location_details')}
                                                className={`px-2 py-1 rounded text-xs transition-colors ${newCategorySection === 'location_details' ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                                            >
                                                Location
                                            </button>
                                            <button
                                                onClick={() => setNewCategorySection('care_provider_details')}
                                                className={`px-2 py-1 rounded text-xs transition-colors ${newCategorySection === 'care_provider_details' ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                                            >
                                                Provider
                                            </button>
                                        </div>
                                        <button
                                            onClick={handleAddCategory}
                                            disabled={!newCategoryName.trim()}
                                            className="p-1.5 bg-accent text-white rounded-lg hover:bg-accent-light disabled:opacity-50 transition-colors"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setAddingCategory(false);
                                                setNewCategoryName("");
                                            }}
                                            className="p-1.5 text-content-muted hover:text-white bg-surface-input rounded-lg hover:bg-surface-hover"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Categories List */}
                            <div className="space-y-6">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEndCategories}
                                    id="categories-dnd"
                                >
                                    <SortableContext
                                        items={categories.map(c => c.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-3">
                                            {categories
                                                .filter(cat => sectionFilter === 'all' || cat.section === sectionFilter)
                                                .map((cat, index) => {
                                                    const isExpanded = expandedCategories.has(cat.id);
                                                    const catFields = fieldDefinitions
                                                        .filter(f => f.categoryId === cat.id)
                                                        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

                                                    return (
                                                        <SortableCategoryItem
                                                            key={cat.id}
                                                            category={cat}
                                                            style={{ zIndex: 100 - index, position: 'relative' }}
                                                            isExpanded={isExpanded}
                                                            toggleCategory={toggleCategory}
                                                            editingCategory={editingCategory}
                                                            setEditingCategory={setEditingCategory}
                                                            editCategoryName={editCategoryName}
                                                            setEditCategoryName={setEditCategoryName}
                                                            handleUpdateCategory={handleUpdateCategory}
                                                            editCategorySection={editCategorySection}
                                                            setEditCategorySection={setEditCategorySection}
                                                            editCategoryColumn={editCategoryColumn}
                                                            setEditCategoryColumn={setEditCategoryColumn}
                                                            editCategoryPublicColumn={editCategoryPublicColumn}
                                                            setEditCategoryPublicColumn={setEditCategoryPublicColumn}
                                                            editCategoryIcon={editCategoryIcon}
                                                            setEditCategoryIcon={setEditCategoryIcon}
                                                            handleDeleteCategory={handleDeleteCategory}
                                                            setAddingFieldToCategory={setAddingFieldToCategory}
                                                            setExpandedCategories={setExpandedCategories}
                                                        >
                                                            {catFields.length === 0 && !addingFieldToCategory ? (
                                                                <p className="text-sm text-content-muted italic">No fields yet</p>
                                                            ) : (
                                                                <DndContext
                                                                    sensors={sensors}
                                                                    collisionDetection={closestCenter}
                                                                    onDragEnd={handleDragEndFields}
                                                                    id={`fields-dnd-${cat.id}`}
                                                                >
                                                                    <SortableContext
                                                                        items={catFields.map(f => f.id)}
                                                                        strategy={verticalListSortingStrategy}
                                                                    >
                                                                        <div className="space-y-2">
                                                                            {catFields.map(field => (
                                                                                <SortableFieldItem
                                                                                    key={field.id}
                                                                                    field={field}
                                                                                    editingFieldId={editingFieldId}
                                                                                    startEditingField={startEditingField}
                                                                                    handleDeleteField={handleDeleteField}
                                                                                    handleTogglePublic={handleTogglePublic}
                                                                                    editFieldName={editFieldName}
                                                                                    setEditFieldName={setEditFieldName}
                                                                                    editFieldType={editFieldType}
                                                                                    setEditFieldType={setEditFieldType}
                                                                                    editFieldTarget={editFieldTarget}
                                                                                    setEditFieldTarget={setEditFieldTarget}
                                                                                    editFieldOptions={editFieldOptions}
                                                                                    setEditFieldOptions={setEditFieldOptions}
                                                                                    handleSaveEditField={handleSaveEditField}
                                                                                    cancelEditField={cancelEditField}
                                                                                />
                                                                            ))}

                                                                            {/* Add Field Form */}
                                                                            {addingFieldToCategory === cat.id && (
                                                                                <div className="mt-2 p-3 bg-surface-input rounded-lg space-y-3" style={{ border: 'none' }}>
                                                                                    <div className="flex items-center gap-3">
                                                                                        <input
                                                                                            type="text"
                                                                                            value={newFieldName}
                                                                                            onChange={(e) => setNewFieldName(e.target.value)}
                                                                                            placeholder="Field name..."
                                                                                            className="form-input flex-1 rounded px-3 py-2 text-sm focus:border-accent"
                                                                                            autoFocus
                                                                                        />
                                                                                        <div className="flex bg-surface-input rounded p-1 gap-1">
                                                                                            <button
                                                                                                onClick={() => setNewFieldType("boolean")}
                                                                                                className={`p-1.5 rounded transition-colors ${newFieldType === "boolean" ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                                                                                            >
                                                                                                <ToggleLeft className="h-4 w-4" />
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => setNewFieldType("single")}
                                                                                                className={`p-1.5 rounded transition-colors ${newFieldType === "single" ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                                                                                            >
                                                                                                <CircleDot className="h-4 w-4" />
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => setNewFieldType("multi")}
                                                                                                className={`p-1.5 rounded transition-colors ${newFieldType === "multi" ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                                                                                            >
                                                                                                <CheckSquare className="h-4 w-4" />
                                                                                            </button>
                                                                                            <div className="relative">
                                                                                                <FieldTypeSelector value={newFieldType} onChange={(val) => setNewFieldType(val as any)} />
                                                                                            </div>
                                                                                            <button
                                                                                                onClick={() => setNewFieldType("dropdown")}
                                                                                                className={`p-1.5 rounded transition-colors ${newFieldType === "dropdown" ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                                                                                            >
                                                                                                <List className="h-4 w-4" />
                                                                                            </button>
                                                                                        </div>

                                                                                        <div className="flex bg-surface-input rounded p-1 gap-1">
                                                                                            <button
                                                                                                onClick={() => setNewFieldTarget('home')}
                                                                                                className={`p-1.5 rounded transition-colors ${newFieldTarget === 'home' ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                                                                                            >
                                                                                                <Home className="h-4 w-4" />
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => setNewFieldTarget('facility')}
                                                                                                className={`p-1.5 rounded transition-colors ${newFieldTarget === 'facility' ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                                                                                            >
                                                                                                <Building2 className="h-4 w-4" />
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => setNewFieldTarget('both')}
                                                                                                className={`p-1.5 rounded transition-colors ${newFieldTarget === 'both' ? "bg-accent text-white" : "text-content-muted hover:text-content-primary"}`}
                                                                                            >
                                                                                                <Layers className="h-4 w-4" />
                                                                                            </button>
                                                                                        </div>

                                                                                        <button
                                                                                            onClick={() => handleAddField(cat.id)}
                                                                                            disabled={!newFieldName.trim()}
                                                                                            className="p-1.5 bg-accent text-white rounded hover:bg-accent-light disabled:opacity-50"
                                                                                        >
                                                                                            <Check className="h-4 w-4" />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => setAddingFieldToCategory(null)}
                                                                                            className="p-1.5 text-content-muted hover:text-content-primary bg-surface-input rounded hover:bg-surface-hover"
                                                                                        >
                                                                                            <X className="h-4 w-4" />
                                                                                        </button>
                                                                                    </div>

                                                                                    {["single", "multi", "dropdown"].includes(newFieldType) && (
                                                                                        <div className="space-y-2">
                                                                                            <label className="text-xs text-content-muted">Options (one per line)</label>
                                                                                            <textarea
                                                                                                value={newFieldOptions.join("\n")}
                                                                                                onChange={(e) => setNewFieldOptions(e.target.value.split("\n"))}
                                                                                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                                                                                                className="form-input w-full rounded px-3 py-2 text-sm focus:border-accent resize-none"
                                                                                                rows={3}
                                                                                            />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </SortableContext>
                                                                </DndContext>
                                                            )}
                                                        </SortableCategoryItem>
                                                    );
                                                })}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Fixed Field Options (1/3 width) */}
                    <div className="card p-6 h-fit">
                        <h2 className="text-lg font-semibold text-white mb-1">
                            Fixed Field Options
                        </h2>
                        <p className="text-sm text-content-muted mb-4">
                            Manage dropdown options for standard detail fields
                        </p>

                        <div className="space-y-6">
                            {FIXED_FIELD_TYPES.map(({ type, label }) => {
                                const options = fixedOptions
                                    .filter(o => o.fieldType === type)
                                    .sort((a, b) => a.displayOrder - b.displayOrder);

                                return (
                                    <div key={type} className="space-y-2">
                                        <div className="bg-surface-input rounded-lg p-3 space-y-2" style={{ border: '2px solid var(--form-border)', backgroundColor: 'var(--form-bg)' }}>
                                            <div className="flex items-center justify-between" style={{ backgroundColor: 'var(--form-hover)', margin: '-12px -12px 0 -12px', padding: '8px 12px', borderRadius: '6px 6px 0 0' }}>
                                                <div className="flex items-center gap-2">
                                                    <IconPicker
                                                        value={fixedFieldIcons[type]}
                                                        onChange={(icon) => handleFixedTypeIconChange(type, icon)}
                                                    />
                                                    <h3 className="text-sm font-medium text-white">{label}</h3>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setAddingToFixedField(type);
                                                        setNewFixedValue("");
                                                    }}
                                                    className="p-1 text-accent hover:text-accent-light transition-colors"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <DndContext
                                                sensors={sensors}
                                                collisionDetection={closestCenter}
                                                onDragEnd={handleDragEndFixed}
                                                id={`fixed-dnd-${type}`}
                                            >
                                                <SortableContext
                                                    items={options.map(o => o.id)}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    {options.map(opt => (
                                                        <SortableFixedOptionItem
                                                            key={opt.id}
                                                            option={opt}
                                                            editingId={editingFixedOption}
                                                            editValue={editFixedValue}
                                                            setEditValue={setEditFixedValue}
                                                            startEditing={(id, val) => {
                                                                setEditingFixedOption(id);
                                                                setEditFixedValue(val);
                                                            }}
                                                            cancelEditing={() => {
                                                                setEditingFixedOption(null);
                                                                setEditFixedValue("");
                                                            }}
                                                            saveEditing={() => handleUpdateFixedOption(opt.id)}
                                                            deleteOption={handleDeleteFixedOption}
                                                        />
                                                    ))}
                                                </SortableContext>
                                            </DndContext>

                                            {addingToFixedField === type && (
                                                <div className="flex items-center gap-2 mb-2 p-3 bg-surface-input rounded-lg" style={{ border: '1px dashed rgba(255,255,255,0.2)' }}>
                                                    <IconPicker value={newFixedIcon} onChange={setNewFixedIcon} />
                                                    <input
                                                        type="text"
                                                        value={newFixedValue}
                                                        onChange={(e) => setNewFixedValue(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") handleAddFixedOption();
                                                            if (e.key === "Escape") setAddingToFixedField(null);
                                                        }}
                                                        placeholder="New option..."
                                                        className="form-input flex-1 rounded px-2 py-1 text-sm focus:border-accent"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => handleAddFixedOption()}
                                                        className="p-1.5 bg-accent text-white rounded hover:bg-accent-light disabled:opacity-50"
                                                        disabled={!newFixedValue.trim()}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setAddingToFixedField(null)}
                                                        className="p-1.5 text-content-muted hover:text-content-primary bg-surface-input rounded hover:bg-surface-hover"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* End of Content */}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={confirmDelete}
                title={`Delete ${deleteModal.type === 'category' ? 'Category' : deleteModal.type === 'field' ? 'Field' : 'Option'}`}
                message={
                    deleteModal.type === 'category'
                        ? `Are you sure you want to delete "${deleteModal.name}" and all its fields? This action cannot be undone.`
                        : `Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`
                }
                confirmLabel="Delete"
                cancelLabel="Cancel"
                isDangerous={true}
            />
        </div>
    );
}



