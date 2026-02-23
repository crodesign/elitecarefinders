"use client";

import { useRouter } from "next/navigation";
import { PostForm } from "@/components/admin/PostForm";
import { createPost } from "@/lib/services/postService";
import type { Post } from "@/types";
import { toast } from "@/hooks/use-toast";

export default function NewPostPage() {
    const router = useRouter();

    const handleSave = async (data: Partial<Post>) => {
        try {
            await createPost(data as any);
            toast({
                title: "Success",
                description: "Post created successfully"
            });
            router.push("/admin/posts");
        } catch (error: any) {
            console.error("Failed to save:", error);
            throw error; // Let form handle the error toast
        }
    };

    const handleClose = () => {
        router.push("/admin/posts");
    };

    return <PostForm isOpen={true} onClose={handleClose} onSave={handleSave} />;
}
