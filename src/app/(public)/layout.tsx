import type { Metadata } from 'next';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
config.autoAddCss = false;
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { FavoritesShell } from '@/components/public/FavoritesShell';

export const metadata: Metadata = {
    title: { template: '%s | Elite CareFinders', default: 'Elite CareFinders' },
    description: 'Senior living advisors helping families find the best care.',
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col bg-white text-gray-900" style={{ '--accent': '#239ddb' } as React.CSSProperties}>
            <FavoritesShell>
                <PublicHeader />
                <main className="flex-1">{children}</main>
                <PublicFooter />
            </FavoritesShell>
        </div>
    );
}
