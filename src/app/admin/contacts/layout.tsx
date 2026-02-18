"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUserRole } from "@/hooks/useUserRole";

export default function ContactsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isInvoiceOnly, loading } = useUserRole();
    const router = useRouter();

    useEffect(() => {
        if (!loading && isInvoiceOnly) {
            router.push("/admin/invoices");
        }
    }, [isInvoiceOnly, loading, router]);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    // Prevent flash of content if redirecting
    if (isInvoiceOnly) return null;

    return (
        <TooltipProvider>
            {children}
            <Toaster />
        </TooltipProvider>
    );
}
