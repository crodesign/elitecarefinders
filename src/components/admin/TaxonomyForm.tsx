"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronRight, Ban, Check, Tag, Layers } from "lucide-react";
import type { Taxonomy } from "@/types";
import { SlidePanel } from "./SlidePanel";
import { useNotification } from "@/contexts/NotificationContext";
import { EntryTree } from "./taxonomy/EntryTree";
import {
    getTaxonomyEntries,
    createTaxonomyEntry,
    updateTaxonomyEntry,
    deleteTaxonomyEntry,
    updateEntriesDisplayOrder,
    type TaxonomyEntry,
} from "@/lib/services/taxonomyEntryService";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";

interface TaxonomyFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { singularName: string; pluralName: string; slug: string; contentTypes?: string[] }) => Promise<void>;
    taxonomy?: Taxonomy | null;
    autoOpenEntries?: boolean;
    closeOnSubPanelClose?: boolean;
    offsetSidebar?: boolean;
}

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

export function TaxonomyForm({ isOpen, onClose, onSave, taxonomy, autoOpenEntries = false, closeOnSubPanelClose = false, offsetSidebar = false }: TaxonomyFormProps) {
    const [singularName, setSingularName] = useState("");
    const [pluralName, setPluralName] = useState("");
    const [contentTypes, setContentTypes] = useState<string[]>([]);
    const [slug, setSlug] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { setIsDirty, registerSaveHandler } = useUnsavedChanges();

    // Use ref to keep track of latest handleSaveInternal without re-registering
    const saveHandlerRef = useRef<() => Promise<boolean>>(async () => false);

    // Update ref when state changes
    useEffect(() => {
        saveHandlerRef.current = handleSaveInternal;
    });

    // Register save handler
    useEffect(() => {
        if (isOpen) {
            registerSaveHandler(async () => await saveHandlerRef.current());
        }
        return () => setIsDirty(false);
    }, [isOpen, registerSaveHandler]);

    // Entries state
    const [entries, setEntries] = useState<TaxonomyEntry[]>([]);
    const [loadingEntries, setLoadingEntries] = useState(false);
    const [isEntriesPanelOpen, setIsEntriesPanelOpen] = useState(false);

    const { showNotification } = useNotification();

    const isEditing = !!taxonomy;

    // Fetch entries when taxonomy is set
    const fetchEntries = useCallback(async () => {
        if (!taxonomy?.id) return;

        setLoadingEntries(true);
        try {
            const data = await getTaxonomyEntries(taxonomy.id);
            setEntries(data);
        } catch (err) {
            console.error("Failed to load entries:", err);
        } finally {
            setLoadingEntries(false);
        }
    }, [taxonomy?.id]);

    useEffect(() => {
        if (taxonomy) {
            setSingularName(taxonomy.singularName || taxonomy.name || "");
            setPluralName(taxonomy.pluralName || "");
            setContentTypes(taxonomy.contentTypes || []);
            setSlug(taxonomy.slug);
            fetchEntries();

            // Auto-open entries panel if requested
            if (autoOpenEntries) {
                setIsEntriesPanelOpen(true);
            }
        } else {
            setSingularName("");
            setPluralName("");
            setContentTypes([]);
            setSlug("");
            setEntries([]);
        }
        setError(null);
        if (!autoOpenEntries) {
            setIsEntriesPanelOpen(false);
        }
    }, [taxonomy, isOpen, fetchEntries, autoOpenEntries]);

    // Auto-generate slug from singular name
    useEffect(() => {
        if (singularName) {
            setSlug(generateSlug(singularName));
        }
    }, [singularName]);

    const handleSaveInternal = async (): Promise<boolean> => {
        setError(null);
        setIsSubmitting(true);

        try {
            await onSave({
                singularName: singularName.trim(),
                pluralName: pluralName.trim(),
                slug: slug.trim(),
                contentTypes: contentTypes,
            });
            setIsDirty(false);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await handleSaveInternal();
        if (success) {
            onClose();
        }
    };

    // Entry handlers for EntryTree
    const handleAddEntry = async (name: string, parentId?: string) => {
        if (!taxonomy?.id) return;
        try {
            await createTaxonomyEntry(taxonomy.id, name, parentId);
            await fetchEntries();
            showNotification(`${taxonomy?.singularName || "Entry"} Added`, name);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add entry");
        }
    };

    const handleEditEntry = async (id: string, name: string) => {
        try {
            await updateTaxonomyEntry(id, name);
            await fetchEntries();
            showNotification(`${taxonomy?.singularName || "Entry"} Updated`, name);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update entry");
        }
    };

    const handleDeleteEntry = async (id: string) => {
        try {
            await deleteTaxonomyEntry(id);
            await fetchEntries();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete entry");
        }
    };

    // Count total entries including nested
    const countEntries = (items: TaxonomyEntry[]): number => {
        let count = items.length;
        items.forEach(item => {
            if (item.children) {
                count += countEntries(item.children);
            }
        });
        return count;
    };

    const totalEntries = countEntries(entries);

    return (
        <>
            <SlidePanel
                isOpen={isOpen}
                onClose={onClose}
                title={isEditing ? "Edit Taxonomy" : "New Taxonomy"}
                subtitle={isEditing ? `Editing "${taxonomy?.singularName || taxonomy?.name}"` : "Create a new taxonomy category"}
                closeOnOverlayClick={true}
                offsetSidebar={offsetSidebar}
                actions={
                    <button
                        type="submit"
                        form="taxonomy-form"
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-bold hover:bg-accent-light disabled:opacity-50 transition-colors"
                    >
                        {isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
                    </button>
                }
            >
                <div className="flex flex-col h-full gap-6">
                    {error && (
                        <div className="flex-none mb-0 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    <form id="taxonomy-form" onSubmit={handleSubmit} className="flex-none space-y-6">
                        <div className="space-y-4">
                            <div className="bg-white/5 rounded-lg p-4">
                                <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-accent" />
                                    General Information
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="singularName" className="block text-sm font-medium text-white/80 mb-2">
                                            <span className="flex items-center gap-1">
                                                Singular Name
                                                <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            id="singularName"
                                            value={singularName}
                                            onChange={(e) => {
                                                setSingularName(e.target.value);
                                                setIsDirty(true);
                                            }}
                                            required
                                            className="w-full bg-black/30 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors hover:bg-black/50 focus:bg-black/50"
                                            placeholder="e.g., State"
                                        />
                                        <p className="mt-1.5 text-xs text-zinc-500 font-mono flex items-center gap-1">
                                            <span className="text-zinc-600">slug:</span>
                                            {slug || "..."}
                                        </p>
                                    </div>

                                    <div>
                                        <label htmlFor="pluralName" className="block text-sm font-medium text-white/80 mb-2">
                                            <span className="flex items-center gap-1">
                                                Plural Name
                                                <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            id="pluralName"
                                            value={pluralName}
                                            onChange={(e) => {
                                                setPluralName(e.target.value);
                                                setIsDirty(true);
                                            }}
                                            required
                                            className="w-full bg-black/30 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors hover:bg-black/50 focus:bg-black/50"
                                            placeholder="e.g., States"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Associated Content Types
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['homes', 'facilities', 'reviews', 'blog'].map((type) => {
                                        const isSelected = contentTypes.includes(type);
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setContentTypes(contentTypes.filter(t => t !== type));
                                                    } else {
                                                        setContentTypes([...contentTypes, type]);
                                                    }
                                                    setIsDirty(true);
                                                }}
                                                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isSelected
                                                    ? "bg-white/10 text-white"
                                                    : "bg-transparent hover:bg-white/5 text-zinc-400"
                                                    }`}
                                            >
                                                <div className={`p-1 rounded-full ${isSelected ? "bg-accent/20" : "bg-red-500/10"}`}>
                                                    {isSelected ? (
                                                        <Check className="h-4 w-4 text-accent" />
                                                    ) : (
                                                        <Ban className="h-4 w-4 text-red-500" />
                                                    )}
                                                </div>
                                                <span className="capitalize font-medium text-sm">{type}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-zinc-500 mt-2">
                                    Select one or more sections where this taxonomy will be used.
                                </p>
                            </div>


                        </div>

                        {/* Actions removed - moved to header */}
                    </form>

                    {/* Add Entries Button - Only show when editing */}
                    {/* Entries Section - Only show when editing */}
                    {/* Entries Section - Only show when editing */}
                    {isEditing && (
                        <div className="flex-1 min-h-0 flex flex-col bg-white/5 rounded-lg p-4">
                            <h3 className="flex-none text-base font-medium text-white mb-4 flex items-center gap-2">
                                <Layers className="h-4 w-4 text-accent" />
                                {taxonomy?.pluralName || "Entries"}
                            </h3>
                            <div className="flex-1 min-h-0">
                                <EntryTree
                                    entries={entries}
                                    singularName={taxonomy?.singularName || "Entry"}
                                    onAddEntry={handleAddEntry}
                                    onEditEntry={handleEditEntry}
                                    onDeleteEntry={handleDeleteEntry}
                                    onSortEntries={async (updates) => {
                                        // Save to database and refetch
                                        await updateEntriesDisplayOrder(updates);
                                        await fetchEntries();
                                    }}
                                    isLoading={loadingEntries}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </SlidePanel>


        </>
    );
}
