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
    Palette,
    Search,
} from "lucide-react";
import { Logo, LogoIcon } from "@/components/icons/Logo";
import { getTaxonomies, updateTaxonomy } from "@/lib/services/taxonomyService";
import { TaxonomyForm } from "./TaxonomyForm";
import { ProfilePanel } from "./ProfilePanel";
import type { Taxonomy } from "@/types";

const navigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: Users, requireSystemAdmin: true }, // Only System Admins can see this
    { name: "Invoices", href: "/admin/invoices", icon: FileText, requireInvoiceManager: true }, // Replaced Blog icon which was FileText
    { name: "Contacts", href: "/admin/contacts", icon: Users },
    { name: "Homes", href: "/admin/homes", icon: Home, hasAddButton: true },
    { name: "Facilities", href: "/admin/facilities", icon: Building2, hasAddButton: true },
    { name: "Reviews", href: "/admin/reviews", icon: MessageSquare },
    { name: "Posts", href: "/admin/posts", icon: FileText, hasAddButton: true },
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
import { useTheme } from "@/contexts/ThemeContext";

// ... (existing imports)

export function AdminSidebar({ collapsed, onToggle, onMobileClose }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { mode } = useTheme();
    const isLight = mode === 'light';
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
    const { handleNavigation } = useUnsavedChanges();
    const { user, signOut, canAccessSettings, canManageUsers, isSystemAdmin, isSuperAdmin } = useAuth();

    const currentTaxonomyId = searchParams.get('id');
    const manageTaxonomyId = searchParams.get('manage_taxonomy');
    const viewProfile = searchParams.get('view_profile') === 'true';
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
        // Invoice managers only see Invoices
        if (user?.role?.role === 'invoice_manager') {
            return item.name === 'Invoices';
        }

        // Users nav item: system_admin only (not super_admin, who uses Settings > Users)
        if (item.requireSystemAdmin) {
            return isSystemAdmin && !isSuperAdmin;
        }

        // Invoices, Contacts, Reviews, Posts: super_admin and system_admin only
        if (['Invoices', 'Contacts', 'Reviews', 'Posts'].includes(item.name)) {
            return isSystemAdmin; // isSystemAdmin is true for both system_admin and super_admin
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
            id="admin-sidebar"
            className={`h-screen bg-surface-secondary transition-all duration-300 flex flex-col relative overflow-hidden ${collapsed ? "w-20" : "w-64"
                }`}
        >
            {/* Hibiscus Background Decoration */}
            {!collapsed && (
                <div
                    className="absolute bottom-20 left-0 right-0 pointer-events-none opacity-10"
                    style={{ height: '300px' }}
                >
                    {/* Dark mode hibiscus */}
                    <Image
                        src="/images/site/hibiscus-bg.svg"
                        alt=""
                        width={300}
                        height={300}
                        className="logo-dark absolute -bottom-10 -left-10 w-[280px] h-auto"
                        style={{ transform: 'rotate(-15deg)' }}
                    />
                    {/* Light mode hibiscus */}
                    <Image
                        src="/images/site/hibiscus-bg-b.svg"
                        alt=""
                        width={300}
                        height={300}
                        className="logo-light absolute -bottom-10 -left-10 w-[280px] h-auto"
                        style={{ transform: 'rotate(-15deg)' }}
                    />
                </div>
            )}

            {/* Logo / Branding Header */}
            <div className="flex-none h-16 flex items-center px-4 bg-surface-secondary relative z-10">
                <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center">
                    {!collapsed ? (
                        <Logo className="h-8 w-auto" />
                    ) : (
                        <LogoIcon className="h-8 w-8 mx-auto" />
                    )}
                </a>
            </div>

            {/* Collapse Button - hidden on mobile */}
            <button
                onClick={onToggle}
                className="hidden md:flex absolute top-6 right-0 z-[100] h-6 w-6 items-center justify-center text-content-muted hover:text-content-primary transition-colors"
                style={{
                    backgroundColor: 'var(--surface-tab)',
                    borderRadius: '6px 0 0 6px',
                }}
            >
                {collapsed ? (
                    <ChevronRight className="h-3 w-3" />
                ) : (
                    <ChevronLeft className="h-3 w-3" />
                )}
            </button>

            {/* Navigation */}
            <div className="relative flex-1 overflow-hidden">
                {/* Glass overlay when settings menu is open */}
                {showSettingsMenu && (
                    <div
                        className="absolute inset-0 z-10 cursor-default backdrop-blur-sm"
                        onClick={() => setShowSettingsMenu(false)}
                        style={{ backgroundColor: 'var(--glass-overlay)' }}
                    />
                )}
                <nav className="h-full overflow-y-auto space-y-1 px-3 py-4 relative z-0">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));

                        return (
                            <div key={item.name}>
                                <div className={`nav-item relative flex items-center rounded-lg transition-all duration-200 group ${isActive
                                    ? "active text-content-primary"
                                    : "text-content-secondary hover:text-content-primary"
                                    }`}>
                                    <Link
                                        href={item.href}
                                        onClick={(e) => handleNavClick(e, item.href)}
                                        className={`flex items-center px-3 py-2.5 text-sm font-medium flex-1 ${collapsed ? 'justify-center mx-2' : ''}`}
                                    >
                                        <item.icon
                                            className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-accent" : "text-content-muted group-hover:text-content-primary"
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
                                            className={`mr-2 p-1 rounded-md transition-colors text-content-muted hover:text-content-primary hover:bg-surface-secondary`}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </nav>
            </div>

            {/* Profile Section */}
            <div className="flex-none bg-surface-secondary p-4 relative z-30">
                <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
                    <Link
                        href={`${pathname}?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), view_profile: 'true' }).toString()}`}
                        onClick={(e) => {
                            e.preventDefault();
                            if (window.innerWidth < 768 && onMobileClose) {
                                onMobileClose();
                            }
                            const params = new URLSearchParams(searchParams.toString());
                            params.set('view_profile', 'true');
                            router.push(`${pathname}?${params.toString()}`, { scroll: false });
                        }}
                        className={`flex items-center gap-3 flex-1 min-w-0 rounded-lg transition-colors hover:bg-[var(--surface-tab)] ${collapsed ? "justify-center p-1" : "p-1 -m-1"}`}
                    >
                        {user?.profile?.photo_url ? (
                            <Image
                                src={user.profile.photo_url}
                                alt={user.profile.full_name || 'Profile'}
                                width={36}
                                height={36}
                                className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                            />
                        ) : (
                            <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                                <User className="h-5 w-5 text-content-primary" />
                            </div>
                        )}
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-content-primary truncate">
                                    {user?.profile?.nickname || user?.profile?.full_name?.split(' ')[0] || user?.email || 'User'}
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-green-400"></span>
                                    <span className="text-xs text-content-muted">
                                        {user?.role?.role === 'super_admin' ? 'Super Admin' :
                                            user?.role?.role === 'system_admin' ? 'System Admin' :
                                                user?.role?.role === 'regional_manager' ? 'Regional Manager' :
                                                    user?.role?.role === 'location_manager' ? 'Location Manager' :
                                                        user?.role?.role === 'local_user' ? 'Local User' : 'Online'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </Link>
                    {!collapsed && (
                        <div className="flex flex-col gap-1">
                            {canAccessSettings && (
                                <button
                                    onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                                    className={`p-2 rounded-lg transition-colors ${showSettingsMenu
                                        ? "text-accent bg-accent/10"
                                        : "text-content-secondary hover:text-accent hover:bg-accent/10"
                                        }`}
                                >
                                    <Settings className="h-5 w-5" />
                                </button>
                            )}
                            {!canAccessSettings && (
                                <button
                                    onClick={handleLogout}
                                    className="p-2 rounded-lg transition-colors text-content-secondary hover:text-red-400 hover:bg-red-400/10"
                                    title="Logout"
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Settings Menu - Slides up from bottom */}
            {!collapsed && (
                <div
                    className={`absolute inset-x-0 bottom-0 shadow-2xl z-20 overflow-hidden rounded-t-xl
                        transition-transform duration-300 ease-out
                        ${showSettingsMenu ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}
                    style={{
                        paddingBottom: '73px',
                        backgroundColor: 'color-mix(in srgb, var(--surface-secondary) 75%, transparent)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                    }}
                >
                    <div className="flex items-center justify-between px-4 py-3 bg-surface-card">
                        <h3 className="text-xs font-semibold text-content-secondary uppercase tracking-wider">
                            Settings
                        </h3>
                        <div className="flex items-center">
                            <button
                                onClick={() => {
                                    handleLogout();
                                    setShowSettingsMenu(false);
                                }}
                                className="p-1 rounded-md text-content-muted hover:text-red-400 hover:bg-surface-hover transition-colors"
                                title="Logout"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setShowSettingsMenu(false)}
                                className="p-1 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-hover transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <div className="p-2 space-y-1">
                        {isSuperAdmin && (
                        <Link
                            href="/admin/settings"
                            onClick={(e) => handleNavClick(e, "/admin/settings")}
                            className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${pathname === "/admin/settings"
                                ? "bg-surface-hover text-content-primary"
                                : "text-content-secondary hover:bg-surface-hover hover:text-content-primary"
                                }`}
                        >
                            <Settings className={`h-5 w-5 mr-3 flex-shrink-0 ${pathname === "/admin/settings" ? "text-accent" : "text-content-muted group-hover:text-content-primary"}`} />
                            General
                        </Link>
                        )}
                        {isSuperAdmin && (
                            <Link
                                href="/admin/settings/pages"
                                onClick={(e) => handleNavClick(e, "/admin/settings/pages")}
                                className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${pathname.startsWith("/admin/settings/pages")
                                    ? "bg-surface-hover text-content-primary"
                                    : "text-content-secondary hover:bg-surface-hover hover:text-content-primary"
                                    }`}
                            >
                                <FileText className={`h-5 w-5 mr-3 flex-shrink-0 ${pathname.startsWith("/admin/settings/pages") ? "text-accent" : "text-content-muted group-hover:text-content-primary"}`} />
                                Pages
                            </Link>
                        )}
                        {isSuperAdmin && (
                            <Link
                                href="/admin/settings/seo-templates"
                                onClick={(e) => handleNavClick(e, "/admin/settings/seo-templates")}
                                className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${pathname.startsWith("/admin/settings/seo-templates")
                                    ? "bg-surface-hover text-content-primary"
                                    : "text-content-secondary hover:bg-surface-hover hover:text-content-primary"
                                    }`}
                            >
                                <Search className={`h-5 w-5 mr-3 flex-shrink-0 ${pathname.startsWith("/admin/settings/seo-templates") ? "text-accent" : "text-content-muted group-hover:text-content-primary"}`} />
                                SEO Templates
                            </Link>
                        )}
                        {isSuperAdmin && (
                        <Link
                            href="/admin/taxonomies"
                            onClick={(e) => handleNavClick(e, "/admin/taxonomies")}
                            className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${pathname.startsWith("/admin/taxonomies")
                                ? "bg-surface-hover text-content-primary"
                                : "text-content-secondary hover:bg-surface-hover hover:text-content-primary"
                                }`}
                        >
                            <Tags className={`h-5 w-5 mr-3 flex-shrink-0 ${pathname.startsWith("/admin/taxonomies") ? "text-accent" : "text-content-muted group-hover:text-content-primary"}`} />
                            Taxonomies
                        </Link>
                        )}
                        {isSuperAdmin && (
                        <Link
                            href="/admin/setup/room-fields"
                            onClick={(e) => handleNavClick(e, "/admin/setup/room-fields")}
                            className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${pathname.startsWith("/admin/setup/room-fields")
                                ? "bg-surface-hover text-content-primary"
                                : "text-content-secondary hover:bg-surface-hover hover:text-content-primary"
                                }`}
                        >
                            <Bed className={`h-5 w-5 mr-3 flex-shrink-0 ${pathname.startsWith("/admin/setup/room-fields") ? "text-accent" : "text-content-muted group-hover:text-content-primary"}`} />
                            Detail Fields
                        </Link>
                        )}
                        {isSuperAdmin && (
                            <Link
                                href="/admin/settings/site-images"
                                onClick={(e) => handleNavClick(e, "/admin/settings/site-images")}
                                className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${pathname.startsWith("/admin/settings/site-images")
                                    ? "bg-surface-hover text-content-primary"
                                    : "text-content-secondary hover:bg-surface-hover hover:text-content-primary"
                                    }`}
                            >
                                <ImageIcon className={`h-5 w-5 mr-3 flex-shrink-0 ${pathname.startsWith("/admin/settings/site-images") ? "text-accent" : "text-content-muted group-hover:text-content-primary"}`} />
                                Site Images
                            </Link>
                        )}
                        <Link
                            href="/admin/settings/users"
                            onClick={(e) => handleNavClick(e, "/admin/settings/users")}
                            className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${pathname.startsWith("/admin/settings/users")
                                ? "bg-surface-hover text-content-primary"
                                : "text-content-secondary hover:bg-surface-hover hover:text-content-primary"
                                }`}
                        >
                            <Users className={`h-5 w-5 mr-3 flex-shrink-0 ${pathname.startsWith("/admin/settings/users") ? "text-accent" : "text-content-muted group-hover:text-content-primary"}`} />
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

            {/* Profile Panel Overlay */}
            <ProfilePanel
                isOpen={viewProfile}
                onClose={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete('view_profile');
                    router.push(`${pathname}?${params.toString()}`, { scroll: false });
                }}
                offsetSidebar={true}
            />
        </aside>
    );
}
