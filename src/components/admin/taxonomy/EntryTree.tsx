"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, Loader2, X, Check, ArrowDownAZ, ArrowUpZA, GripVertical } from "lucide-react";
import { HeartLoader } from "@/components/ui/HeartLoader";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TaxonomyEntry } from "@/lib/services/taxonomyEntryService";

const MAX_DEPTH = 3;

// Sortable wrapper for drag-and-drop entries
function SortableEntry({ entry, children }: { entry: TaxonomyEntry; children: React.ReactNode }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: entry.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="relative group/sortable">
            {/* Drag handle */}
            <div
                {...attributes}
                {...listeners}
                className="absolute left-1 top-1/2 -translate-y-1/2 p-1 cursor-grab active:cursor-grabbing text-content-muted hover:text-content-primary z-10"
            >
                <GripVertical className="h-4 w-4" />
            </div>
            <div className="pl-6">
                {children}
            </div>
        </div>
    );
}

interface EntryTreeProps {
    entries: TaxonomyEntry[];
    singularName: string;
    onAddEntry: (name: string, parentId?: string) => Promise<void>;
    onEditEntry: (id: string, name: string) => Promise<void>;
    onDeleteEntry: (id: string) => Promise<void>;
    onSortEntries?: (updates: { id: string; displayOrder: number }[]) => Promise<void>;
    isLoading?: boolean;
}

export function EntryTree({
    entries,
    singularName,
    onAddEntry,
    onEditEntry,
    onDeleteEntry,
    onSortEntries,
    isLoading = false,
}: EntryTreeProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [addingParentId, setAddingParentId] = useState<string | null | undefined>(undefined);
    const [newEntryName, setNewEntryName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [isSorting, setIsSorting] = useState(false);
    const [isManualSortMode, setIsManualSortMode] = useState(false);

    // DnD sensors for drag-and-drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Handle drag end - reorder entries and save
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = entries.findIndex((e) => e.id === active.id);
            const newIndex = entries.findIndex((e) => e.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1 && onSortEntries) {
                const reordered = arrayMove(entries, oldIndex, newIndex);
                const updates = reordered.map((entry, index) => ({
                    id: entry.id,
                    displayOrder: index,
                }));
                await onSortEntries(updates);
            }
        }
    };

    // Detect current sort order when entries change
    useEffect(() => {
        if (entries.length >= 2) {
            // Compare first two entries to detect if it's ascending or descending
            const isAscending = entries[0].name.localeCompare(entries[1].name) <= 0;
            setSortDirection(isAscending ? 'asc' : 'desc');
        }
    }, [entries]);

    // handleSort: sort entries alphabetically and save the new order
    const handleSort = async () => {
        if (isSorting) return; // Prevent double-clicks

        const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        setSortDirection(newDirection);
        setIsSorting(true);

        try {
            // Build the sorted order based on new direction
            const sorted = [...entries].sort((a, b) => {
                return newDirection === 'asc'
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            });

            // Call save callback if provided
            if (onSortEntries) {
                const updates = sorted.map((entry, index) => ({
                    id: entry.id,
                    displayOrder: index,
                }));
                await onSortEntries(updates);
            }
        } finally {
            setIsSorting(false);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleAddStart = (parentId?: string) => {
        setAddingParentId(parentId ?? null);
        setNewEntryName("");
        // Auto-expand parent when adding child
        if (parentId) {
            setExpandedIds(prev => new Set(prev).add(parentId));
        }
    };

    const handleAddSubmit = async () => {
        if (!newEntryName.trim()) return;
        setIsSubmitting(true);
        try {
            await onAddEntry(newEntryName.trim(), addingParentId || undefined);
            setAddingParentId(undefined);
            setNewEntryName("");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddCancel = () => {
        setAddingParentId(undefined);
        setNewEntryName("");
    };

    const handleEditStart = (entry: TaxonomyEntry) => {
        setEditingId(entry.id);
        setEditingName(entry.name);
    };

    const handleEditSubmit = async () => {
        if (!editingId || !editingName.trim()) return;
        setIsSubmitting(true);
        try {
            await onEditEntry(editingId, editingName.trim());
            setEditingId(null);
            setEditingName("");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditCancel = () => {
        setEditingId(null);
        setEditingName("");
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await onDeleteEntry(id);
        } finally {
            setDeletingId(null);
        }
    };

    const renderEntry = (entry: TaxonomyEntry, depth: number = 0) => {
        const isExpanded = expandedIds.has(entry.id);
        const hasChildren = entry.children && entry.children.length > 0;
        const isEditing = editingId === entry.id;
        const isDeleting = deletingId === entry.id;
        const canAddChild = depth < MAX_DEPTH - 1;

        return (
            <div
                key={entry.id}
                className={`mx-1.5 rounded-lg transition-colors ${depth === 0 && isExpanded && hasChildren ? "bg-surface-input" : ""}`}
            >
                <div
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-input transition-colors"
                    style={{ paddingLeft: `${12 + depth * 20}px` }}
                >
                    {/* Expand/Collapse toggle */}
                    {hasChildren ? (
                        <button
                            onClick={() => toggleExpand(entry.id)}
                            className="p-0.5 hover:bg-surface-hover rounded flex-shrink-0"
                        >
                            {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-content-muted" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-content-muted" />
                            )}
                        </button>
                    ) : (
                        <span className="w-5 flex-shrink-0" />
                    )}

                    {/* Entry name or edit input */}
                    {isEditing ? (
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleEditSubmit();
                                    if (e.key === "Escape") handleEditCancel();
                                }}
                                className={`w-full bg-surface-input border border-transparent rounded px-2 py-1 text-sm text-content-primary focus:outline-none transition-colors hover:bg-surface-hover focus:bg-surface-hover ${editingName.trim() ? "pr-16" : "pr-8"
                                    }`}
                                autoFocus
                                disabled={isSubmitting}
                            />
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {editingName.trim() && (
                                    <button
                                        onClick={handleEditSubmit}
                                        disabled={isSubmitting}
                                        className="px-2 py-0.5 text-xs font-bold bg-accent text-white rounded hover:bg-accent-light disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                                    </button>
                                )}
                                <button
                                    onClick={handleEditCancel}
                                    className="p-1 text-content-muted hover:text-content-primary hover:bg-surface-hover rounded"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <span className="flex-1 text-sm text-content-primary truncate">{entry.name}</span>

                            {/* Action buttons - visible on hover */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canAddChild && (
                                    <button
                                        onClick={() => handleAddStart(entry.id)}
                                        className="p-1 text-content-muted hover:text-accent hover:bg-accent/10 rounded"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                <button
                                    onClick={() => handleEditStart(entry)}
                                    className="p-1 text-content-muted hover:text-content-primary hover:bg-surface-hover rounded"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(entry.id)}
                                    disabled={isDeleting}
                                    className="p-1 text-content-muted hover:text-red-400 hover:bg-red-400/10 rounded disabled:opacity-50"
                                >
                                    {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Add child input - appears under parent when adding */}
                {addingParentId === entry.id && (
                    <div
                        className="relative px-3 py-2"
                        style={{ paddingLeft: `${32 + (depth + 1) * 20}px` }}
                    >
                        <input
                            type="text"
                            value={newEntryName}
                            onChange={(e) => setNewEntryName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddSubmit();
                                if (e.key === "Escape") handleAddCancel();
                            }}
                            placeholder={`New ${singularName.toLowerCase()}...`}
                            className={`w-full bg-surface-input border border-transparent rounded px-3 py-1.5 text-sm text-content-primary placeholder-content-muted focus:outline-none transition-colors hover:bg-surface-hover focus:bg-surface-hover ${newEntryName.trim() ? "pr-16" : "pr-8"
                                }`}
                            autoFocus
                            disabled={isSubmitting}
                        />
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {newEntryName.trim() && (
                                <button
                                    onClick={handleAddSubmit}
                                    disabled={isSubmitting}
                                    className="px-2 py-0.5 text-xs font-bold bg-accent text-white rounded hover:bg-accent-light disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                                </button>
                            )}
                            <button
                                onClick={handleAddCancel}
                                className="p-1 text-content-muted hover:text-content-primary hover:bg-surface-hover rounded"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Children */}
                {isExpanded && hasChildren && (
                    <div>
                        {entry.children!.map((child) => renderEntry(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-4">
                <HeartLoader size={6} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Add root entry input & Sort Button */}
            <div className="flex items-center gap-2 mb-3 flex-none">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={addingParentId === null ? newEntryName : ""}
                        onChange={(e) => {
                            if (addingParentId !== null) setAddingParentId(null);
                            setNewEntryName(e.target.value);
                        }}
                        onFocus={() => setAddingParentId(null)}
                        placeholder={`Add new ${singularName.toLowerCase()}...`}
                        className={`w-full bg-surface-input border border-transparent rounded-lg pl-4 py-2 text-sm text-content-primary placeholder-content-muted focus:outline-none transition-colors hover:bg-surface-hover focus:bg-surface-hover ${addingParentId === null && newEntryName.trim() ? "pr-20" : "pr-12"
                            }`}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && addingParentId === null) handleAddSubmit();
                        }}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {addingParentId === null && newEntryName.trim() && (
                            <button
                                type="button"
                                onClick={handleAddSubmit}
                                disabled={isSubmitting}
                                className="px-2 py-0.5 text-xs bg-accent text-white rounded hover:bg-accent-light disabled:opacity-50 transition-colors"
                            >
                                {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setNewEntryName("")}
                            className={`p-1.5 text-content-muted hover:text-content-primary hover:bg-surface-hover rounded-md transition-colors ${newEntryName ? "visible" : "invisible"
                                }`}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleSort}
                    disabled={isManualSortMode}
                    className={`flex-none p-2 rounded-lg transition-colors ${isManualSortMode
                        ? 'bg-surface-input text-content-muted cursor-not-allowed'
                        : 'bg-accent text-white'
                        }`}
                >
                    {sortDirection === 'asc' ? (
                        <ArrowDownAZ className="h-5 w-5" />
                    ) : (
                        <ArrowUpZA className="h-5 w-5" />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setIsManualSortMode(!isManualSortMode)}
                    className={`flex-none p-2 rounded-lg transition-colors ${isManualSortMode
                        ? 'bg-accent text-white'
                        : 'bg-surface-input text-content-muted hover:text-content-primary hover:bg-surface-hover'
                        }`}
                >
                    <GripVertical className="h-5 w-5" />
                </button>
            </div>

            {/* Entry tree - fills remaining height */}
            <div className="flex-1 min-h-0 overflow-y-auto rounded-lg bg-surface-input">
                {entries.length === 0 ? (
                    <div className="text-center py-4 text-content-muted text-sm">
                        No {singularName.toLowerCase()}s yet
                    </div>
                ) : isManualSortMode ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={entries.map(e => e.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="py-1.5">
                                {entries.map((entry) => (
                                    <SortableEntry key={entry.id} entry={entry}>
                                        {renderEntry(entry, 0)}
                                    </SortableEntry>
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                ) : (
                    <div className="py-1.5">
                        {entries.map((entry) => renderEntry(entry, 0))}
                    </div>
                )}
            </div>
        </div>
    );
}
