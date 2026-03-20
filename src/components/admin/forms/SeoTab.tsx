"use client";

import { useState, useEffect } from "react";
import { Search, Globe, ToggleLeft, ToggleRight, Code, ChevronDown, ChevronUp, AlertCircle, Sparkles, HelpCircle, Info } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import type { SeoFields } from "@/types";
import { SerpPreview } from "@/components/admin/seo/SerpPreview";
import { OgCardPreview } from "@/components/admin/seo/OgCardPreview";
import { scoreSeo, scoreBgColor } from "@/lib/seoScore";

const BASE_URL = 'https://www.elitecarefinders.com';

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
    /** Used to construct the preview URL when canonicalUrl is not set */
    pathPrefix?: string;
    slug?: string;
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

function InfoTooltip({ text }: { text: string }) {
    return (
        <Tooltip content={text} side="right" delayDuration={200}>
            <span className="inline-flex items-center cursor-default text-content-muted hover:text-content-secondary transition-colors">
                <Info className="h-3 w-3" />
            </span>
        </Tooltip>
    );
}

function FieldRow({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3 p-[3px] bg-surface-hover rounded-lg">
            <div className="sm:min-w-[140px] sm:pt-1.5">
                <p className="text-sm font-medium text-content-secondary flex items-center gap-1">
                    {label}
                    {tooltip && <InfoTooltip text={tooltip} />}
                </p>
            </div>
            <div className="sm:flex-1 space-y-1">
                {children}
            </div>
        </div>
    );
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function SeoTab({ seo, onChange, setIsDirty, defaults = {}, recordId, contentType, pathPrefix, slug, onSaveSeo }: SeoTabProps) {
    const [schemaExpanded, setSchemaExpanded] = useState(false);
    const [schemaText, setSchemaText] = useState("");
    const [schemaError, setSchemaError] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiFaqs, setAiFaqs] = useState<{ question: string; answer: string }[]>([]);
    const [seoDirty, setSeoDirty] = useState(false);
    const [seoSaving, setSeoSaving] = useState(false);
    const [seoSaved, setSeoSaved] = useState(false);
    const [scoreExpanded, setScoreExpanded] = useState(false);
    const [primaryKeyword, setPrimaryKeyword] = useState<string | null>(null);

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
        setPrimaryKeyword(null);
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
            if (data.primaryKeyword) setPrimaryKeyword(data.primaryKeyword);
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

    // Resolved values for previews
    const serpTitle = metaTitleVal || defaults.title || '';
    const serpDesc = metaDescVal || (defaults.description ? stripHtml(defaults.description) : '');
    const serpUrl = canonicalVal || (pathPrefix && slug ? `${BASE_URL}/${pathPrefix}/${slug}` : BASE_URL);
    const ogTitleResolved = ogTitleVal || metaTitleVal || defaults.title || '';
    const ogDescResolved = ogDescVal || metaDescVal || (defaults.description ? stripHtml(defaults.description) : '');
    const ogImageResolved = ogImageVal || defaults.ogImage || '';

    // SEO score
    const { score, grade, criteria } = scoreSeo(seo);

    return (
        <div className="space-y-5">

            {/* SEO Quality Score */}
            <div className="bg-surface-input rounded-lg p-[5px]">
                <button
                    type="button"
                    onClick={() => setScoreExpanded(v => !v)}
                    className="w-full flex items-center justify-between p-[3px] bg-surface-hover rounded-lg hover:opacity-80 transition-opacity"
                >
                    <span className="text-sm font-medium text-content-primary">SEO Quality Score</span>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBgColor(score)}`}>
                            {grade} &middot; {score}/100
                        </span>
                        {scoreExpanded ? <ChevronUp className="h-3.5 w-3.5 text-content-muted" /> : <ChevronDown className="h-3.5 w-3.5 text-content-muted" />}
                    </div>
                </button>
                {scoreExpanded && (
                    <div className="px-[3px] pt-2 pb-[3px] space-y-0.5">
                        {criteria.map(c => (
                            <div key={c.label} className="flex items-center gap-2 px-1 py-1">
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                    c.status === 'good' ? 'bg-emerald-500' :
                                    c.status === 'warn' ? 'bg-amber-500' : 'bg-red-500'
                                }`} />
                                <span className="text-xs font-medium text-content-secondary w-32 shrink-0">{c.label}</span>
                                <span className="text-[10px] text-content-muted flex-1 min-w-0 truncate">{c.note}</span>
                                <span className={`text-[10px] font-mono shrink-0 ${
                                    c.points === c.maxPoints ? 'text-emerald-500' :
                                    c.points > 0 ? 'text-amber-500' : 'text-red-400'
                                }`}>{c.points}/{c.maxPoints}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* AI Generate */}
            {recordId && contentType && (
                <div className="bg-surface-input rounded-lg p-[5px]">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-[3px] bg-surface-hover rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-content-primary flex items-center gap-1.5">
                                <Sparkles className="h-4 w-4 text-accent" />
                                Generate SEO with AI
                            </p>
                            <p className="text-[10px] text-content-muted mt-0.5">
                                AI suggestions based on your content. Review and adjust before saving.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 sm:shrink-0">
                            {primaryKeyword && (
                                <span className="text-[10px] text-content-muted bg-surface-input px-2 py-1 rounded-md">
                                    Optimised for: <span className="text-content-secondary font-medium">{primaryKeyword}</span>
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={handleGenerateSeo}
                                disabled={aiLoading}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                {aiLoading ? 'Generating…' : 'Generate'}
                            </button>
                            {onSaveSeo && (
                                <button
                                    type="button"
                                    onClick={handleSaveSeo}
                                    disabled={seoSaving || (!seoDirty && !seoSaved)}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                        seoDirty
                                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                            : seoSaved
                                                ? 'bg-emerald-500/10 text-emerald-600'
                                                : 'bg-surface-input text-content-primary hover:bg-surface-hover'
                                    }`}
                                >
                                    {seoSaved ? 'Saved' : seoSaving ? 'Saving…' : 'Save SEO'}
                                </button>
                            )}
                        </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                {/* Search Appearance */}
                <div className="bg-surface-input rounded-lg p-[5px] space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted px-1.5 pt-1 pb-0.5 flex items-center gap-1.5">
                        <Search className="h-3 w-3" />
                        Search Appearance
                    </p>

                    <FieldRow
                        label="Meta Title"
                        tooltip="The blue headline shown in Google search results. Include your primary service and location. Aim for 50–60 characters."
                    >
                        <div className="space-y-1">
                            <input
                                type="text"
                                value={metaTitleVal}
                                onChange={e => set("metaTitle", e.target.value || null)}
                                placeholder={defaults.title || "Auto-generated from title"}
                                maxLength={120}
                                className="form-input px-3 h-8 w-full text-sm"
                            />
                            <div className="flex justify-end">
                                <CharCounter value={metaTitleVal} soft={60} hard={120} />
                            </div>
                        </div>
                    </FieldRow>

                    <FieldRow
                        label="Meta Description"
                        tooltip="The grey summary text below the title in Google. Should explain what the page offers and why to click. Aim for 140–160 characters."
                    >
                        <div className="space-y-1">
                            <textarea
                                value={metaDescVal}
                                onChange={e => set("metaDescription", e.target.value || null)}
                                placeholder={defaults.description ? stripHtml(defaults.description).slice(0, 80) + "…" : "Auto-generated from description"}
                                maxLength={320}
                                rows={3}
                                className="form-input px-3 py-2 w-full text-sm resize-none"
                            />
                            <div className="flex justify-end">
                                <CharCounter value={metaDescVal} soft={160} hard={320} />
                            </div>
                        </div>
                    </FieldRow>

                    <FieldRow
                        label="Canonical URL"
                        tooltip="The definitive URL for this page. Leave blank unless this content exists at multiple URLs — it tells search engines which version to index."
                    >
                        <input
                            type="url"
                            value={canonicalVal}
                            onChange={e => set("canonicalUrl", e.target.value || null)}
                            placeholder="https://www.elitecarefinders.com/…"
                            className="form-input px-3 h-8 w-full text-sm font-mono"
                        />
                        {!canonicalVal && pathPrefix && slug && (
                            <p className="text-[10px] text-content-muted px-0.5 truncate">
                                Auto: {BASE_URL}/{pathPrefix}/{slug}
                            </p>
                        )}
                    </FieldRow>

                    <FieldRow label="Indexable" tooltip="When on, search engines can index and rank this page. Turn off to add a noindex directive — useful for drafts or duplicate content.">
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

                    <SerpPreview title={serpTitle} description={serpDesc} url={serpUrl} />
                </div>

                {/* Open Graph / Social */}
                <div className="bg-surface-input rounded-lg p-[5px] space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted px-1.5 pt-1 pb-0.5 flex items-center gap-1.5">
                        <Globe className="h-3 w-3" />
                        Social / Open Graph
                    </p>

                    <FieldRow
                        label="OG Title"
                        tooltip="The title shown when this page is shared on Facebook or LinkedIn. Leave blank to inherit the Meta Title."
                    >
                        <div className="space-y-1">
                            <input
                                type="text"
                                value={ogTitleVal}
                                onChange={e => set("ogTitle", e.target.value || null)}
                                placeholder={metaTitleVal || defaults.title || "Inherits from Meta Title"}
                                maxLength={120}
                                className="form-input px-3 h-8 w-full text-sm"
                            />
                            <div className="flex justify-end">
                                <CharCounter value={ogTitleVal} soft={60} hard={120} />
                            </div>
                        </div>
                    </FieldRow>

                    <FieldRow
                        label="OG Description"
                        tooltip="The description shown in social share previews. Leave blank to inherit the Meta Description."
                    >
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

                    <FieldRow
                        label="OG Image URL"
                        tooltip="The image shown in social share previews. Recommended size: 1200×630px. Leave blank to use the entity's main image."
                    >
                        <div className="space-y-1.5">
                            <input
                                type="url"
                                value={ogImageVal}
                                onChange={e => set("ogImageUrl", e.target.value || null)}
                                placeholder={defaults.ogImage || "https://… or leave blank for main image"}
                                className="form-input px-3 h-8 w-full text-sm font-mono"
                            />
                            {ogImageResolved && (
                                <div className="flex items-center gap-2">
                                    <img
                                        src={ogImageResolved}
                                        alt=""
                                        className="h-10 w-16 object-cover rounded border border-ui-border shrink-0"
                                        onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                                    />
                                    {!ogImageVal && (
                                        <span className="text-[10px] text-content-muted">Using main image</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </FieldRow>

                    <OgCardPreview
                        title={ogTitleResolved}
                        description={ogDescResolved}
                        imageUrl={ogImageResolved}
                    />
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
                        <InfoTooltip text="Paste a valid JSON-LD object to merge with or override the auto-generated structured data. Leave blank to use defaults." />
                    </span>
                    {schemaExpanded ? <ChevronUp className="h-3.5 w-3.5 text-content-muted" /> : <ChevronDown className="h-3.5 w-3.5 text-content-muted" />}
                </button>

                {schemaExpanded && (
                    <div className="px-[5px] pb-[5px] space-y-2">
                        <div className="p-[3px] bg-surface-hover rounded-lg space-y-2">
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
                            <div key={i} className="p-[3px] bg-surface-hover rounded-lg space-y-1">
                                <p className="text-xs font-medium text-content-primary px-1">{faq.question}</p>
                                <p className="text-xs text-content-secondary px-1 pb-1">{faq.answer}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}
