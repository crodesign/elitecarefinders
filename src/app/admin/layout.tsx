"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Logo } from "@/components/icons/Logo";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

// ─── Restricted Shell (local_user / location_manager) ─────────────────────────

function RestrictedShell({ children }: { children: React.ReactNode }) {
    const { user, signOut } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    // Force light mode
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'light');
    }, []);

    // Redirect dashboard and per-entity pages to the merged listing
    useEffect(() => {
        if (
            pathname === '/admin' ||
            pathname === '/admin/homes' ||
            pathname === '/admin/facilities'
        ) {
            router.replace('/admin/my-listings');
        }
    }, [pathname, router]);

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
            {/* Top bar */}
            <div
                className="fixed top-0 left-0 right-0 z-[50] h-14 flex items-center justify-between px-5 shadow-sm"
                style={{ backgroundColor: '#239ddb' }}
            >
                <Logo className="h-7 w-auto brightness-0 invert" />
                <div className="flex items-center gap-3">
                    {user?.email && (
                        <span className="text-sm text-white/80 hidden sm:block truncate max-w-[200px]">
                            {user.email}
                        </span>
                    )}
                    <button
                        onClick={signOut}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign Out
                    </button>
                    <Link
                        href="/profile"
                        className="p-1.5 text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </Link>
                </div>
            </div>

            {/* Content */}
            <main className="pt-14">
                <div className="h-[calc(100dvh-56px)]">
                    {children}
                </div>
            </main>
        </div>
    );
}

// ─── Full Admin Shell ──────────────────────────────────────────────────────────

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
    const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed } = useSidebar();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { accent } = useTheme();
    const { isLocalUser, isLocationManager, loading } = useAuth();
    const isRestricted = isLocalUser || isLocationManager;

    // Avoid shell flash while auth loads
    if (loading) {
        return <div className="min-h-screen bg-surface-primary" />;
    }

    if (isRestricted) {
        return <RestrictedShell>{children}</RestrictedShell>;
    }

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
            <div id="admin-mobile-header" className="md:hidden fixed top-0 left-0 right-0 z-[60] h-14 bg-surface-secondary/90 backdrop-blur-xl border-b border-ui-border flex items-center justify-between px-4">
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
                    className="md:hidden fixed inset-0 z-[65]"
                    style={{ backgroundColor: 'var(--glass-overlay)', opacity: 0.75 }}
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
            fixed top-0 left-0 z-[70] h-screen
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

// ─── Root Export ───────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
