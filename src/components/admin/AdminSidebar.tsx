"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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
    User,
} from "lucide-react";
import { Logo, LogoIcon } from "@/components/icons/Logo";

const navigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Homes", href: "/admin/homes", icon: Home },
    { name: "Facilities", href: "/admin/facilities", icon: Building2 },
    { name: "Reviews", href: "/admin/reviews", icon: MessageSquare },
    { name: "Blog", href: "/admin/blog", icon: FileText },
    { name: "Taxonomies", href: "/admin/taxonomies", icon: Tags },
];

interface AdminSidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    onMobileClose?: () => void;
}

export function AdminSidebar({ collapsed, onToggle, onMobileClose }: AdminSidebarProps) {
    const pathname = usePathname();

    const handleNavClick = () => {
        if (onMobileClose) {
            onMobileClose();
        }
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
                {navigation.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (item.href !== "/admin" && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={handleNavClick}
                            className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                                ? "bg-accent/10 text-accent shadow-[0_0_20px_rgba(35,157,219,0.15)]"
                                : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                }`}
                            title={collapsed ? item.name : undefined}
                        >
                            <item.icon
                                className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-accent" : "text-zinc-500 group-hover:text-white"
                                    }`}
                            />
                            {!collapsed && <span className="ml-3 truncate">{item.name}</span>}
                        </Link>
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
                                <p className="text-sm font-medium text-white truncate">Admin</p>
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-green-400"></span>
                                    <span className="text-xs text-zinc-500">Online</span>
                                </div>
                            </div>
                            <Link
                                href="/admin/settings"
                                onClick={handleNavClick}
                                className="p-2 rounded-lg text-zinc-400 hover:text-accent hover:bg-accent/10 transition-colors"
                                title="Settings"
                            >
                                <Settings className="h-5 w-5" />
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
}
