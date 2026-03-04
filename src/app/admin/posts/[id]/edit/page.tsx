"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PostForm } from "@/components/admin/PostForm";
import { getPost, updatePost } from "@/lib/services/postService";
import type { Post } from "@/types";
import { useNotification } from "@/contexts/NotificationContext";
import { HeartLoader } from "@/components/ui/HeartLoader";

export default function EditPostPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { showNotification } = useNotification();
    const [post, setPost] = useState<Post | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadPost = async () => {
            try {
                const data = await getPost(params.id);
                if (!data) {
                    showNotification("Error", "Post not found");
                    router.push("/admin/posts");
                    return;
                }
                setPost(data);
            } catch (error) {
                console.error("Failed to load post:", error);
                showNotification("Error", "Failed to load post");
                router.push("/admin/posts");
            } finally {
                setIsLoading(false);
            }
        };

    }, [params.id, router, showNotification]);

    const handleSave = async (data: Partial<Post>) => {
        try {
            await updatePost(params.id, data);
            showNotification("Post Updated", data.title || "Post updated successfully");
            router.push("/admin/posts");
        } catch (error: any) {
            console.error("Failed to save:", error);
            throw error; // Let form handle the error toast
        }
    };

    const handleClose = () => {
        router.push("/admin/posts");
    };

    if (isLoading) {
        return (
            <div className="h-screen/2 w-full flex items-center justify-center">
                <HeartLoader />
            </div>
        );
    }

    if (!post) return null;

    return <PostForm isOpen={true} onClose={handleClose} onSave={handleSave} post={post} />;
}
