"use client";

import { supabase } from "@/lib/supabase";
import type { Post, PostType, PostMetadata } from "@/types";

export async function getPosts(): Promise<Post[]> {
    const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching posts:", error);
        throw new Error(error.message);
    }

    return (data || []).map((post: any) => ({
        ...post,
        images: post.images || [],
        featuredImageUrl: post.images && post.images.length > 0 ? post.images[0] : null,
        videoUrl: post.video_url || null,
        authorId: post.author_id,
        postType: post.post_type as PostType,
        publishedAt: post.published_at,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
    }));
}

export async function getPost(id: string): Promise<Post | null> {
    const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        console.error(`Error fetching post ${id}:`, error);
        return null;
    }

    return {
        ...data,
        images: data.images || [],
        featuredImageUrl: data.images && data.images.length > 0 ? data.images[0] : null,
        videoUrl: data.video_url || null,
        authorId: data.author_id,
        postType: data.post_type as PostType,
        publishedAt: data.published_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
}

export type CreatePostInput = Omit<Post, "id" | "createdAt" | "updatedAt">;

export async function createPost(post: CreatePostInput): Promise<Post> {
    const { data: { user } } = await supabase.auth.getUser();

    const dbPayload = {
        title: post.title,
        slug: post.slug,
        content: post.content,
        excerpt: post.excerpt,
        video_url: post.videoUrl,
        images: post.images || [],
        author_id: user?.id,
        post_type: post.postType,
        status: post.status || 'draft',
        metadata: post.metadata || {},
        published_at: post.status === 'published' ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
        .from("posts")
        .insert(dbPayload)
        .select()
        .single();

    if (error) {
        console.error("Error creating post:", error);
        throw new Error(error.message);
    }

    return {
        ...data,
        images: data.images || [],
        featuredImageUrl: data.images && data.images.length > 0 ? data.images[0] : null,
        videoUrl: data.video_url || null,
        authorId: data.author_id,
        postType: data.post_type as PostType,
        publishedAt: data.published_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
}

export async function updatePost(id: string, updates: Partial<Post>): Promise<Post> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.excerpt !== undefined) dbUpdates.excerpt = updates.excerpt;
    if (updates.videoUrl !== undefined) dbUpdates.video_url = updates.videoUrl;
    if (updates.images !== undefined) dbUpdates.images = updates.images;
    if (updates.authorId !== undefined) dbUpdates.author_id = updates.authorId;
    if (updates.postType !== undefined) dbUpdates.post_type = updates.postType;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.metadata !== undefined) dbUpdates.metadata = updates.metadata;

    if (updates.status === 'published' && updates.publishedAt === undefined) {
        dbUpdates.published_at = new Date().toISOString();
    } else if (updates.publishedAt !== undefined) {
        dbUpdates.published_at = updates.publishedAt;
    }

    const { data, error } = await supabase
        .from("posts")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error(`Error updating post ${id}:`, error);
        throw new Error(error.message);
    }

    return {
        ...data,
        images: data.images || [],
        featuredImageUrl: data.images && data.images.length > 0 ? data.images[0] : null,
        videoUrl: data.video_url || null,
        authorId: data.author_id,
        postType: data.post_type as PostType,
        publishedAt: data.published_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
}

export async function deletePost(id: string, slug?: string): Promise<void> {
    if (slug) {
        try {
            await fetch('/api/media/delete-entity', {
                method: 'POST',
                body: JSON.stringify({ slug }),
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            console.error(`Failed to delete media for post ${slug}:`, e);
        }
    }

    const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", id);

    if (error) {
        console.error(`Error deleting post ${id}:`, error);
        throw new Error(error.message);
    }
}
