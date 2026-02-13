"use client";

import { useState, useEffect } from "react";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Home,
    Building2,
    MessageSquare,
    FileText,
    Tags,
    Settings,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    User,
    Users,
    Image as ImageIcon,
    X,
    Bed,
    Plus,
} from "lucide-react";
import { Logo, LogoIcon } from "@/components/icons/Logo";
import { getTaxonomies, updateTaxonomy } from "@/lib/services/taxonomyService";
import { TaxonomyForm } from "./TaxonomyForm";
import type { Taxonomy } from "@/types";

const navigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: Users, requireSystemAdmin: true }, // Only System Admins can see this
    { name: "Media", href: "/admin/media", icon: ImageIcon },
    { name: "Homes", href: "/admin/homes", icon: Home, hasAddButton: true },
    { name: "Facilities", href: "/admin/facilities", icon: Building2, hasAddButton: true },
    { name: "Reviews", href: "/admin/reviews", icon: MessageSquare },
    { name: "Blog", href: "/admin/blog", icon: FileText },
    // { name: "Taxonomies", href: "/admin/taxonomies", icon: Tags }, // Moved to Settings menu
];

interface AdminSidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    onMobileClose?: () => void;
}

import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

// ... (existing imports)

export function AdminSidebar({ collapsed, onToggle, onMobileClose }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
    const { handleNavigation } = useUnsavedChanges();
    const { user, signOut, canAccessSettings, canManageUsers, isSystemAdmin } = useAuth();

    const currentTaxonomyId = searchParams.get('id');
    const manageTaxonomyId = searchParams.get('manage_taxonomy');
    const activeTaxonomy = taxonomies.find(t => t.id === currentTaxonomyId);
    const managingTaxonomy = taxonomies.find(t => t.id === manageTaxonomyId);

    // Fetch taxonomies on mount
    useEffect(() => {
        getTaxonomies().then(setTaxonomies).catch(console.error);
    }, []);

    // Auto-open settings menu if on settings pages
    useEffect(() => {
        if (pathname.startsWith("/admin/taxonomies") || pathname.startsWith("/admin/setup") || pathname.startsWith("/admin/settings") || pathname === "/admin/settings") {
            setShowSettingsMenu(true);
        }
    }, [pathname]);

    // Filter navigation items based on permissions
    const navItems = navigation.filter(item => {
        // Show Users link only to System Admins (not Super Admins)
        if (item.requireSystemAdmin) {
            return isSystemAdmin && !canAccessSettings; // System Admins but not Super Admins
        }
        return true;
    });

    const handleNavClick = (e: React.MouseEvent, href: string) => {
        e.preventDefault();
        if (window.innerWidth < 768 && onMobileClose) {
            onMobileClose();
        }
        handleNavigation(href);
    };

    const handleLogout = async () => {
        await signOut();
        router.push('/login');
    };

    return (
        <aside
            className={`h-screen bg-[#0b1115] border-r border-white/5 transition-all duration-300 flex flex-col relative overflow-hidden ${collapsed ? "w-20" : "w-64"
                }`}
        >
            {/* Hibiscus Background Decoration */}
            {!collapsed && (
                <div
                    className="absolute bottom-20 left-0 right-0 pointer-events-none opacity-10"
                    style={{ height: '300px' }}
                >
                    <Image
                        src="/images/hibiscus-bg.svg"
                        alt=""
                        width={300}
                        height={300}
                        className="absolute -bottom-10 -left-10 w-[280px] h-auto"
                        style={{ transform: 'rotate(-15deg)' }}
                    />
                </div>
            )}

            {/* Logo / Branding Header */}
            <div className="flex-none h-16 flex items-center px-4 border-b border-white/5 relative z-10">
                {!collapsed ? (
                    <Logo className="h-8 w-auto" />
                ) : (
                    <LogoIcon className="h-8 w-8 mx-auto" />
                )}
            </div>

            {/* Collapse Button - hidden on mobile */}
            <button
                onClick={onToggle}
                className="hidden md:flex absolute top-6 right-0 z-[100] h-6 w-6 items-center justify-center text-zinc-400 hover:text-accent hover:bg-accent/10 transition-colors shadow-lg"
                style={{
                    backgroundColor: '#0b1115',
                    borderRadius: '6px 0 0 6px',
                    borderTop: '1px solid rgb(63 63 70)',
                    borderBottom: '1px solid rgb(63 63 70)',
                    borderLeft: '1px solid rgb(63 63 70)',
                    borderRight: 'none'
                }}
            >
                {collapsed ? (
                    <ChevronRight className="h-3 w-3" />
                ) : (
                    <ChevronLeft className="h-3 w-3" />
                )}
            </button>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto space-y-1 px-3 py-4 relative z-10">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));

                    return (
                        <div key={item.name}>
                            <div className={`relative flex items-center rounded-lg transition-all duration-200 group ${isActive
                                ? "bg-accent/10 text-accent shadow-[0_0_20px_rgba(35,157,219,0.15)]"
                                : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                }`}>
                                <Link
                                    href={item.href}
                                    onClick={(e) => handleNavClick(e, item.href)}
                                    className={`flex items-center px-3 py-2.5 text-sm font-medium flex-1`}
                                >
                                    <item.icon
                                        className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-accent" : "text-zinc-500 group-hover:text-white"
                                            }`}
                                    />
                                    {!collapsed && (
                                        <span className="ml-3 truncate flex-1">{item.name}</span>
                                    )}
                                </Link>
                                {/* Add Button */}
                                {item.hasAddButton && !collapsed && (
                                    <Link
                                        href={`${item.href}?action=create`}
                                        onClick={(e) => {
                                            e.stopPropagation(); // Stop propagation to parent link
                                            handleNavClick(e, `${item.href}?action=create`);
                                        }}
                                        className={`mr-2 p-1 rounded-md transition-colors ${isActive
                                            ? "text-accent hover:bg-accent/20"
                                            : "text-zinc-500 hover:text-white hover:bg-white/10"
                                            }`}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Profile Section */}
            <div className="flex-none border-t border-white/5 p-4 relative z-10">
                <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
                    <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-white" />
                    </div>
                    {!collapsed && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {user?.email || 'Admin'}
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-green-400"></span>
                                    <span className="text-xs text-zinc-500">
                                        {user?.role?.role === 'super_admin' ? 'Super Admin' :
                                            user?.role?.role === 'system_admin' ? 'System Admin' :
                                                user?.role?.role === 'local_user' ? 'Local User' : 'Online'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                {canAccessSettings && (
                                    <button
                                        onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                                        className={`p-2 rounded-lg transition-colors ${showSettingsMenu
                                            ? "text-accent bg-accent/10"
                                            : "text-zinc-400 hover:text-accent hover:bg-accent/10"
                                            }`}
                                    >
                                        <Settings className="h-5 w-5" />
                                    </button>
                                )}
                                {!canAccessSettings && (
                                    <button
                                        onClick={handleLogout}
                                        className="p-2 rounded-lg transition-colors text-zinc-400 hover:text-red-400 hover:bg-red-400/10"
                                        title="Logout"
                                    >
                                        <LogOut className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Settings Menu - Slides up from bottom */}
            {!collapsed && (
                <div
                    className={`absolute inset-x-0 bg-[#0b1115] border-t border-white/10 shadow-2xl transition-all duration-300 transform origin-bottom z-20 overflow-hidden ${showSettingsMenu
                        ? "bottom-[73px] opacity-100 scale-100 translate-y-0"
                        : "bottom-[73px] opacity-0 scale-95 translate-y-4 pointer-events-none"
                        }`}
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
                        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            Settings
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    handleLogout();
                                    setShowSettingsMenu(false);
                                }}
                                className="text-zinc-400 hover:text-red-400 transition-colors"
                                title="Logout"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setShowSettingsMenu(false)}
                                className="text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <div className="p-2 space-y-1">
                        <Link
                            href="/admin/taxonomies"
                            onClick={(e) => handleNavClick(e, "/admin/taxonomies")}
                            className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${pathname.startsWith("/admin/taxonomies")
                                ? "bg-accent/10 text-accent shadow-[0_0_20px_rgba(35,157,219,0.15)]"
                                : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                }`}
                        >
                            <Tags className={`h-5 w-5 mr-3 flex-shrink-0 ${pathname.startsWith("/admin/taxonomies") ? "text-accent" : "text-zinc-500 group-hover:text-white"}`} />
                            Taxonomies
                        </Link>
                        <Link
                            href="/admin/setup/room-fields"
                            onClick={(e) => handleNavClick(e, "/admin/setup/room-fields")}
                            className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${pathname.startsWith("/admin/setup/room-fields")
                                ? "bg-accent/10 text-accent shadow-[0_0_20px_rgba(35,157,219,0.15)]"
                                : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                }`}
                        >
                            <Bed className={`h-5 w-5 mr-3 flex-shrink-0 ${pathname.startsWith("/admin/setup/room-fields") ? "text-accent" : "text-zinc-500 group-hover:text-white"}`} />
                            Detail Fields
                        </Link>
                        <Link
                            href="/admin/settings"
                            onClick={(e) => handleNavClick(e, "/admin/settings")}
                            className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${pathname === "/admin/settings"
                                ? "bg-accent/10 text-accent shadow-[0_0_20px_rgba(35,157,219,0.15)]"
                                : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                }`}
                        >
                            <Settings className={`h-5 w-5 mr-3 flex-shrink-0 ${pathname === "/admin/settings" ? "text-accent" : "text-zinc-500 group-hover:text-white"}`} />
                            General
                        </Link>
                        <Link
                            href="/admin/settings/users"
                            onClick={(e) => handleNavClick(e, "/admin/settings/users")}
                            className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${pathname.startsWith("/admin/settings/users")
                                ? "bg-accent/10 text-accent shadow-[0_0_20px_rgba(35,157,219,0.15)]"
                                : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                }`}
                        >
                            <Users className={`h-5 w-5 mr-3 flex-shrink-0 ${pathname.startsWith("/admin/settings/users") ? "text-accent" : "text-zinc-500 group-hover:text-white"}`} />
                            Users
                        </Link>
                    </div>
                </div>
            )}

            {/* Global Taxonomy Manager Overlay */}
            {managingTaxonomy && (
                <TaxonomyForm
                    isOpen={!!managingTaxonomy}
                    onClose={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.delete('manage_taxonomy');
                        router.push(`${pathname}?${params.toString()}`);
                    }}
                    onSave={async (data) => {
                        if (managingTaxonomy) {
                            await updateTaxonomy(managingTaxonomy.id, data);
                            const updated = await getTaxonomies();
                            setTaxonomies(updated);
                        }
                    }}
                    taxonomy={managingTaxonomy}
                    autoOpenEntries={true}
                    closeOnSubPanelClose={true}
                    offsetSidebar={true}
                />
            )}
        </aside>
    );
}
