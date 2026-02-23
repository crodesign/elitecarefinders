"use client";

import { useState, useEffect, useRef } from "react";
import { Save, X, Plus, Trash2, Image as ImageIcon, FileText, Tags, Hash, Check, ChevronDown } from "lucide-react";
import { SlidePanel } from "./SlidePanel";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import type { Post, PostType, PostMetadata, RecipeIngredient } from "@/types";
import { MediaGallery } from "@/components/admin/media/MediaGallery";
import { getFolders, createFolder } from "@/lib/services/mediaService";
import { ensurePostFolder } from "@/lib/services/mediaFolderService";
import { supabase } from "@/lib/supabase";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";

interface PostFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Post>) => Promise<void>;
    post?: Post | null;
}

const POST_TYPES: { value: PostType; label: string }[] = [
    { value: 'general', label: 'General Post' },
    { value: 'caregiver_resources', label: 'Caregiver Resources' },
    { value: 'caregiving_for_caregivers', label: 'Caregiving for Caregivers' },
    { value: 'resident_resources', label: 'Resident Resources' },
    { value: 'news_events', label: 'News & Events' },
    { value: 'recipes', label: 'Recipes' },
];

export function PostForm({ isOpen, onClose, onSave, post }: PostFormProps) {
    const { isDirty, setIsDirty, registerSaveHandler } = useUnsavedChanges();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Core fields
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [content, setContent] = useState("");
    const [excerpt, setExcerpt] = useState("");
    const [status, setStatus] = useState<'published' | 'draft'>('published');
    const [postType, setPostType] = useState<PostType | "">("");

    // Media
    const [postImages, setPostImages] = useState<string[]>([]);
    const [showMediaGallery, setShowMediaGallery] = useState(false);
    const [mediaFolderId, setMediaFolderId] = useState<string>();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isPostTypeDropdownOpen, setIsPostTypeDropdownOpen] = useState(false);
    const postTypeDropdownRef = useRef<HTMLDivElement>(null);

    // Metadata fields
    const [links, setLinks] = useState<{ text: string; url: string }[]>([]);
    const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
    const [instructions, setInstructions] = useState<string[]>([]);
    const [prepTime, setPrepTime] = useState<string>("");
    const [cookTime, setCookTime] = useState<string>("");
    const [recipeYield, setRecipeYield] = useState<string>("");

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (postTypeDropdownRef.current && !postTypeDropdownRef.current.contains(event.target as Node)) {
                setIsPostTypeDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isInitializedRef = useRef(false);

    useEffect(() => {
        if (isOpen) {
            isInitializedRef.current = false;

            if (post) {
                setTitle(post.title || "");
                setSlug(post.slug || "");
                setContent(post.content || "");
                setExcerpt(post.excerpt || "");
                setStatus(((post.status === 'archived' ? 'draft' : post.status) as 'published' | 'draft') || "draft");
                setPostType(post.postType || "");
                setPostImages(post.images || []);

                // Load Metadata
                const meta = post.metadata || {};
                setLinks(meta.links || []);
                const loadedIngredients = (meta.ingredients || []).map(ing => typeof ing === 'string' ? { amount: '', name: ing } : ing)
                setIngredients(loadedIngredients.length > 0 ? loadedIngredients : [{ amount: '', name: '' }]);

                const loadedInstructions = meta.instructions || [];
                setInstructions(loadedInstructions.length > 0 ? loadedInstructions : [""]);
                setPrepTime(meta.prepTime?.toString() || "");
                setCookTime(meta.cookTime?.toString() || "");
                setRecipeYield(meta.yield || "");
            } else {
                setTitle("");
                setSlug("");
                setContent("");
                setExcerpt("");
                setStatus("draft");
                setPostType("");
                setPostImages([]);

                setLinks([]);
                setIngredients([{ amount: '', name: '' }]);
                setInstructions([""]);
                setPrepTime("");
                setCookTime("");
                setRecipeYield("");
            }

            setTimeout(() => {
                setIsDirty(false);
                isInitializedRef.current = true;
            }, 50);

        } else {
            isInitializedRef.current = false;
        }
    }, [isOpen, post, setIsDirty]);

    // Check if form state differs from initial/saved state
    useEffect(() => {
        if (!isOpen || !isInitializedRef.current) return;

        const checkIsDirty = () => {
            const arraysEqual = (a: any[] | null | undefined, b: any[] | null | undefined) => {
                const arrA = a || [];
                const arrB = b || [];
                if (arrA.length !== arrB.length) return false;
                return arrA.every((val, index) => val === arrB[index]);
            };

            const cleanHtml = (html: string | undefined | null) => {
                if (!html) return "";
                return html.replace(/ class="[^"]*"/g, '').replace(/ dir="[^"]*"/g, '').trim();
            };

            if (!post) {
                // New Post Mode
                if (title || slug || content || excerpt || postType) return true;
                if (status !== 'draft') return true;
                if (postImages.length > 0) return true;
                if (links.length > 0 || ingredients.length > 0 || instructions.length > 0 || prepTime || cookTime || recipeYield) return true;
                return false;
            }

            // Edit Mode
            if (title !== post.title) return true;
            if (slug !== post.slug) return true;
            if (cleanHtml(content) !== cleanHtml(post.content)) return true;
            if (excerpt !== (post.excerpt || "")) return true;
            if (status !== ((post.status === 'archived' ? 'draft' : post.status) || 'draft')) return true;
            if (postType !== (post.postType || "")) return true;
            if (!arraysEqual(postImages, post.images)) return true;

            const meta = post.metadata || {};
            if (JSON.stringify(links) !== JSON.stringify(meta.links || [])) return true;
            if (JSON.stringify(ingredients) !== JSON.stringify(meta.ingredients || [])) return true;
            if (JSON.stringify(instructions) !== JSON.stringify(meta.instructions || [])) return true;
            if (prepTime !== (meta.prepTime?.toString() || "")) return true;
            if (cookTime !== (meta.cookTime?.toString() || "")) return true;
            if (recipeYield !== (meta.yield || "")) return true;

            return false;
        };

        setIsDirty(checkIsDirty());
    }, [
        title, slug, content, excerpt, status, postType, postImages,
        links, ingredients, instructions, prepTime, cookTime, recipeYield,
        isOpen, post, setIsDirty
    ]);

    // Construct Post-Specific Media Folder Name Based on Title
    useEffect(() => {
        const fetchFolder = async () => {
            if (mediaFolderId) return;

            if (title && title.trim().length > 2) {
                try {
                    const id = await ensurePostFolder(title.trim());
                    setMediaFolderId(id || undefined);
                } catch (error) {
                    console.error("Error ensuring post media folder:", error);
                    setMediaFolderId(undefined);
                }
            }
        };

        const timer = setTimeout(() => {
            fetchFolder();
        }, 800);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, mediaFolderId]);

    const autoGenerateSlug = (value: string) => {
        if (post && post.id) return; // Don't auto-update if editing existing
        const generated = value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
        setSlug(generated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !slug.trim()) {
            toast({ title: "Validation Error", description: "Title and Slug are required", variant: "destructive" });
            return;
        }

        if (!postType) {
            toast({ title: "Validation Error", description: "Post Type is required", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);

        try {
            // Package dynamic fields into metadata JSON
            const metadata: PostMetadata = {};
            if (postType === 'news_events') {
                metadata.links = links.filter(l => l.text.trim() || l.url.trim());
            } else if (postType === 'recipes') {
                metadata.ingredients = ingredients.filter(i => i.amount.trim() || i.name.trim());
                metadata.instructions = instructions.filter(i => i.trim());
                metadata.prepTime = prepTime ? parseInt(prepTime) : undefined;
                metadata.cookTime = cookTime ? parseInt(cookTime) : undefined;
                metadata.yield = recipeYield;
            }

            const payload: Partial<Post> = {
                title,
                slug,
                content,
                excerpt,
                postType: postType as PostType,
                status,
                images: postImages,
                featuredImageUrl: postImages.length > 0 ? postImages[0] : null,
                metadata
            };

            await onSave(payload);
        } catch (error: any) {
            console.error("Failed to save post:", error);
            toast({ title: "Error", description: error.message || "Failed to save post", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <SlidePanel
                isOpen={isOpen}
                onClose={onClose}
                title={post ? "Edit Post" : "New Post"}
                subtitle="Manage articles, resources, news, and recipes"
                fullScreen
                actions={null}
                headerChildren={
                    <div className="flex justify-end items-center gap-2 px-6 pt-2 pb-3 border-b-[6px]" style={{ borderColor: 'var(--surface-tab-border)' }}>
                        <div className="flex bg-surface-input p-1 rounded-lg mr-2 hidden md:flex">
                            <button
                                type="button"
                                onClick={() => setStatus('published')}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${status === 'published' ? "bg-emerald-600 text-white shadow-sm" : "text-content-muted hover:text-content-secondary"}`}
                            >
                                Published
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatus('draft')}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${status === 'draft' ? "bg-surface-hover text-white shadow-sm" : "text-content-muted hover:text-content-secondary"}`}
                            >
                                Draft
                            </button>

                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={!isDirty || isSubmitting}
                            className={`px-6 py-1.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all duration-200
                                ${(!isDirty || isSubmitting)
                                    ? "bg-surface-hover text-content-muted cursor-not-allowed shadow-none border border-ui-border"
                                    : "bg-accent text-white hover:bg-accent-light shadow-lg shadow-black/20 border border-transparent"}
                            `}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    Saving...
                                </>
                            ) : (
                                post ? "Save Changes" : "Create Post"
                            )}
                        </button>
                    </div>
                }
            >
                <div className="w-full h-full flex flex-col min-h-0">
                    <div className={`grid grid-cols-1 gap-6 flex-1 min-h-0 ${postType === 'recipes' ? 'lg:grid-cols-4' : 'lg:grid-cols-2'}`}>
                        {/* Column 1: Core Details & Dynamic Content */}
                        <div className={`flex flex-col gap-6 min-h-0 h-full ${postType === 'recipes' ? 'lg:col-span-2 lg:row-span-2' : ''}`}>
                            <div className="bg-surface-input rounded-lg p-4 flex flex-col gap-3 flex-1 min-h-0">
                                <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pb-1">
                                    <FileText className="h-4 w-4 text-accent" />
                                    Post Details
                                </h3>

                                <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
                                    <label className="text-sm font-medium text-content-secondary whitespace-nowrap">
                                        Title
                                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 ml-1 inline-block"></span>
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => {
                                            setTitle(e.target.value);
                                            autoGenerateSlug(e.target.value);
                                        }}
                                        className="form-input text-sm text-left w-full h-8 rounded-md px-3 flex-1"
                                        placeholder="Enter post title"
                                        required
                                    />
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-48" ref={postTypeDropdownRef}>
                                            <button
                                                type="button"
                                                onClick={() => setIsPostTypeDropdownOpen(!isPostTypeDropdownOpen)}
                                                className="form-input w-full flex items-center justify-between px-3 h-8 text-sm rounded-md bg-transparent border-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:ring-1 focus:ring-accent"
                                            >
                                                <span className="truncate mr-2 font-medium">
                                                    {postType ? POST_TYPES.find(t => t.value === postType)?.label : "Select Post Type"}
                                                </span>
                                                <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 text-content-muted ${isPostTypeDropdownOpen ? "rotate-180" : ""}`} />
                                            </button>

                                            {isPostTypeDropdownOpen && (
                                                <div className="dropdown-menu absolute z-50 left-0 w-full mt-1 max-h-60 flex flex-col p-1 border-none bg-surface-primary rounded-md shadow-lg ring-1 ring-black/5 dark:ring-white/5">
                                                    {POST_TYPES.map((type) => (
                                                        <button
                                                            key={type.value}
                                                            type="button"
                                                            onClick={() => {
                                                                setPostType(type.value as PostType);
                                                                setIsPostTypeDropdownOpen(false);
                                                            }}
                                                            className={`dropdown-item w-full rounded text-sm flex items-center justify-between px-2 py-1.5 transition-colors ${postType === type.value ? "bg-surface-hover text-content-primary" : "text-content-secondary hover:bg-surface-hover hover:text-content-primary"}`}
                                                        >
                                                            <span>{type.label}</span>
                                                            {postType === type.value && <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-3 w-3 text-white" /></span>}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Slug Display */}
                                <div className="px-1">
                                    <p className="text-[10px] text-content-muted font-mono flex items-center gap-1">
                                        <span className="text-content-muted">slug:</span>
                                        {slug || "..."}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2 pt-2">
                                    <label className="text-sm font-medium text-content-secondary pl-1">
                                        Excerpt / Summary
                                    </label>
                                    <textarea
                                        value={excerpt}
                                        onChange={(e) => setExcerpt(e.target.value)}
                                        className="form-input text-sm p-3 rounded-lg resize-y min-h-[80px]"
                                        placeholder="Short description for preview cards..."
                                    />
                                </div>

                                <div className="flex flex-col flex-1 gap-2 pt-2 min-h-0">
                                    <label className="text-sm font-medium text-content-secondary pl-1 flex justify-between items-center shrink-0">
                                        <span>Content</span>
                                    </label>
                                    <RichTextEditor
                                        value={content}
                                        onChange={setContent}
                                        placeholder="Content goes here..."
                                        minHeight="min-h-[300px]"
                                        className="flex-1 bg-surface-input text-content-primary placeholder-content-muted border-none h-full overflow-hidden"
                                    />
                                </div>
                            </div>

                            {/* Dynamic Sections Based on Type */}
                            {postType === 'news_events' && (
                                <div className="bg-surface-input rounded-lg p-4 space-y-3 border-l-4 border-l-blue-500">
                                    <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pb-1">
                                        <Hash className="h-4 w-4 text-accent" />
                                        News & Events Links
                                    </h3>

                                    <div className="space-y-2">
                                        {links.map((link, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={link.text}
                                                    onChange={(e) => setLinks(links.map((l, i) => i === idx ? { ...l, text: e.target.value } : l))}
                                                    className="form-input text-sm px-3 h-8 rounded-md flex-1"
                                                    placeholder="Display Text (e.g. Read original article)"
                                                />
                                                <input
                                                    type="text"
                                                    value={link.url}
                                                    onChange={(e) => setLinks(links.map((l, i) => i === idx ? { ...l, url: e.target.value } : l))}
                                                    className="form-input text-sm px-3 h-8 rounded-md flex-1"
                                                    placeholder="URL (e.g. https://...)"
                                                />
                                                <button type="button" onClick={() => setLinks(links.filter((_, i) => i !== idx))} className="btn-danger p-2 h-8">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setLinks([...links, { text: "", url: "" }])}
                                            className="text-sm text-accent hover:text-accent-light flex items-center gap-1 font-medium mt-2"
                                        >
                                            <Plus className="w-4 h-4" /> Add Link
                                        </button>
                                    </div>
                                </div>
                            )}

                            {postType === 'recipes' && (
                                <div className="bg-surface-input rounded-lg p-4">

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg">
                                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap">Prep (m)</label>
                                            <input type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} className="form-input text-sm w-16 h-8 rounded-md px-2 text-center" placeholder="15" />
                                        </div>
                                        <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg">
                                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap">Cook (m)</label>
                                            <input type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} className="form-input text-sm w-16 h-8 rounded-md px-2 text-center" placeholder="45" />
                                        </div>
                                        <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg">
                                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap">Yield</label>
                                            <input type="text" value={recipeYield} onChange={(e) => setRecipeYield(e.target.value)} className="form-input text-sm w-full h-8 rounded-md px-2 flex-1" placeholder="4-6 servings" />
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>

                        {/* Column 2: Recipe Ingredients (Only for Recipes) */}
                        {postType === 'recipes' && (
                            <div className="flex flex-col gap-6 min-h-0 h-full lg:col-span-1">
                                <div className="bg-surface-input rounded-lg p-4 gap-4 flex flex-col min-h-0 h-full">
                                    <div className="flex-1 min-h-0 flex flex-col">
                                        <label className="text-sm font-medium text-content-secondary mb-2 block shrink-0">Ingredients</label>
                                        <div className="overflow-y-auto flex-1 pr-1">
                                            {ingredients.map((ing, idx) => (
                                                <div key={idx} className="group flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-surface-input transition-colors">
                                                    <div className="flex-1 flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={ing.amount}
                                                            onChange={(e) => setIngredients(ingredients.map((l, i) => i === idx ? { ...l, amount: e.target.value } : l))}
                                                            className="form-input text-sm w-[8ch] h-8 rounded-md px-2 flex-shrink-0"
                                                            placeholder="Amount"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={ing.name}
                                                            onChange={(e) => setIngredients(ingredients.map((l, i) => i === idx ? { ...l, name: e.target.value } : l))}
                                                            className="form-input text-sm w-full h-8 rounded-md px-2"
                                                            placeholder="Ingredient (e.g. Olive Oil)"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newIngredients = [...ingredients];
                                                                newIngredients.splice(idx + 1, 0, { amount: "", name: "" });
                                                                setIngredients(newIngredients);
                                                            }}
                                                            className="p-1 text-content-muted hover:text-accent hover:bg-accent/10 rounded flex-shrink-0"
                                                            title="Insert Ingredient Below"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIngredients(ingredients.filter((_, i) => i !== idx))}
                                                            className="p-1 text-content-muted hover:text-red-400 hover:bg-red-400/10 rounded flex-shrink-0"
                                                            title="Remove Ingredient"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Column 3: Recipe Steps (Only for Recipes) */}
                        {postType === 'recipes' && (
                            <div className="flex flex-col gap-6 min-h-0 h-full lg:col-span-1">
                                <div className="bg-surface-input rounded-lg p-4 gap-4 flex flex-col min-h-0 h-full">
                                    <div className="flex-1 min-h-0 flex flex-col">
                                        <label className="text-sm font-medium text-content-secondary mb-2 block shrink-0">Steps</label>
                                        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                                            {instructions.map((inst, idx) => (
                                                <div key={idx} className="group flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-surface-input transition-colors">
                                                    <div className="flex-1 flex gap-2">
                                                        <div className="w-6 h-8 flex items-center justify-center shrink-0">
                                                            <span className="text-sm font-medium text-content-muted">{idx + 1}.</span>
                                                        </div>
                                                        <textarea
                                                            value={inst}
                                                            onChange={(e) => {
                                                                const newInst = [...instructions];
                                                                newInst[idx] = e.target.value;
                                                                setInstructions(newInst);
                                                            }}
                                                            className="form-input text-sm w-full min-h-[32px] rounded-md px-3 py-1.5 resize-y"
                                                            rows={2}
                                                            placeholder={`Step ${idx + 1} instructions...`}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newInstructions = [...instructions];
                                                                newInstructions.splice(idx + 1, 0, "");
                                                                setInstructions(newInstructions);
                                                            }}
                                                            className="p-1 text-content-muted hover:text-accent hover:bg-accent/10 rounded flex-shrink-0"
                                                            title="Insert Step Below"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setInstructions(instructions.filter((_, i) => i !== idx))}
                                                            className="p-1 text-content-muted hover:text-red-400 hover:bg-red-400/10 rounded flex-shrink-0"
                                                            title="Remove Step"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Column 2 for non-recipes OR Bottom Span for recipes: Media Gallery */}
                        <div className={`flex flex-col h-full min-h-0 ${postType === 'recipes' ? 'lg:col-span-2 lg:col-start-3' : ''}`}>
                            {mediaFolderId ? (
                                <MediaGallery
                                    folderId={mediaFolderId}
                                    title="Post Images"
                                    dropzoneText="this post"
                                    className="flex-1 min-h-0"
                                    galleries={postType === 'recipes' ? undefined : [
                                        {
                                            id: "main",
                                            title: "Post Gallery",
                                            shortLabel: "Image Gallery",
                                            emptyText: "Select an image below to add it to the Post Gallery.",
                                            urls: postImages,
                                            onChange: (urls) => {
                                                setPostImages(urls);
                                            }
                                        }
                                    ]}
                                    onMediaSelect={(item) => {
                                        if (postType === 'recipes' && !postImages.includes(item.url)) {
                                            setPostImages([item.url]); // Replace with selected image if it's strictly featured
                                        }
                                    }}
                                    isDirty={isDirty}
                                />
                            ) : (
                                <div className="p-8 text-center border border-dashed border-ui-border rounded-xl">
                                    <p className="text-content-muted text-sm">Save this post first to upload images.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SlidePanel>


        </>
    );
}
