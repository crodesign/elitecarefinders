"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Taxonomy, TaxonomyType } from "@/types";

interface TaxonomyModalProps {
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

export function TaxonomyModal({ isOpen, onClose, onSave, taxonomy }: TaxonomyModalProps) {
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="w-full max-w-md card p-6">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">
                        {isEditing ? "Edit Taxonomy" : "Add Taxonomy"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="btn-ghost"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="type" className="block text-sm font-medium text-zinc-300 mb-1">
                            Type
                        </label>
                        <select
                            id="type"
                            value={type}
                            onChange={(e) => setType(e.target.value as TaxonomyType)}
                            className="input-field"
                        >
                            {taxonomyTypes.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1">
                            Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="input-field"
                            placeholder="e.g., Downtown, Pool, Assisted Living"
                        />
                    </div>

                    <div>
                        <label htmlFor="slug" className="block text-sm font-medium text-zinc-300 mb-1">
                            Slug
                        </label>
                        <input
                            type="text"
                            id="slug"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            required
                            className="input-field"
                            placeholder="auto-generated-from-name"
                        />
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-1">
                            Description
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="input-field resize-none"
                            placeholder="Optional description..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary disabled:opacity-50"
                        >
                            {isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
