"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle, XCircle, Home, Building2, FileText, Tags } from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
    const [isConnected, setIsConnected] = useState<boolean | null>(null);

    useEffect(() => {
        async function checkConnection() {
            try {
                const { error } = await supabase.auth.getSession();
                if (error) throw error;
                setIsConnected(true);
            } catch (e) {
                console.error("Supabase connection error:", e);
                setIsConnected(false);
            }
        }
        checkConnection();
    }, []);

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
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-sm text-zinc-400 mt-1">
                    Welcome to the Elite Care Finders Content Management System
                </p>
            </div>

            {/* System Status */}
            <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">System Status</h2>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5">
                        {isConnected === null ? (
                            <div className="h-6 w-6 animate-pulse rounded-full bg-zinc-700" />
                        ) : isConnected ? (
                            <CheckCircle className="h-6 w-6 text-green-400" />
                        ) : (
                            <XCircle className="h-6 w-6 text-red-400" />
                        )}
                        <div>
                            <p className="text-sm font-medium text-white">Supabase Connection</p>
                            <p className="text-xs text-zinc-500">
                                {isConnected === null ? "Checking..." : isConnected ? "Connected" : "Disconnected"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-4">Quick Links</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="card p-6 hover:bg-white/5 transition-colors group"
                        >
                            <link.icon className={`h-8 w-8 ${link.color} mb-3`} />
                            <h3 className="text-white font-medium group-hover:text-accent transition-colors">
                                {link.name}
                            </h3>
                            <p className="text-sm text-zinc-500 mt-1">Manage {link.name.toLowerCase()}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
