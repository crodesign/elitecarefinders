"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function MediaRedirectPage() {
    const router = useRouter();
    const { isSuperAdmin, isLoading } = useAuth();

    useEffect(() => {
        if (isLoading) return;

        if (isSuperAdmin) {
            router.replace("/admin/settings/site-images");
        } else {
            router.replace("/admin");
        }
    }, [isSuperAdmin, isLoading, router]);

    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
    );
}
