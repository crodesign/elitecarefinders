"use client";

import { supabase } from "@/lib/supabase";
import type { Post, PostType, PostMetadata, SeoFields } from "@/types";

function mapSeoFromDb(row: any): SeoFields {
    return {
        metaTitle: row.meta_title ?? null,
        metaDescription: row.meta_description ?? null,
        canonicalUrl: row.canonical_url ?? null,
        indexable: row.indexable ?? true,
        ogTitle: row.og_title ?? null,
        ogDescription: row.og_description ?? null,
        ogImageUrl: row.og_image_url ?? null,
        schemaJson: row.schema_json ?? null,
    };
}

function mapSeoToDb(seo: SeoFields | undefined): Record<string, unknown> {
    if (!seo) return {};
    return {
        meta_title: seo.metaTitle ?? null,
        meta_description: seo.metaDescription ?? null,
        canonical_url: seo.canonicalUrl ?? null,
        indexable: seo.indexable ?? true,
        og_title: seo.ogTitle ?? null,
        og_description: seo.ogDescription ?? null,
        og_image_url: seo.ogImageUrl ?? null,
        schema_json: seo.schemaJson ?? null,
    };
}

function transformPost(post: any): Post {
    return {
        ...post,
        images: post.images || [],
        featuredImageUrl: post.images && post.images.length > 0 ? post.images[0] : null,
        videoUrl: post.video_url || null,
        authorId: post.author_id,
        postType: post.post_type as PostType,
        publishedAt: post.published_at,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        seo: mapSeoFromDb(post),
    };
}

export async function getPosts(): Promise<Post[]> {
    const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching posts:", error);
        throw new Error(error.message);
    }

    return (data || []).map(transformPost);
}

export async function searchPosts(query: string): Promise<Post[]> {
    const { data, error } = await supabase.rpc('search_posts', { keyword: query });
    if (error) throw new Error(error.message);
    return (data || []).map(transformPost);
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

    return transformPost(data);
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
        ...mapSeoToDb(post.seo),
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

    return transformPost(data);
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
    if (updates.seo !== undefined) Object.assign(dbUpdates, mapSeoToDb(updates.seo));

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

    return transformPost(data);
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
