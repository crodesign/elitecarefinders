'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { HeartLoader } from '@/components/ui/HeartLoader';

export function NavigationLoadingProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isNavigating, setIsNavigating] = useState(false);
    const prevPathname = useRef(pathname);

    // Clear overlay when pathname changes (navigation complete)
    useEffect(() => {
        if (pathname !== prevPathname.current) {
            prevPathname.current = pathname;
            setIsNavigating(false);
        }
    }, [pathname]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const anchor = (e.target as Element).closest('a');
            if (!anchor || !anchor.href) return;
            try {
                const url = new URL(anchor.href);
                if (url.origin !== window.location.origin) return;
                if (url.pathname === window.location.pathname) return;
                setIsNavigating(true);
            } catch { /* ignore */ }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    return (
        <>
            {children}
            {isNavigating && (
                <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div style={{ '--accent': '#239ddb' } as React.CSSProperties}>
                        <HeartLoader size={16} />
                    </div>
                </div>
            )}
        </>
    );
}
