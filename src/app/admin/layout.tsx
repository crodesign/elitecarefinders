"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Logo } from "@/components/icons/Logo";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import { useTheme } from "@/contexts/ThemeContext";

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
    const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed } = useSidebar();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { accent } = useTheme();

    return (
        <div className="min-h-screen bg-surface-primary relative">
            {/* Ambient Glow Background Effects */}
            <div
                className="fixed inset-0 pointer-events-none z-0 transition-colors duration-500"
                style={{
                    background: `
                    radial-gradient(ellipse 80% 50% at 20% 20%, color-mix(in srgb, var(--accent) 15%, transparent), transparent 50%),
                    radial-gradient(ellipse 60% 40% at 80% 80%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 50%),
                    radial-gradient(ellipse 50% 30% at 50% 50%, color-mix(in srgb, var(--accent) 5%, transparent), transparent 60%)
                `
                }}
            />

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-surface-secondary/90 backdrop-blur-xl border-b border-ui-border flex items-center justify-between px-4">
                <Logo className="h-7 w-auto" />
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-hover transition-colors"
                >
                    {mobileMenuOpen ? (
                        <X className="h-6 w-6" />
                    ) : (
                        <Menu className="h-6 w-6" />
                    )}
                </button>
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div
                    className="md:hidden fixed inset-0 z-40"
                    style={{ backgroundColor: 'var(--glass-overlay)', opacity: 0.75 }}
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar - hidden on mobile, shown when menu open */}
            <div className={`
            fixed top-0 left-0 z-[60] h-screen
            transition-transform duration-300
            md:translate-x-0
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
                <AdminSidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                    onMobileClose={() => setMobileMenuOpen(false)}
                />
            </div>

            {/* Main Content */}
            <main
                className={`relative z-10 transition-all duration-300 pt-14 md:pt-0 ${sidebarCollapsed ? "md:ml-20" : "md:ml-64"
                    }`}
            >
                <div className="flex flex-col h-[calc(100dvh-56px)] md:h-screen">
                    {children}
                </div>
            </main>
        </div>
    );
}

import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";
import { ThemeProvider } from "@/contexts/ThemeContext";


export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ThemeProvider>
            <SidebarProvider>
                <NotificationProvider>
                    <UnsavedChangesProvider>
                        <AdminLayoutInner>{children}</AdminLayoutInner>
                    </UnsavedChangesProvider>
                </NotificationProvider>
            </SidebarProvider>
        </ThemeProvider>
    );
}

