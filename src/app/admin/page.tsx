"use client";

import { Home, Building2, FileText, Tags } from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
    const quickLinks = [
        { name: "Homes", href: "/admin/homes", icon: Home, color: "text-blue-400" },
        { name: "Facilities", href: "/admin/facilities", icon: Building2, color: "text-green-400" },
        { name: "Blog", href: "/admin/blog", icon: FileText, color: "text-purple-400" },
        { name: "Taxonomies", href: "/admin/taxonomies", icon: Tags, color: "text-orange-400" },
    ];

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-content-primary">Dashboard</h1>
                <p className="text-sm text-content-secondary mt-1">
                    Welcome to the Elite Care Finders Content Management System
                </p>
            </div>

            {/* Quick Links */}
            <div>
                <h2 className="text-lg font-semibold text-content-primary mb-4">Quick Links</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="card border-0 p-6 hover:bg-surface-hover transition-colors group"
                        >
                            <link.icon className={`h-8 w-8 ${link.color} mb-3`} />
                            <h3 className="text-content-primary font-medium group-hover:text-accent transition-colors">
                                {link.name}
                            </h3>
                            <p className="text-sm text-content-muted mt-1">Manage {link.name.toLowerCase()}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
