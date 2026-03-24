'use client';

import type { ReactNode } from 'react';
import { useFilterPending } from './FilterPendingProvider';
import { HeartLoader } from '@/components/ui/HeartLoader';

export function FilterLoadingOverlay({ children }: { children: ReactNode }) {
    const { isPending } = useFilterPending();
    return (
        <>
            {children}
            {isPending && (
                <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div style={{ '--accent': '#239ddb' } as React.CSSProperties}>
                        <HeartLoader size={16} />
                    </div>
                </div>
            )}
        </>
    );
}
