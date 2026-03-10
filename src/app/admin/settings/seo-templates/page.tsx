"use client";

import { useState, useEffect } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useNotification } from "@/contexts/NotificationContext";
import { HeartLoader } from "@/components/ui/HeartLoader";
import { getSeoTemplates, saveSeoTemplates, type SeoTemplate } from "@/lib/services/siteSettingsService";

function CharCounter({ value, soft }: { value: string; soft: number }) {
    const len = value.length;
    const color = len === 0 ? "text-content-muted" : len <= soft ? "text-emerald-500" : "text-amber-500";
    return <span className={`text-[10px] font-mono tabular-nums ${color}`}>{len}/{soft}</span>;
}

export default function SeoTemplatesPage() {
    const { isSuperAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    const { showNotification } = useNotification();

    const [templates, setTemplates] = useState<SeoTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!authLoading && !isSuperAdmin) {
            router.push("/admin");
            showNotification("Access Denied", "You do not have permission to view this page.");
        }
    }, [isSuperAdmin, authLoading, router, showNotification]);

    useEffect(() => {
        if (!authLoading && isSuperAdmin) {
            getSeoTemplates()
                .then(data => {
                    setTemplates(data);
                    const exp: Record<string, boolean> = {};
                    data.forEach(t => { exp[t.id] = true; });
                    setExpanded(exp);
                })
                .catch(() => showNotification("Error", "Failed to load SEO templates."))
                .finally(() => setIsLoading(false));
        }
    }, [isSuperAdmin, authLoading, showNotification]);

    function updateTemplate(id: string, field: keyof Pick<SeoTemplate, 'metaTitle' | 'metaDescription' | 'ogTitle' | 'ogDescription'>, value: string) {
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
        setIsDirty(true);
    }

    async function handleSave() {
        setIsSaving(true);
        try {
            await saveSeoTemplates(templates);
            showNotification("Saved", "SEO templates have been updated.");
            setIsDirty(false);
        } catch {
            showNotification("Error", "Failed to save SEO templates.");
        } finally {
            setIsSaving(false);
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

    return (
        <>
            {/* Header */}
            <div className="flex-none p-4 md:p-8 pb-4 md:pb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-accent/10 rounded-lg flex items-center justify-center">
                            <Search className="h-6 w-6 text-accent" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-content-primary">SEO Templates</h1>
                            <p className="text-xs md:text-sm text-content-secondary mt-1">
                                Default meta tags for dynamic search and listing pages
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={!isDirty || isSaving}
                        className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    >
                        {isSaving ? 'Saving…' : 'Save All'}
                    </button>
                </div>
            </div>

            {/* Templates */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 pb-4 md:pb-8 space-y-4">
                {templates.map(template => (
                    <div key={template.id} className="bg-surface-input rounded-xl overflow-hidden">
                        {/* Template Header */}
                        <button
                            type="button"
                            onClick={() => setExpanded(prev => ({ ...prev, [template.id]: !prev[template.id] }))}
                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-hover transition-colors"
                        >
                            <div>
                                <p className="text-sm font-semibold text-content-primary">{template.label}</p>
                                <p className="text-xs text-content-muted mt-0.5">{template.description}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                {template.variables.length > 0 && (
                                    <div className="hidden sm:flex items-center gap-1 flex-wrap justify-end">
                                        {template.variables.map(v => (
                                            <span key={v} className="text-[10px] font-mono px-1.5 py-0.5 bg-surface-hover rounded text-accent">
                                                {`{{${v}}}`}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {expanded[template.id]
                                    ? <ChevronUp className="h-4 w-4 text-content-muted" />
                                    : <ChevronDown className="h-4 w-4 text-content-muted" />}
                            </div>
                        </button>

                        {/* Template Fields */}
                        {expanded[template.id] && (
                            <div className="px-4 pb-4 space-y-3 border-t border-ui-border pt-3">
                                {template.variables.length > 0 && (
                                    <p className="text-[10px] text-content-muted">
                                        Available variables: {template.variables.map(v => `{{${v}}}`).join(', ')}
                                    </p>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-content-secondary">Meta Title</label>
                                        <input
                                            type="text"
                                            value={template.metaTitle}
                                            onChange={e => updateTemplate(template.id, 'metaTitle', e.target.value)}
                                            placeholder="e.g. Senior Homes in {{location}} | EliteCareFinders"
                                            maxLength={120}
                                            className="form-input px-3 h-8 w-full text-sm"
                                        />
                                        <div className="flex justify-end">
                                            <CharCounter value={template.metaTitle} soft={60} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-content-secondary">OG Title</label>
                                        <input
                                            type="text"
                                            value={template.ogTitle}
                                            onChange={e => updateTemplate(template.id, 'ogTitle', e.target.value)}
                                            placeholder="Leave blank to use Meta Title"
                                            maxLength={120}
                                            className="form-input px-3 h-8 w-full text-sm"
                                        />
                                        <div className="flex justify-end">
                                            <CharCounter value={template.ogTitle} soft={60} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-content-secondary">Meta Description</label>
                                        <textarea
                                            value={template.metaDescription}
                                            onChange={e => updateTemplate(template.id, 'metaDescription', e.target.value)}
                                            placeholder="Brief description used in search results"
                                            maxLength={320}
                                            rows={3}
                                            className="form-input px-3 py-2 w-full text-sm resize-none"
                                        />
                                        <div className="flex justify-end">
                                            <CharCounter value={template.metaDescription} soft={160} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-content-secondary">OG Description</label>
                                        <textarea
                                            value={template.ogDescription}
                                            onChange={e => updateTemplate(template.id, 'ogDescription', e.target.value)}
                                            placeholder="Leave blank to use Meta Description"
                                            maxLength={320}
                                            rows={3}
                                            className="form-input px-3 py-2 w-full text-sm resize-none"
                                        />
                                        <div className="flex justify-end">
                                            <CharCounter value={template.ogDescription} soft={160} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
}
