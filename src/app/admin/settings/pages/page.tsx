"use client";

import { useState, useEffect } from "react";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useNotification } from "@/contexts/NotificationContext";
import { HeartLoader } from "@/components/ui/HeartLoader";
import { SlidePanel } from "@/components/admin/SlidePanel";
import { SeoTab } from "@/components/admin/forms/SeoTab";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { getPages, createPage, updatePage, deletePage, type Page } from "@/lib/services/pagesService";
import type { SeoFields } from "@/types";

function slugify(label: string): string {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function PagesSettingsPage() {
    const { isSuperAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    const { showNotification } = useNotification();

    const [pages, setPages] = useState<Page[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Panel state — null = closed, Page = editing, 'new' = creating
    const [panelMode, setPanelMode] = useState<'edit' | 'create' | null>(null);
    const [editingPage, setEditingPage] = useState<Page | null>(null);

    // Label / slug form (used for both create and edit)
    const [newLabel, setNewLabel] = useState('');
    const [newSlug, setNewSlug] = useState('');
    const [slugEdited, setSlugEdited] = useState(false);
    const [slugError, setSlugError] = useState('');

    // Shared SEO fields
    const [seoFields, setSeoFields] = useState<SeoFields>({});
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Delete
    const [deleteTarget, setDeleteTarget] = useState<Page | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!authLoading && !isSuperAdmin) {
            router.push("/admin");
            showNotification("Access Denied", "You do not have permission to view this page.");
        }
    }, [isSuperAdmin, authLoading, router, showNotification]);

    useEffect(() => {
        if (!authLoading && isSuperAdmin) {
            getPages()
                .then(setPages)
                .catch(() => showNotification("Error", "Failed to load pages."))
                .finally(() => setIsLoading(false));
        }
    }, [isSuperAdmin, authLoading, showNotification]);

    function openCreate() {
        setNewLabel('');
        setNewSlug('');
        setSlugEdited(false);
        setSlugError('');
        setSeoFields({});
        setIsDirty(false);
        setPanelMode('create');
    }

    function openEdit(page: Page) {
        setEditingPage(page);
        setNewLabel(page.label);
        setNewSlug(page.slug);
        setSlugEdited(false);
        setSlugError('');
        setSeoFields({
            metaTitle: page.metaTitle || null,
            metaDescription: page.metaDescription || null,
            canonicalUrl: page.canonicalUrl || null,
            indexable: page.indexable,
            ogTitle: page.ogTitle || null,
            ogDescription: page.ogDescription || null,
            ogImageUrl: page.ogImageUrl || null,
            schemaJson: page.schemaJson,
        });
        setIsDirty(false);
        setPanelMode('edit');
    }

    function closePanel() {
        setPanelMode(null);
        setEditingPage(null);
        setNewLabel('');
        setNewSlug('');
        setSlugEdited(false);
        setSlugError('');
        setIsDirty(false);
    }

    function handleLabelChange(val: string) {
        setNewLabel(val);
        if (!slugEdited) {
            setNewSlug(slugify(val));
        }
        setIsDirty(true);
        setSlugError('');
    }

    function handleSlugChange(val: string) {
        setNewSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, ''));
        setSlugEdited(true);
        setIsDirty(true);
        setSlugError('');
    }

    async function handleSave() {
        if (panelMode === 'create') {
            if (!newLabel.trim()) return;
            if (!newSlug.trim()) { setSlugError('Slug is required'); return; }
            if (pages.some(p => p.slug === newSlug)) {
                setSlugError('This slug is already in use');
                return;
            }
            setIsSaving(true);
            try {
                const created = await createPage({
                    slug: newSlug,
                    label: newLabel.trim(),
                    metaTitle: seoFields.metaTitle ?? '',
                    metaDescription: seoFields.metaDescription ?? '',
                    canonicalUrl: seoFields.canonicalUrl ?? '',
                    indexable: seoFields.indexable ?? true,
                    ogTitle: seoFields.ogTitle ?? '',
                    ogDescription: seoFields.ogDescription ?? '',
                    ogImageUrl: seoFields.ogImageUrl ?? '',
                    schemaJson: seoFields.schemaJson ?? null,
                });
                setPages(prev => [...prev, created].sort((a, b) => a.label.localeCompare(b.label)));
                showNotification("Created", `"${created.label}" has been added.`);
                closePanel();
            } catch (err) {
                showNotification("Error", err instanceof Error ? err.message : "Failed to create page.");
            } finally {
                setIsSaving(false);
            }
        } else if (panelMode === 'edit' && editingPage) {
            if (!newLabel.trim()) return;
            if (!newSlug.trim()) { setSlugError('Slug is required'); return; }
            if (pages.some(p => p.slug === newSlug && p.id !== editingPage.id)) {
                setSlugError('This slug is already in use');
                return;
            }
            setIsSaving(true);
            try {
                await updatePage(editingPage.id, {
                    label: newLabel.trim(),
                    slug: newSlug,
                    metaTitle: seoFields.metaTitle ?? '',
                    metaDescription: seoFields.metaDescription ?? '',
                    canonicalUrl: seoFields.canonicalUrl ?? '',
                    indexable: seoFields.indexable ?? true,
                    ogTitle: seoFields.ogTitle ?? '',
                    ogDescription: seoFields.ogDescription ?? '',
                    ogImageUrl: seoFields.ogImageUrl ?? '',
                    schemaJson: seoFields.schemaJson ?? null,
                });
                setPages(prev => prev.map(p =>
                    p.id === editingPage.id
                        ? {
                            ...p,
                            label: newLabel.trim(),
                            slug: newSlug,
                            metaTitle: seoFields.metaTitle ?? '',
                            metaDescription: seoFields.metaDescription ?? '',
                            canonicalUrl: seoFields.canonicalUrl ?? '',
                            indexable: seoFields.indexable ?? true,
                            ogTitle: seoFields.ogTitle ?? '',
                            ogDescription: seoFields.ogDescription ?? '',
                            ogImageUrl: seoFields.ogImageUrl ?? '',
                            schemaJson: seoFields.schemaJson ?? null,
                        }
                        : p
                ));
                showNotification("Saved", `"${newLabel.trim()}" has been updated.`);
                setIsDirty(false);
                closePanel();
            } catch {
                showNotification("Error", "Failed to save page.");
            } finally {
                setIsSaving(false);
            }
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await deletePage(deleteTarget.id);
            setPages(prev => prev.filter(p => p.id !== deleteTarget.id));
            showNotification("Deleted", `"${deleteTarget.label}" has been removed.`);
            setDeleteTarget(null);
        } catch {
            showNotification("Error", "Failed to delete page.");
        } finally {
            setIsDeleting(false);
        }
    }

    if (isLoading || authLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <HeartLoader />
            </div>
        );
    }

    if (!isSuperAdmin) return null;

    const panelTitle = panelMode === 'create' ? 'New Page' : (newLabel || editingPage?.label || '');
    const canSave = panelMode === 'create'
        ? (!!newLabel.trim() && !!newSlug.trim())
        : (!!newLabel.trim() && !!newSlug.trim() && isDirty);

    return (
        <>
            {/* Header */}
            <div className="flex-none p-4 md:p-8 pb-4 md:pb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-accent/10 rounded-lg flex items-center justify-center">
                            <FileText className="h-6 w-6 text-accent" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-content-primary">Pages</h1>
                            <p className="text-xs md:text-sm text-content-secondary mt-1">
                                Manage SEO metadata for static pages
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 transition-opacity"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">New Page</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-hidden px-4 md:px-8 pb-4 md:pb-8">
                <div className="bg-surface-card rounded-xl h-full flex flex-col overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-auto">
                        <table className="w-full table-fixed text-sm">
                            <thead className="table-header sticky top-0 z-10">
                                <tr>
                                    <th className="text-left px-6 py-3">Page</th>
                                    <th className="text-left px-6 py-3 hidden sm:table-cell w-36">Slug</th>
                                    <th className="text-left px-6 py-3 hidden md:table-cell">Meta Title</th>
                                    <th className="px-3 py-3 border-l border-ui-border w-[92px]"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {pages.map((page) => (
                                    <tr key={page.id} className="table-row group cursor-pointer" onClick={() => openEdit(page)}>
                                        <td className="px-6 py-[5px]">
                                            <span className="font-medium text-content-primary group-hover:text-accent transition-colors">{page.label}</span>
                                        </td>
                                        <td className="px-6 py-[5px] hidden sm:table-cell">
                                            <span className="text-content-muted font-mono text-xs">/{page.slug}</span>
                                        </td>
                                        <td className="px-6 py-[5px] hidden md:table-cell">
                                            <span className="text-content-secondary">
                                                {page.metaTitle || <span className="text-content-muted italic">Not set</span>}
                                            </span>
                                        </td>
                                        <td className="px-3 py-[5px] border-l border-ui-border" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-end gap-1">
                                                <button className="btn-ghost" onClick={() => openEdit(page)}>
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button className="btn-danger" onClick={() => setDeleteTarget(page)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create / Edit Panel */}
            <SlidePanel
                isOpen={!!panelMode}
                onClose={closePanel}
                title={panelTitle}
                subtitle="SEO Settings"
                width={680}
                offsetSidebar
                actions={
                    <button
                        onClick={handleSave}
                        disabled={!canSave || isSaving}
                        className="px-4 py-1.5 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    >
                        {isSaving ? 'Saving…' : panelMode === 'create' ? 'Create' : 'Save'}
                    </button>
                }
            >
                {(panelMode === 'create' || panelMode === 'edit') && (
                    <div className="mb-6 p-[5px] bg-surface-input rounded-lg space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted px-1.5 pt-1 pb-0.5">
                            Page Details
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3 p-[3px] bg-surface-hover rounded-lg">
                            <div className="sm:min-w-[140px] sm:pt-1.5">
                                <p className="text-sm font-medium text-content-secondary">Label</p>
                                <p className="text-[10px] text-content-muted mt-0.5">Display name</p>
                            </div>
                            <div className="sm:flex-1">
                                <input
                                    type="text"
                                    value={newLabel}
                                    onChange={e => handleLabelChange(e.target.value)}
                                    placeholder="e.g. Privacy Policy"
                                    className="form-input px-3 h-8 w-full text-sm"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3 p-[3px] bg-surface-hover rounded-lg">
                            <div className="sm:min-w-[140px] sm:pt-1.5">
                                <p className="text-sm font-medium text-content-secondary">Slug</p>
                                <p className="text-[10px] text-content-muted mt-0.5">URL identifier</p>
                            </div>
                            <div className="sm:flex-1 space-y-1">
                                <div className="flex items-center">
                                    <span className="px-2 h-8 flex items-center text-sm text-content-muted bg-surface-input rounded-l-lg border border-r-0 border-ui-border">
                                        /
                                    </span>
                                    <input
                                        type="text"
                                        value={newSlug}
                                        onChange={e => handleSlugChange(e.target.value)}
                                        placeholder="privacy-policy"
                                        className="form-input px-3 h-8 flex-1 text-sm font-mono rounded-l-none"
                                    />
                                </div>
                                {slugError && (
                                    <p className="text-xs text-red-400">{slugError}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                <SeoTab
                    seo={seoFields}
                    onChange={(field, value) => { setSeoFields(prev => ({ ...prev, [field]: value })); setIsDirty(true); }}
                    setIsDirty={setIsDirty}
                />
            </SlidePanel>

            {/* Delete Confirmation */}
            <ConfirmationModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title={`Delete "${deleteTarget?.label}"?`}
                message="This will permanently remove this page and its SEO settings. This action cannot be undone."
                confirmLabel="Delete Page"
                isDangerous
                isLoading={isDeleting}
            />
        </>
    );
}
