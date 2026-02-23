"use client";

import { supabase } from "@/lib/supabase";
import type { MediaFolder, MediaItem } from "@/types";

// Default folders to seed (with display order)
const DEFAULT_FOLDERS = [
    { name: "Home Images", slug: "home-images", path: "/Home Images", display_order: 1 },
    { name: "Facility Images", slug: "facility-images", path: "/Facility Images", display_order: 2 },
    { name: "Post Images", slug: "post-images", path: "/Post Images", display_order: 3 },
    { name: "Site Images", slug: "site-images", path: "/Site Images", display_order: 10 },
    { name: "Temp", slug: "temp", path: "/Temp", display_order: 99 },
];

// Custom sort order for folders (by slug for consistency)
const FOLDER_ORDER: Record<string, number> = {
    "home-images": 1,
    "facility-images": 2,
    "blog-images": 3,
    "site-images": 10,
    "temp": 99,
};

// Folders that should have a separator before them
const SEPARATOR_BEFORE: string[] = ["site-images"];

// Folder Operations
export async function getFolders(): Promise<MediaFolder[]> {
    const { data, error } = await supabase
        .from("media_folders")
        .select("*")
        .order("name");

    if (error) throw new Error(error.message);

    // Get item counts for each folder
    const { data: countData } = await supabase
        .from("media_items")
        .select("folder_id");

    const folderCounts: Record<string, number> = {};
    (countData || []).forEach((item: any) => {
        const folderId = item.folder_id as string;
        if (folderId) {
            folderCounts[folderId] = (folderCounts[folderId] || 0) + 1;
        }
    });

    // Transform rows to use camelCase fields, then build tree
    const transformedFolders = (data || []).map((row: any) => ({
        id: row.id as string,
        name: row.name as string,
        slug: row.slug as string,
        parentId: row.parent_id as string | undefined,
        path: row.path as string,
        stateId: row.state_id as string | undefined,
        createdAt: row.created_at as string,
        itemCount: folderCounts[row.id as string] || 0,
        displayOrder: FOLDER_ORDER[row.slug as string] || 50,
        isSeparatorBefore: SEPARATOR_BEFORE.includes(row.slug as string),
    }));

    return buildFolderTree(transformedFolders);
}

function buildFolderTree(folders: MediaFolder[]): MediaFolder[] {
    const map = new Map<string, MediaFolder>();
    const roots: MediaFolder[] = [];

    // First pass: create map
    folders.forEach(folder => {
        map.set(folder.id, { ...folder, children: [] });
    });

    // Second pass: build tree
    folders.forEach(folder => {
        const node = map.get(folder.id)!;
        if (folder.parentId) {
            const parent = map.get(folder.parentId);
            if (parent) {
                parent.children = parent.children || [];
                parent.children.push(node);
            }
        } else {
            roots.push(node);
        }
    });

    // Sort by displayOrder (or alphabetically for children without order)
    const sortFolders = (folderList: MediaFolder[]) => {
        folderList.sort((a, b) => {
            const orderA = a.displayOrder ?? 50;
            const orderB = b.displayOrder ?? 50;
            if (orderA !== orderB) return orderA - orderB;
            return a.name.localeCompare(b.name);
        });
        folderList.forEach(folder => {
            if (folder.children && folder.children.length > 0) {
                sortFolders(folder.children);
            }
        });
    };

    sortFolders(roots);

    return roots;
}

export async function createFolder(name: string, parentId?: string): Promise<MediaFolder> {
    const response = await fetch("/api/media/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create folder");
    }

    const result = await response.json();
    return {
        id: result.folder.id,
        name: result.folder.name,
        slug: result.folder.slug,
        parentId: result.folder.parentId,
        path: result.folder.path,
        createdAt: result.folder.createdAt,
    };
}

export async function renameFolder(id: string, newName: string): Promise<MediaFolder> {
    const response = await fetch("/api/media/folders/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: id, newName }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to rename folder");
    }

    const result = await response.json();
    return {
        id: result.folder.id,
        name: result.folder.name,
        slug: result.folder.slug,
        parentId: result.folder.parentId,
        path: result.folder.path,
        createdAt: result.folder.createdAt,
    };
}

export async function deleteFolder(id: string): Promise<void> {
    const response = await fetch("/api/media/folders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: id }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete folder");
    }
}

export async function moveFolderContents(sourceId: string, destinationId: string): Promise<{ count: number; updatedItems: MediaItem[] }> {
    const response = await fetch("/api/media/move-folder-contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceFolderId: sourceId, destinationFolderId: destinationId }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to move folder contents");
    }

    const result = await response.json();
    return {
        count: result.count,
        updatedItems: (result.updatedItems || []).map(transformMediaItem)
    };
}

export async function seedDefaultFolders(): Promise<void> {
    for (const folder of DEFAULT_FOLDERS) {
        const { data: existing } = await supabase
            .from("media_folders")
            .select("id")
            .eq("path", folder.path)
            .single();

        if (!existing) {
            await supabase
                .from("media_folders")
                .insert(folder);
        }
    }
}

// Check if images are used in galleries
export async function getAllUsedImageUrls(): Promise<Set<string>> {
    try {
        const [homesResult, facilitiesResult, postsResult] = await Promise.all([
            supabase.from('homes').select('images'),
            supabase.from('facilities').select('images'),
            supabase.from('posts').select('images')
        ]);

        if (homesResult.error) {
            console.error("Error fetching homes for image usage:", homesResult.error);
        }

        if (facilitiesResult.error) {
            console.error("Error fetching facilities for image usage:", facilitiesResult.error);
        }

        if (postsResult.error) {
            console.error("Error fetching posts for image usage:", postsResult.error);
        }

        const urls = new Set<string>();

        (homesResult.data || []).forEach((home: any) => {
            if (Array.isArray(home.images)) {
                home.images.forEach((url: string) => {
                    if (url) urls.add(url);
                });
            }
        });

        (facilitiesResult.data || []).forEach((facility: any) => {
            if (Array.isArray(facility.images)) {
                facility.images.forEach((url: string) => {
                    if (url) urls.add(url);
                });
            }
        });

        (postsResult.data || []).forEach((post: any) => {
            if (Array.isArray(post.images)) {
                post.images.forEach((url: string) => {
                    if (url) urls.add(url);
                });
            }
        });

        return urls;
    } catch (error) {
        console.error("Error calculating used image URLs:", error);
        return new Set();
    }
}

// Returns only the first image URL from each home/facility gallery (the "Featured Image")
export async function getAllFeaturedImageUrls(): Promise<Set<string>> {
    try {
        const [homesResult, facilitiesResult, postsResult] = await Promise.all([
            supabase.from('homes').select('images'),
            supabase.from('facilities').select('images'),
            supabase.from('posts').select('images')
        ]);

        const urls = new Set<string>();

        (homesResult.data || []).forEach((home: any) => {
            if (Array.isArray(home.images) && home.images.length > 0 && home.images[0]) {
                urls.add(home.images[0]);
            }
        });

        (facilitiesResult.data || []).forEach((facility: any) => {
            if (Array.isArray(facility.images) && facility.images.length > 0 && facility.images[0]) {
                urls.add(facility.images[0]);
            }
        });

        (postsResult.data || []).forEach((post: any) => {
            if (Array.isArray(post.images) && post.images.length > 0 && post.images[0]) {
                urls.add(post.images[0]);
            }
        });

        return urls;
    } catch (error) {
        console.error("Error calculating featured image URLs:", error);
        return new Set();
    }
}

export async function getMediaItems(folderId?: string): Promise<MediaItem[]> {
    let query = supabase
        .from("media_items")
        .select("*")
        .order("created_at", { ascending: false });

    if (folderId) {
        query = query.eq("folder_id", folderId);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return (data || []).map(transformMediaItem);
}

export async function getMediaItem(id: string): Promise<MediaItem> {
    const { data, error } = await supabase
        .from("media_items")
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw new Error(error.message);
    return transformMediaItem(data);
}

export async function updateMediaItem(id: string, updates: Partial<Pick<MediaItem, 'title' | 'altText' | 'caption' | 'description'>> & { folderId?: string | null }): Promise<MediaItem> {
    // Build update object with only defined fields
    const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.altText !== undefined) updateData.alt_text = updates.altText;
    if (updates.caption !== undefined) updateData.caption = updates.caption;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.folderId !== undefined) updateData.folder_id = updates.folderId;

    const { data, error } = await supabase
        .from("media_items")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return transformMediaItem(data);
}

export async function deleteMediaItem(id: string): Promise<{ filename: string }> {
    // Call API to delete both the physical file and database record
    const response = await fetch("/api/media/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: id }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete media item");
    }

    const result = await response.json();
    return { filename: result.filename };
}

export async function uploadMedia(
    file: File,
    folderId?: string,
    onProgress?: (progress: number) => void
): Promise<MediaItem> {
    // Create form data for API upload
    const formData = new FormData();
    formData.append("file", file);
    if (folderId) {
        formData.append("folderId", folderId);
    }

    // Upload to local server via API route
    const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
    }

    const result = await response.json();

    // Get image dimensions on client side
    let width: number | undefined;
    let height: number | undefined;
    if (file.type.startsWith("image/")) {
        const dimensions = await getImageDimensions(file);
        width = dimensions.width;
        height = dimensions.height;

        // Update the record with dimensions
        if (width && height) {
            await supabase
                .from("media_items")
                .update({ width, height })
                .eq("id", result.item.id);
        }
    }

    return {
        ...result.item,
        width,
        height,
        updatedAt: result.item.createdAt,
    };
}

export async function bulkUploadMedia(
    files: File[],
    folderId?: string,
    onProgress?: (completed: number, total: number) => void
): Promise<MediaItem[]> {
    const results: MediaItem[] = [];
    for (let i = 0; i < files.length; i++) {
        const item = await uploadMedia(files[i], folderId);
        results.push(item);
        onProgress?.(i + 1, files.length);
    }
    return results;
}

// Helper functions
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.width, height: img.height });
            URL.revokeObjectURL(img.src);
        };
        img.onerror = () => {
            resolve({ width: 0, height: 0 });
        };
        img.src = URL.createObjectURL(file);
    });
}

// Transform database row to MediaFolder interface
function transformFolder(row: Record<string, unknown>): MediaFolder {
    return {
        id: row.id as string,
        name: row.name as string,
        slug: row.slug as string,
        parentId: row.parent_id as string | undefined,
        path: row.path as string,
        stateId: row.state_id as string | undefined,
        createdAt: row.created_at as string,
    };
}

// Transform database row to MediaItem interface
function transformMediaItem(row: Record<string, unknown>): MediaItem {
    return {
        id: row.id as string,
        folderId: row.folder_id as string | undefined,
        filename: row.filename as string,
        originalFilename: row.original_filename as string,
        title: row.title as string | undefined,
        altText: row.alt_text as string | undefined,
        caption: row.caption as string | undefined,
        description: row.description as string | undefined,
        mimeType: row.mime_type as string,
        fileSize: row.file_size as number,
        width: row.width as number | undefined,
        height: row.height as number | undefined,
        storagePath: row.storage_path as string,
        url: row.url as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    };
}
