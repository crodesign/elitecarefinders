"use client";

import { useState, useEffect } from "react";
import type { Taxonomy, TaxonomyType } from "@/types";
import { SlidePanel } from "./SlidePanel";

interface TaxonomyFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { type: TaxonomyType; name: string; slug: string; description?: string }) => Promise<void>;
    taxonomy?: Taxonomy | null;
}

const taxonomyTypes: { value: TaxonomyType; label: string }[] = [
    { value: "neighborhood", label: "Neighborhood" },
    { value: "amenity", label: "Amenity" },
    { value: "service", label: "Service" },
    { value: "care-type", label: "Care Type" },
];

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

export function TaxonomyForm({ isOpen, onClose, onSave, taxonomy }: TaxonomyFormProps) {
    const [type, setType] = useState<TaxonomyType>("neighborhood");
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!taxonomy;

    useEffect(() => {
        if (taxonomy) {
            setType(taxonomy.type);
            setName(taxonomy.name);
            setSlug(taxonomy.slug);
            setDescription(taxonomy.description || "");
        } else {
            setType("neighborhood");
            setName("");
            setSlug("");
            setDescription("");
        }
        setError(null);
    }, [taxonomy, isOpen]);

    useEffect(() => {
        if (!isEditing && name) {
            setSlug(generateSlug(name));
        }
    }, [name, isEditing]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await onSave({
                type,
                name: name.trim(),
                slug: slug.trim(),
                description: description.trim() || undefined,
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SlidePanel
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? "Edit Taxonomy" : "Add New Taxonomy"}
            subtitle="Enter the taxonomy details below"
        >
            {error && (
                <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information Section */}
                <div>
                    <h3 className="text-xs font-semibold text-accent uppercase tracking-wider mb-4">
                        Basic Information
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="type" className="block text-sm text-zinc-400 mb-2">
                                Type
                            </label>
                            <select
                                id="type"
                                value={type}
                                onChange={(e) => setType(e.target.value as TaxonomyType)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent/50 transition-colors"
                            >
                                {taxonomyTypes.map((t) => (
                                    <option key={t.value} value={t.value} className="bg-[#0b1115]">
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-sm text-zinc-400 mb-2">
                                Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-accent/50 transition-colors"
                                placeholder="e.g., Downtown, Pool, Assisted Living"
                            />
                        </div>

                        <div>
                            <label htmlFor="slug" className="block text-sm text-zinc-400 mb-2">
                                Slug
                            </label>
                            <input
                                type="text"
                                id="slug"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                required
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-accent/50 transition-colors"
                                placeholder="auto-generated-from-name"
                            />
                        </div>
                    </div>
                </div>

                {/* Additional Details Section */}
                <div>
                    <h3 className="text-xs font-semibold text-accent uppercase tracking-wider mb-4">
                        Additional Details
                    </h3>

                    <div>
                        <label htmlFor="description" className="block text-sm text-zinc-400 mb-2">
                            Description
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-accent/50 transition-colors resize-none"
                            placeholder="Optional description..."
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2 rounded-lg bg-accent text-white font-bold hover:bg-accent-light disabled:opacity-50 transition-colors"
                    >
                        {isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
                    </button>
                </div>
            </form>
        </SlidePanel>
    );
}
