"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Save, X, Plus, Trash2, Image as ImageIcon, FileText, Tags, Hash, Check, ChevronDown, ChevronUp, Youtube, Link, Utensils, ListOrdered, AlignLeft, Search } from "lucide-react";
import { SlidePanel } from "./SlidePanel";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import type { Post, PostType, PostMetadata, RecipeIngredient, RecipeInstruction, SeoFields } from "@/types";
import { SeoTab } from "./forms/SeoTab";
import { MediaGallery } from "@/components/admin/media/MediaGallery";
import { getFolders, createFolder, getMediaItems } from "@/lib/services/mediaService";
import { updatePostSeo } from "@/lib/services/postService";
import { ensurePostFolder } from "@/lib/services/mediaFolderService";
import { supabase } from "@/lib/supabase";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface PostFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Post>) => Promise<void>;
    post?: Post | null;
}

function toThumbUrl(url: string): string {
    if (url.includes('/media/') && !url.toLowerCase().endsWith('.svg')) {
        return url.replace(/(-\d+x\d+)?\.[^.]+$/, '-100x100.webp');
    }
    return url;
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
    const [videoUrl, setVideoUrl] = useState("");
    const [status, setStatus] = useState<'published' | 'draft'>('published');
    const [postType, setPostType] = useState<PostType | "">("");

    // Media
    const [postImages, setPostImages] = useState<string[]>([]);
    const [showMediaGallery, setShowMediaGallery] = useState(false);
    const [mediaFolderId, setMediaFolderId] = useState<string>();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isPostTypeDropdownOpen, setIsPostTypeDropdownOpen] = useState(false);
    const postTypeDropdownRef = useRef<HTMLDivElement>(null);

    // SEO state
    const [seo, setSeo] = useState<SeoFields>({ indexable: true });

    async function handleSaveSeo() {
        if (!post?.id) return;
        await updatePostSeo(post.id, seo);
    }

    // Tabs
    type TabId = "information" | "images" | "seo";
    const tabs = [
        { id: "information" as TabId, label: "Post Information", icon: FileText },
        { id: "images" as TabId, label: "Images", icon: ImageIcon },
        { id: "seo" as TabId, label: "SEO & Metadata", icon: Search },
    ];
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const activeTab = (searchParams.get("tab") as TabId) ?? "information";
    function setActiveTab(tab: TabId) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }

    // Metadata fields
    const [links, setLinks] = useState<{ text: string; url: string }[]>([]);
    const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
    const [instructions, setInstructions] = useState<RecipeInstruction[]>([]);
    const [prepTime, setPrepTime] = useState<string>("");
    const [cookTime, setCookTime] = useState<string>("");
    const [recipeYield, setRecipeYield] = useState<string>("");
    const [sourceUrl, setSourceUrl] = useState<string>("");
    const [stepImageSelectorOpen, setStepImageSelectorOpen] = useState<number | null>(null);
    const [folderMediaUrls, setFolderMediaUrls] = useState<string[]>([]);

    useEffect(() => {
        if (stepImageSelectorOpen !== null && mediaFolderId) {
            getMediaItems(mediaFolderId).then(items => {
                setFolderMediaUrls(items.map(i => i.url));
            }).catch(err => console.error("Failed to fetch folder media for step selector:", err));
        }
    }, [stepImageSelectorOpen, mediaFolderId]);

    const stepImageMap = useMemo(() => {
        const map: Record<string, number> = {};
        instructions.forEach((inst, idx) => {
            if (inst.image) {
                map[inst.image] = idx + 1;
            }
        });
        return map;
    }, [instructions]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (postTypeDropdownRef.current && !postTypeDropdownRef.current.contains(event.target as Node)) {
                setIsPostTypeDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const [showDisabledTabAlert, setShowDisabledTabAlert] = useState(false);
    const isInitializedRef = useRef(false);

    // Track original title for rename detection
    const originalTitleRef = useRef<string>("");

    useEffect(() => {
        if (isOpen) {
            isInitializedRef.current = false;

            // Always reset the folder ID so the lookup re-fires for both new
            // and existing posts. Without this, switching from new → edit after
            // saving keeps a stale undefined (new post) or previous post's ID.
            setMediaFolderId(undefined);

            if (post) {
                setTitle(post.title || "");
                originalTitleRef.current = post.title || "";
                setSlug(post.slug || "");
                setContent(post.content || "");
                setExcerpt(post.excerpt || "");
                setVideoUrl(post.videoUrl || "");
                setStatus(((post.status === 'archived' ? 'draft' : post.status) as 'published' | 'draft') || "draft");
                setPostType(post.postType || "");
                setPostImages(post.images || []);

                // Load Metadata
                const meta = post.metadata || {};
                setLinks(meta.links || []);
                const loadedIngredients = (meta.ingredients || []).map(ing => typeof ing === 'string' ? { amount: '', name: ing } : ing)
                setIngredients(loadedIngredients.length > 0 ? loadedIngredients : [{ amount: '', name: '' }]);

                const loadedInstructions = (meta.instructions || []).map(inst => typeof inst === 'string' ? { text: inst } : inst);
                setInstructions(loadedInstructions.length > 0 ? loadedInstructions : [{ text: "" }]);
                setPrepTime(meta.prepTime?.toString() || "");
                setCookTime(meta.cookTime?.toString() || "");
                setRecipeYield(meta.yield || "");
                setSourceUrl(meta.sourceUrl || "");

                // SEO
                setSeo(post.seo ?? { indexable: true });
            } else {
                setTitle("");
                setSlug("");
                setContent("");
                setExcerpt("");
                setVideoUrl("");
                setStatus("draft");
                setPostType("");
                setPostImages([]);

                setLinks([]);
                setIngredients([{ amount: '', name: '' }]);
                setInstructions([{ text: "" }]);
                setPrepTime("");
                setCookTime("");
                setRecipeYield("");
                setSourceUrl("");

                // Reset SEO
                setSeo({ indexable: true });
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
                if (title || slug || content || excerpt || videoUrl || postType) return true;
                if (status !== 'draft') return true;
                if (postImages.length > 0) return true;
                if (links.length > 0 || ingredients.length > 0 || instructions.length > 0 || prepTime || cookTime || recipeYield || sourceUrl) return true;
                return false;
            }

            // Edit Mode
            if (title !== post.title) return true;
            if (slug !== post.slug) return true;
            if (cleanHtml(content) !== cleanHtml(post.content)) return true;
            if (excerpt !== (post.excerpt || "")) return true;
            if (videoUrl !== (post.videoUrl || "")) return true;
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
            if (sourceUrl !== (meta.sourceUrl || "")) return true;

            return false;
        };

        setIsDirty(checkIsDirty());
    }, [
        title, slug, content, excerpt, videoUrl, status, postType, postImages,
        links, ingredients, instructions, prepTime, cookTime, recipeYield, sourceUrl,
        isOpen, post, setIsDirty
    ]);

    // Construct Post-Specific Media Folder Name Based on Title
    useEffect(() => {
        const fetchFolder = async () => {
            if (mediaFolderId) return;

            if (title && title.trim().length > 2 && postType) {
                try {
                    const id = await ensurePostFolder(title.trim(), postType);
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
    }, [title, postType, mediaFolderId]);

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
            // ── Transparent Rename Detection ──
            if (post?.id && title !== originalTitleRef.current && originalTitleRef.current) {
                console.log(`[PostForm] Title changed: "${originalTitleRef.current}" → "${title}", triggering rename...`);
                try {
                    const renameRes = await fetch('/api/media/rename-entity', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            entityType: 'post',
                            entityId: post.id,
                            oldTitle: originalTitleRef.current,
                            newTitle: title,
                            folderId: mediaFolderId,
                        }),
                    });
                    const renameData = await renameRes.json();
                    if (!renameRes.ok) {
                        console.error('[PostForm] Rename failed:', renameData.error);
                    } else {
                        console.log('[PostForm] Rename succeeded:', renameData.results);
                        originalTitleRef.current = title;

                        // --- IMPORTANT: Update our local arrays immediately! ---
                        const renamedFiles = renameData.renamedFiles || [];
                        const urlMap = new Map<string, string>(renamedFiles.map((rf: any) => [rf.oldUrl, rf.newUrl]));

                        // Update post images
                        if (postImages.length > 0) {
                            const newImages = postImages.map(url => urlMap.get(url) || url);
                            setPostImages(newImages);
                            // Also update the local variable immediately so payload uses it
                            postImages.splice(0, postImages.length, ...newImages);
                        }

                        // Update instruction images if any
                        if (instructions.length > 0) {
                            const newInstructions = instructions.map(inst => {
                                if (inst.image && urlMap.has(inst.image)) {
                                    return { ...inst, image: urlMap.get(inst.image) as string };
                                }
                                return inst;
                            });
                            setInstructions(newInstructions);
                            // Also update the local variable immediately for payload
                            instructions.splice(0, instructions.length, ...newInstructions);
                        }
                    }
                } catch (renameErr) {
                    console.error('[PostForm] Rename API error:', renameErr);
                }
            }

            // Package dynamic fields into metadata JSON
            const metadata: PostMetadata = {};
            if (postType === 'news_events') {
                metadata.links = links.filter(l => l.text.trim() || l.url.trim());
                if (sourceUrl.trim()) metadata.sourceUrl = sourceUrl.trim();
            } else if (postType === 'recipes') {
                metadata.ingredients = ingredients.filter(i => i.amount.trim() || i.name.trim());
                metadata.instructions = instructions.filter(i => i.text.trim() || i.image);
                metadata.prepTime = prepTime ? parseInt(prepTime) : undefined;
                metadata.cookTime = cookTime ? parseInt(cookTime) : undefined;
                metadata.yield = recipeYield;
                if (sourceUrl.trim()) metadata.sourceUrl = sourceUrl.trim();
            }

            const payload: Partial<Post> = {
                title,
                slug,
                content,
                excerpt,
                videoUrl: videoUrl.trim() || null,
                postType: postType as PostType,
                status,
                images: postImages,
                featuredImageUrl: postImages.length > 0 ? postImages[0] : null,
                metadata,
            };

            await onSave(payload);
        } catch (error: any) {
            console.error("Failed to save post:", error);
            toast({ title: "Error", description: error.message || "Failed to save post", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    function renderTabContent() {
        if (activeTab === "images") {
            return (
                <div className="h-full flex flex-col">
                    {mediaFolderId ? (
                        <MediaGallery
                            folderId={mediaFolderId}
                            title={postType === 'recipes' ? (
                                <div className="flex flex-col">
                                    <span>{title || "Post"} Image Library</span>
                                    <span className="text-xs text-content-muted font-normal mt-0.5">Select an image to be the Featured Image</span>
                                </div>
                            ) : `${title || "Post"} Image Library`}
                            dropzoneText="this post"
                            className="flex-1 min-h-0"
                            galleries={postType === 'recipes' ? undefined : [
                                {
                                    id: "main",
                                    title: "Post Gallery",
                                    shortLabel: "Image Gallery",
                                    emptyText: "Select an image below to add it to the Post Gallery.",
                                    urls: postImages,
                                    onChange: (urls: string[]) => {
                                        setPostImages(urls);
                                    }
                                }
                            ]}
                            onMediaSelect={(item: { url: string }) => {
                                if (postType === 'recipes') {
                                    setPostImages([item.url]);
                                } else {
                                    if (postImages.includes(item.url)) {
                                        setPostImages(postImages.filter(u => u !== item.url));
                                    } else {
                                        setPostImages([...postImages, item.url]);
                                    }
                                }
                            }}
                            isDirty={isDirty}
                            entityName={title || undefined}
                            featuredImageUrl={postType === 'recipes' && postImages.length > 0 ? postImages[0] : undefined}
                            stepImageMap={postType === 'recipes' ? stepImageMap : undefined}
                            showStockImages={postType !== 'recipes'}
                        />
                    ) : (
                        <div className="p-8 text-center border border-dashed border-ui-border rounded-xl">
                            <p className="text-content-muted text-sm">Save this post first to upload images.</p>
                        </div>
                    )}
                </div>
            );
        }

        if (activeTab === "seo") {
            return (
                <SeoTab
                    seo={seo}
                    onChange={(field, value) => setSeo(prev => ({ ...prev, [field]: value }))}
                    setIsDirty={setIsDirty}
                    defaults={{
                        title: title || undefined,
                        description: excerpt || undefined,
                        ogImage: postImages[0] || undefined,
                    }}
                    recordId={post?.id}
                    contentType="post"
                    onSaveSeo={post?.id ? handleSaveSeo : undefined}
                />
            );
        }

        // "information" tab
        return (
            <div className={`grid grid-cols-1 gap-6 ${postType === 'recipes' ? 'lg:grid-cols-3 flex-1 min-h-0' : 'lg:grid-cols-2 flex-1 min-h-0'}`}>
                {/* Column 1: Core Details & Dynamic Content */}
                <div className={`flex flex-col gap-6 ${postType === 'recipes' ? 'lg:col-span-2 h-full min-h-0 flex flex-col' : 'overflow-y-auto'}`}>
                    <div className={`bg-surface-input rounded-lg p-[5px] flex flex-col gap-3 ${postType === 'recipes' ? 'flex-1 min-h-0' : ''}`}>
                        <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
                            <FileText className="h-4 w-4 text-accent" />
                            Post Details
                        </h3>

                        <div className="flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all">
                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">
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
                                        className="form-input w-full flex items-center justify-between px-3 h-8 text-sm rounded-md border-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:ring-1 focus:ring-accent"
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

                        <div className="flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all">
                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap flex items-center gap-1.5 pl-[5px]">
                                <Youtube className="h-4 w-4 text-red-500" />
                                YouTube URL
                            </label>
                            <input
                                type="url"
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                className="form-input text-sm text-left w-full h-8 rounded-md px-3 flex-1"
                                placeholder="https://www.youtube.com/watch?v=..."
                            />
                        </div>

                        {(postType === 'recipes' || postType === 'news_events') && (
                            <div className="flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all">
                                <label className="text-sm font-medium text-content-secondary whitespace-nowrap flex items-center gap-1.5 pl-[5px]">
                                    <Link className="h-4 w-4 text-accent" />
                                    Source URL
                                </label>
                                <input
                                    type="url"
                                    value={sourceUrl}
                                    onChange={(e) => setSourceUrl(e.target.value)}
                                    className="form-input text-sm text-left w-full h-8 rounded-md px-3 flex-1"
                                    placeholder="https://example.com/original-recipe"
                                />
                            </div>
                        )}

                        {postType === 'recipes' && (
                        <div className="flex flex-col gap-2 pt-2 flex-1 min-h-0">
                            <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px] shrink-0">
                                <AlignLeft className="h-4 w-4 text-accent" />
                                Content
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all">
                                        <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Prep Time</label>
                                        <div className="relative w-28 shrink-0">
                                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${prepTime ? "text-content-secondary" : "text-content-muted"}`}>m</span>
                                            <input
                                                type="number"
                                                value={prepTime}
                                                onChange={(e) => setPrepTime(e.target.value)}
                                                className="form-input w-full pl-7 pr-7 py-1 h-8 text-sm text-left overflow-hidden [&::-webkit-inner-spin-button]:appearance-none"
                                                placeholder="15"
                                            />
                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                                                <button type="button" onClick={() => setPrepTime(String((parseInt(prepTime) || 0) + 1))} className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"><ChevronUp className="h-2 w-2" /></button>
                                                <button type="button" onClick={() => setPrepTime(String(Math.max(0, (parseInt(prepTime) || 0) - 1)))} className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"><ChevronDown className="h-2 w-2" /></button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all">
                                        <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Cook Time</label>
                                        <div className="relative w-28 shrink-0">
                                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${cookTime ? "text-content-secondary" : "text-content-muted"}`}>m</span>
                                            <input
                                                type="number"
                                                value={cookTime}
                                                onChange={(e) => setCookTime(e.target.value)}
                                                className="form-input w-full pl-7 pr-7 py-1 h-8 text-sm text-left overflow-hidden [&::-webkit-inner-spin-button]:appearance-none"
                                                placeholder="45"
                                            />
                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                                                <button type="button" onClick={() => setCookTime(String((parseInt(cookTime) || 0) + 1))} className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"><ChevronUp className="h-2 w-2" /></button>
                                                <button type="button" onClick={() => setCookTime(String(Math.max(0, (parseInt(cookTime) || 0) - 1)))} className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"><ChevronDown className="h-2 w-2" /></button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg">
                                        <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Yield</label>
                                        <input type="text" value={recipeYield} onChange={(e) => setRecipeYield(e.target.value)} className="form-input text-sm w-full h-8 rounded-md px-2 flex-1" placeholder="4-6 servings" />
                                    </div>
                                </div>
                            <RichTextEditor
                                value={content}
                                onChange={setContent}
                                placeholder="Content goes here..."
                                className="bg-surface-input text-content-primary placeholder-content-muted border-none overflow-hidden flex-1 min-h-0"
                            />
                            <div className="flex flex-col gap-2 pt-2 shrink-0">
                                <label className="text-sm font-medium text-content-secondary flex items-center gap-2 pl-1">
                                    <FileText className="h-4 w-4 text-accent" />
                                    Excerpt / Summary
                                </label>
                                <textarea
                                    value={excerpt}
                                    onChange={(e) => setExcerpt(e.target.value)}
                                    className="form-input text-sm p-3 rounded-lg resize-y min-h-[80px]"
                                    placeholder="Short description for preview cards..."
                                />
                            </div>
                        </div>
                        )}
                    </div>

                    {/* Dynamic Sections Based on Type */}
                    {postType === 'news_events' && (
                        <div className="bg-surface-input rounded-lg p-[5px] space-y-3 border-l-4 border-l-blue-500">
                            <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
                                <Hash className="h-4 w-4 text-accent" />
                                News &amp; Events Links
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

                </div>

                {/* Column 2: Content & Excerpt (Non-recipes) */}
                {postType !== 'recipes' && (
                    <div className="flex flex-col gap-6 h-full min-h-0">
                        <div className="bg-surface-input rounded-lg p-[5px] flex flex-col gap-3 flex-1 min-h-0">
                            <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
                                <AlignLeft className="h-4 w-4 text-accent" />
                                Content
                            </h3>
                            <RichTextEditor
                                value={content}
                                onChange={setContent}
                                placeholder="Content goes here..."
                                minHeight="min-h-[300px]"
                                className="bg-surface-input text-content-primary placeholder-content-muted border-none overflow-hidden flex-1"
                            />
                            <div className="flex flex-col gap-2 pt-2 shrink-0">
                                <label className="text-sm font-medium text-content-secondary flex items-center gap-2 pl-1">
                                    <FileText className="h-4 w-4 text-accent" />
                                    Excerpt / Summary
                                </label>
                                <textarea
                                    value={excerpt}
                                    onChange={(e) => setExcerpt(e.target.value)}
                                    className="form-input text-sm p-3 rounded-lg resize-y min-h-[80px]"
                                    placeholder="Short description for preview cards..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Column 2: Recipe Ingredients + Steps (Only for Recipes) */}
                {postType === 'recipes' && (
                    <div className="flex flex-col gap-6 min-h-0 h-full lg:col-span-1">
                        {/* Ingredients */}
                        <div className="bg-surface-input rounded-lg p-[5px] gap-4 flex flex-col min-h-0 flex-1">
                            <div className="flex-1 min-h-0 flex flex-col">
                                <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px] shrink-0">
                                    <Utensils className="h-4 w-4 text-accent" />
                                    Ingredients
                                </h3>
                                <div className="overflow-y-auto flex-1 pr-1">
                                    {ingredients.map((ing, idx) => (
                                        <div key={idx} className="group flex items-center gap-2 px-2 py-1 rounded-lg bg-surface-input transition-colors mb-1">
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
                                            <div className="flex items-center gap-1 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newIngredients = [...ingredients];
                                                        newIngredients.splice(idx + 1, 0, { amount: "", name: "" });
                                                        setIngredients(newIngredients);
                                                    }}
                                                    className="p-1 text-content-muted hover:text-content-primary hover:bg-surface-hover rounded flex-shrink-0"
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

                        {/* Steps */}
                        <div className="bg-surface-input rounded-lg p-[5px] gap-4 flex flex-col min-h-0 flex-1">
                            <div className="flex-1 min-h-0 flex flex-col">
                                <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px] shrink-0">
                                    <ListOrdered className="h-4 w-4 text-accent" />
                                    Steps
                                </h3>
                                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                                    {instructions.map((inst, idx) => (
                                        <div key={idx} className="group flex items-start gap-2 px-2 py-2 rounded-lg bg-surface-input transition-colors mb-2">
                                            <div className="flex-1 flex gap-2">
                                                <div className="w-6 h-8 flex items-center justify-center shrink-0">
                                                    <span className="text-sm font-medium text-content-muted">{idx + 1}.</span>
                                                </div>
                                                <div className="flex flex-col gap-2 w-20 shrink-0">
                                                    <div className="h-20 w-full rounded-md flex flex-col items-center justify-center overflow-hidden group/img relative bg-surface-primary transition-colors">
                                                        {inst.image ? (
                                                            <>
                                                                <img src={toThumbUrl(inst.image)} alt={`Step ${idx + 1}`} className="w-full h-full object-cover cursor-pointer" onClick={() => setStepImageSelectorOpen(idx)} />
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const newInst = [...instructions];
                                                                        newInst[idx] = { ...inst, image: undefined };
                                                                        setInstructions(newInst);
                                                                    }}
                                                                    className="absolute top-1 right-1 p-1 bg-[var(--media-edit-btn-bg)] text-[var(--media-edit-btn-text)] opacity-50 group-hover/img:opacity-100 transition-all rounded-md hover:!bg-accent hover:text-white cursor-pointer z-10"
                                                                    title="Remove image"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => setStepImageSelectorOpen(idx)}
                                                                className="w-full h-full flex flex-col items-center justify-center gap-1 text-content-muted hover:text-content-primary hover:bg-surface-hover transition-colors cursor-pointer"
                                                                title="Add step image"
                                                            >
                                                                <ImageIcon className="w-5 h-5" />
                                                                <span className="text-[10px] uppercase font-medium">Image</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <textarea
                                                    value={inst.text}
                                                    onChange={(e) => {
                                                        const newInst = [...instructions];
                                                        newInst[idx] = { ...inst, text: e.target.value };
                                                        setInstructions(newInst);
                                                    }}
                                                    className="form-input text-sm w-full min-h-[5rem] rounded-md px-3 py-2 resize-y"
                                                    rows={3}
                                                    placeholder={`Step ${idx + 1} instructions...`}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 pt-0.5 transition-opacity whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newInstructions = [...instructions];
                                                        newInstructions.splice(idx + 1, 0, { text: "" });
                                                        setInstructions(newInstructions);
                                                    }}
                                                    className="p-1 text-content-muted hover:text-content-primary hover:bg-surface-hover rounded flex-shrink-0"
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

            </div>
        );
    }

    return (
        <>
            <SlidePanel
                isOpen={isOpen}
                onClose={onClose}
                title={post ? "Edit Post" : "New Post"}
                subtitle="Manage articles, resources, news, and recipes"
                fullScreen
                actions={
                    <button
                        onClick={handleSubmit}
                        disabled={!isDirty || isSubmitting}
                        className="px-6 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-black/20"
                    >
                        {isSubmitting ? "Saving..." : (post ? "Save Changes" : "Create Post")}
                    </button>
                }
                contentClassName={activeTab === "seo" ? "flex-1 overflow-y-auto p-4 md:p-6" : "flex-1 overflow-hidden flex flex-col p-4 md:p-6"}
                headerChildren={
                    <div className="flex items-center justify-between px-4 sm:pr-6 border-b-[6px]" style={{ borderColor: 'var(--surface-tab-border)' }}>
                        <div className="flex flex-1 items-start overflow-visible gap-1 pt-2 px-2 justify-center sm:justify-start">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const isDisabled = !post?.id && tab.id !== 'information';
                            const tabColor = 'var(--nav-active-bg)';
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    aria-disabled={isDisabled}
                                    onClick={() => {
                                        if (isDisabled) {
                                            setShowDisabledTabAlert(true);
                                            return;
                                        }
                                        setActiveTab(tab.id);
                                    }}
                                    className={`
                                        relative flex items-center gap-2 px-4 text-sm font-medium
                                        whitespace-nowrap transition-colors duration-150 select-none
                                        ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                                        ${isActive
                                            ? 'pt-[10px] pb-[11px] text-content-primary z-10 rounded-tl-lg rounded-tr-lg'
                                            : 'form-tab-hover pt-2 pb-2 bg-transparent text-content-muted hover:text-content-secondary rounded-lg'
                                        }
                                    `}
                                    style={isActive ? { backgroundColor: tabColor } : undefined}
                                >
                                    {isActive && (
                                        <span className="absolute bottom-0 left-[-8px] w-2 h-2 pointer-events-none">
                                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M8 0 L8 8 L0 8 A 8 8 0 0 0 8 0 Z" fill={tabColor} />
                                            </svg>
                                        </span>
                                    )}
                                    <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-accent' : ''}`} />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                    {isActive && (
                                        <span className="absolute bottom-0 right-[-8px] w-2 h-2 pointer-events-none">
                                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M0 0 L0 8 L8 8 A 8 8 0 0 1 0 0 Z" fill={tabColor} />
                                            </svg>
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                        </div>
                        <div className="flex items-center gap-2 pb-2">
                        <div className="flex bg-surface-input p-1 rounded-lg shrink-0" style={{ border: '2px solid var(--form-border)' }}>
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
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${status === 'draft' ? "bg-surface-hover text-content-primary shadow-sm" : "text-content-muted hover:text-content-secondary"}`}
                            >
                                Draft
                            </button>
                        </div>
                        </div>
                    </div>
                }
            >
                {renderTabContent()}
            </SlidePanel>

            <ConfirmationModal
                isOpen={showDisabledTabAlert}
                onClose={() => setShowDisabledTabAlert(false)}
                onConfirm={() => setShowDisabledTabAlert(false)}
                title="Action Required"
                message="Please fill out required fields (Title, Post Type) and save the Post before accessing other tabs."
                confirmLabel="Understood"
                hideCancel={true}
            />

            {/* Step Image Selector Modal */}
            {stepImageSelectorOpen !== null && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[100] bg-ui-bg/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-surface-primary w-full max-w-2xl rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-ui-border flex items-center justify-between shrink-0 bg-surface-secondary">
                            <h2 className="text-lg font-semibold text-content-primary">
                                Select Image for Step {stepImageSelectorOpen + 1}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setStepImageSelectorOpen(null)}
                                className="p-2 -m-2 text-content-muted hover:text-content-primary rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            {folderMediaUrls.length === 0 ? (
                                <div className="text-center py-12">
                                    <ImageIcon className="w-12 h-12 text-content-muted mx-auto mb-3 opacity-50" />
                                    <p className="text-content-secondary font-medium">No images available</p>
                                    <p className="text-sm text-content-muted mt-1">Upload images to the Post Gallery first to select them for steps.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {folderMediaUrls.map((url) => {
                                        const isSelected = instructions[stepImageSelectorOpen].image === url;
                                        // Check if this image is assigned to ANOTHER step to show a badge / grayscale
                                        const assignedStep = stepImageMap[url];
                                        const isAssignedElsewhere = assignedStep !== undefined && assignedStep !== stepImageSelectorOpen + 1;

                                        return (
                                            <button
                                                key={url}
                                                type="button"
                                                onClick={() => {
                                                    const newInst = [...instructions];
                                                    // Toggle selection
                                                    if (isSelected) {
                                                        newInst[stepImageSelectorOpen] = { ...newInst[stepImageSelectorOpen], image: undefined };
                                                    } else {
                                                        newInst[stepImageSelectorOpen] = { ...newInst[stepImageSelectorOpen], image: url };
                                                    }
                                                    setInstructions(newInst);
                                                    setStepImageSelectorOpen(null);
                                                }}
                                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${isSelected ? "border-accent" : "border-transparent hover:border-ui-border"}`}
                                            >
                                                <img
                                                    src={toThumbUrl(url)}
                                                    alt="Gallery image"
                                                    className={`w-full h-full object-cover transition-opacity ${isSelected || isAssignedElsewhere ? "opacity-50 grayscale" : ""}`}
                                                />
                                                {isSelected && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="bg-accent text-white rounded-full p-1.5 shadow-lg">
                                                            <Check className="w-5 h-5" />
                                                        </div>
                                                    </div>
                                                )}
                                                {isAssignedElsewhere && !isSelected && (
                                                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-lg bg-amber-500/90 text-white text-[10px] font-medium flex items-center gap-1 backdrop-blur-sm shadow-sm">
                                                        <span className="w-1 h-1 rounded-full bg-white"></span>
                                                        Step {assignedStep}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                , document.body)}
        </>
    );
}
