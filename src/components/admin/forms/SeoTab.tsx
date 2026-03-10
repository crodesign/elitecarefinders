"use client";

import { useState, useEffect } from "react";
import { Search, Globe, Image, ToggleLeft, ToggleRight, Code, ChevronDown, ChevronUp, AlertCircle, Sparkles, HelpCircle, Save, CheckCircle } from "lucide-react";
import type { SeoFields } from "@/types";

export interface SeoTabProps {
    seo: SeoFields;
    onChange: (field: keyof SeoFields, value: SeoFields[keyof SeoFields]) => void;
    setIsDirty: (v: boolean) => void;
    /** Fallback values shown as placeholder text when SEO field is empty */
    defaults?: {
        title?: string;
        description?: string;
        ogImage?: string;
    };
    /** When set, shows the "Generate SEO with AI" button */
    recordId?: string;
    contentType?: 'home' | 'facility' | 'post';
    /** When set, shows a dedicated Save SEO button */
    onSaveSeo?: () => Promise<void>;
}

function CharCounter({ value, soft, hard }: { value: string; soft: number; hard?: number }) {
    const len = value.length;
    const limit = hard ?? soft;
    const color =
        len === 0 ? "text-content-muted" :
        len <= soft ? "text-emerald-500" :
        len <= limit ? "text-amber-500" :
        "text-red-500";

    return (
        <span className={`text-[10px] font-mono tabular-nums ${color}`}>
            {len}/{soft}
        </span>
    );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-3 p-[5px] bg-surface-hover rounded-lg">
            <div className="min-w-[140px] pt-1.5">
                <p className="text-sm font-medium text-content-secondary">{label}</p>
                {hint && <p className="text-[10px] text-content-muted mt-0.5">{hint}</p>}
            </div>
            <div className="flex-1">{children}</div>
        </div>
    );
}

export function SeoTab({ seo, onChange, setIsDirty, defaults = {}, recordId, contentType, onSaveSeo }: SeoTabProps) {
    const [schemaExpanded, setSchemaExpanded] = useState(false);
    const [schemaText, setSchemaText] = useState("");
    const [schemaError, setSchemaError] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiFaqs, setAiFaqs] = useState<{ question: string; answer: string }[]>([]);
    const [seoDirty, setSeoDirty] = useState(false);
    const [seoSaving, setSeoSaving] = useState(false);
    const [seoSaved, setSeoSaved] = useState(false);

    // Sync schemaText with the seo.schemaJson prop (e.g. on form open)
    useEffect(() => {
        if (seo.schemaJson) {
            setSchemaText(JSON.stringify(seo.schemaJson, null, 2));
        } else {
            setSchemaText("");
        }
    }, [seo.schemaJson]);

    function set<K extends keyof SeoFields>(field: K, value: SeoFields[K]) {
        onChange(field, value);
        setSeoDirty(true);
        setSeoSaved(false);
    }

    async function handleSaveSeo() {
        if (!onSaveSeo) return;
        setSeoSaving(true);
        try {
            await onSaveSeo();
            setSeoDirty(false);
            setSeoSaved(true);
            setTimeout(() => setSeoSaved(false), 3000);
        } finally {
            setSeoSaving(false);
        }
    }

    function handleSchemaChange(raw: string) {
        setSchemaText(raw);
        setSchemaError(null);
        if (!raw.trim()) {
            onChange("schemaJson", null);
            setSeoDirty(true);
            setSeoSaved(false);
            return;
        }
        try {
            const parsed = JSON.parse(raw);
            onChange("schemaJson", parsed);
            setSeoDirty(true);
            setSeoSaved(false);
        } catch {
            setSchemaError("Invalid JSON — changes will not be saved until fixed.");
        }
    }

    function prettifySchema() {
        try {
            const parsed = JSON.parse(schemaText);
            const pretty = JSON.stringify(parsed, null, 2);
            setSchemaText(pretty);
            setSchemaError(null);
        } catch {
            setSchemaError("Cannot prettify — JSON is invalid.");
        }
    }

    async function handleGenerateSeo() {
        if (!recordId || !contentType) return;
        setAiLoading(true);
        setAiError(null);
        try {
            const res = await fetch('/api/generate-seo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recordId, contentType }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || data.error || 'AI generation failed');
            if (data.metaTitle) { onChange('metaTitle', data.metaTitle); setSeoDirty(true); setSeoSaved(false); }
            if (data.metaDescription) { onChange('metaDescription', data.metaDescription); setSeoDirty(true); setSeoSaved(false); }
            if (data.ogTitle) { onChange('ogTitle', data.ogTitle); setSeoDirty(true); setSeoSaved(false); }
            if (data.ogDescription) { onChange('ogDescription', data.ogDescription); setSeoDirty(true); setSeoSaved(false); }
            if (Array.isArray(data.faqs) && data.faqs.length > 0) setAiFaqs(data.faqs);
        } catch (err) {
            setAiError(err instanceof Error ? err.message : 'AI generation failed. Please try again.');
        } finally {
            setAiLoading(false);
        }
    }

    const metaTitleVal = seo.metaTitle || "";
    const metaDescVal = seo.metaDescription || "";
    const ogTitleVal = seo.ogTitle || "";
    const ogDescVal = seo.ogDescription || "";
    const ogImageVal = seo.ogImageUrl || "";
    const canonicalVal = seo.canonicalUrl || "";
    const indexable = seo.indexable ?? true;

    return (
        <div className="space-y-5">

            {/* AI Generate */}
            {recordId && contentType && (
                <div className="bg-surface-input rounded-lg p-[5px]">
                    <div className="flex items-center justify-between gap-4 p-[5px] bg-surface-hover rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-content-primary flex items-center gap-1.5">
                                <Sparkles className="h-4 w-4 text-accent" />
                                Generate SEO with AI
                            </p>
                            <p className="text-[10px] text-content-muted mt-0.5">
                                AI suggestions based on your content. Review and adjust before saving.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleGenerateSeo}
                            disabled={aiLoading}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shrink-0"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            {aiLoading ? 'Generating…' : 'Generate'}
                        </button>
                    </div>
                    {aiError && (
                        <div className="flex items-center gap-1.5 text-red-500 text-xs px-2 pt-2">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {aiError}
                        </div>
                    )}
                </div>
            )}

            {/* Two-column: Search Appearance + Social/Open Graph */}
            <div className="grid grid-cols-2 gap-5">

                {/* Search Appearance */}
                <div className="bg-surface-input rounded-lg p-[5px] space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted px-1.5 pt-1 pb-0.5 flex items-center gap-1.5">
                        <Search className="h-3 w-3" />
                        Search Appearance
                    </p>

                    <FieldRow
                        label="Meta Title"
                        hint="~60 chars recommended"
                    >
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={metaTitleVal}
                                onChange={e => set("metaTitle", e.target.value || null)}
                                placeholder={defaults.title || "Auto-generated from title"}
                                maxLength={120}
                                className="form-input px-3 h-8 flex-1 text-sm"
                            />
                            <CharCounter value={metaTitleVal} soft={60} hard={120} />
                        </div>
                    </FieldRow>

                    <FieldRow
                        label="Meta Description"
                        hint="~155–160 chars recommended"
                    >
                        <div className="space-y-1">
                            <textarea
                                value={metaDescVal}
                                onChange={e => set("metaDescription", e.target.value || null)}
                                placeholder={defaults.description ? defaults.description.slice(0, 80) + "…" : "Auto-generated from description"}
                                maxLength={320}
                                rows={3}
                                className="form-input px-3 py-2 w-full text-sm resize-none"
                            />
                            <div className="flex justify-end">
                                <CharCounter value={metaDescVal} soft={160} hard={320} />
                            </div>
                        </div>
                    </FieldRow>

                    <FieldRow label="Canonical URL" hint="Leave blank to use the page URL">
                        <input
                            type="url"
                            value={canonicalVal}
                            onChange={e => set("canonicalUrl", e.target.value || null)}
                            placeholder="https://www.elitecarefinders.com/…"
                            className="form-input px-3 h-8 w-full text-sm font-mono"
                        />
                    </FieldRow>

                    <FieldRow label="Indexable" hint="Allow search engines to index this page">
                        <button
                            type="button"
                            onClick={() => set("indexable", !indexable)}
                            className="flex items-center gap-2 group"
                        >
                            {indexable ? (
                                <>
                                    <ToggleRight className="h-5 w-5 text-emerald-500" />
                                    <span className="text-sm text-emerald-600 font-medium">Index this page</span>
                                </>
                            ) : (
                                <>
                                    <ToggleLeft className="h-5 w-5 text-content-muted" />
                                    <span className="text-sm text-content-muted font-medium">Noindex (excluded from search)</span>
                                </>
                            )}
                        </button>
                    </FieldRow>
                </div>

                {/* Open Graph / Social */}
                <div className="bg-surface-input rounded-lg p-[5px] space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted px-1.5 pt-1 pb-0.5 flex items-center gap-1.5">
                        <Globe className="h-3 w-3" />
                        Social / Open Graph
                    </p>

                    <FieldRow label="OG Title" hint="Leave blank to use Meta Title">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={ogTitleVal}
                                onChange={e => set("ogTitle", e.target.value || null)}
                                placeholder={metaTitleVal || defaults.title || "Inherits from Meta Title"}
                                maxLength={120}
                                className="form-input px-3 h-8 flex-1 text-sm"
                            />
                            <CharCounter value={ogTitleVal} soft={60} hard={120} />
                        </div>
                    </FieldRow>

                    <FieldRow label="OG Description" hint="Leave blank to use Meta Description">
                        <div className="space-y-1">
                            <textarea
                                value={ogDescVal}
                                onChange={e => set("ogDescription", e.target.value || null)}
                                placeholder={metaDescVal || "Inherits from Meta Description"}
                                maxLength={320}
                                rows={3}
                                className="form-input px-3 py-2 w-full text-sm resize-none"
                            />
                            <div className="flex justify-end">
                                <CharCounter value={ogDescVal} soft={160} hard={320} />
                            </div>
                        </div>
                    </FieldRow>

                    <FieldRow label="OG Image URL" hint="Leave blank to use the main image">
                        <div className="space-y-1.5">
                            <input
                                type="url"
                                value={ogImageVal}
                                onChange={e => set("ogImageUrl", e.target.value || null)}
                                placeholder={defaults.ogImage || "https://… or leave blank for main image"}
                                className="form-input px-3 h-8 w-full text-sm font-mono"
                            />
                            {(ogImageVal || defaults.ogImage) && (
                                <div className="flex items-center gap-2">
                                    <img
                                        src={ogImageVal || defaults.ogImage}
                                        alt="OG preview"
                                        className="h-12 w-20 object-cover rounded border border-surface-hover"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                    <p className="text-[10px] text-content-muted">
                                        {ogImageVal ? "Custom OG image" : "Default: main image"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </FieldRow>
                </div>
            </div>

            {/* Advanced: JSON-LD override */}
            <div className="bg-surface-input rounded-lg overflow-hidden">
                <button
                    type="button"
                    onClick={() => setSchemaExpanded(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-surface-hover transition-colors"
                >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-content-muted flex items-center gap-1.5">
                        <Code className="h-3 w-3" />
                        Advanced: JSON-LD Override
                    </span>
                    {schemaExpanded ? <ChevronUp className="h-3.5 w-3.5 text-content-muted" /> : <ChevronDown className="h-3.5 w-3.5 text-content-muted" />}
                </button>

                {schemaExpanded && (
                    <div className="px-[5px] pb-[5px] space-y-2">
                        <div className="p-[5px] bg-surface-hover rounded-lg space-y-2">
                            <p className="text-[10px] text-content-muted px-1">
                                Paste a valid JSON-LD object here to merge with or override the auto-generated structured data. Leave blank to use defaults.
                            </p>
                            <textarea
                                value={schemaText}
                                onChange={e => handleSchemaChange(e.target.value)}
                                rows={8}
                                spellCheck={false}
                                placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "...",\n  ...\n}'}
                                className="form-input px-3 py-2 w-full text-xs font-mono resize-y"
                            />
                            {schemaError && (
                                <div className="flex items-center gap-1.5 text-red-500 text-xs px-1">
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                    {schemaError}
                                </div>
                            )}
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={prettifySchema}
                                    className="px-3 py-1 text-xs font-medium rounded-md bg-surface-input text-content-secondary hover:text-content-primary transition-colors"
                                >
                                    Prettify JSON
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* AI-generated FAQs */}
            {aiFaqs.length > 0 && (
                <div className="bg-surface-input rounded-lg p-[5px] space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted px-1.5 pt-1 pb-0.5 flex items-center gap-1.5">
                        <HelpCircle className="h-3 w-3" />
                        AI-Suggested FAQs
                    </p>
                    <p className="text-[10px] text-content-muted px-1.5 pb-1">
                        Copy these into your content or schema JSON-LD as needed.
                    </p>
                    <div className="space-y-1.5 px-[5px] pb-[5px]">
                        {aiFaqs.map((faq, i) => (
                            <div key={i} className="p-[5px] bg-surface-hover rounded-lg space-y-1">
                                <p className="text-xs font-medium text-content-primary px-1">{faq.question}</p>
                                <p className="text-xs text-content-secondary px-1 pb-1">{faq.answer}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Save SEO button */}
            {onSaveSeo && (
                <div className="flex items-center justify-between gap-3 pt-1 pb-2 px-1">
                    <p className="text-[10px] text-content-muted">
                        Fields left blank will use auto-generated values. SEO saves independently — does not update "last modified" date.
                    </p>
                    <button
                        type="button"
                        onClick={handleSaveSeo}
                        disabled={seoSaving || (!seoDirty && !seoSaved)}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-surface-input text-content-primary hover:bg-surface-hover"
                    >
                        {seoSaved ? (
                            <><CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Saved</>
                        ) : (
                            <><Save className="h-3.5 w-3.5" /> {seoSaving ? 'Saving…' : 'Save SEO'}</>
                        )}
                    </button>
                </div>
            )}
            {!onSaveSeo && (
                <p className="text-[10px] text-content-muted px-1 pb-2">
                    Fields left blank will use auto-generated values based on the main content. Changes take effect after saving.
                </p>
            )}
        </div>
    );
}
