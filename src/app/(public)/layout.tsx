import type { Metadata } from 'next';
import { Alex_Brush, Montserrat } from 'next/font/google';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
config.autoAddCss = false;
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { FavoritesShell } from '@/components/public/FavoritesShell';

const alexBrush = Alex_Brush({ weight: '400', subsets: ['latin'], variable: '--font-alex-brush' });
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });

export const metadata: Metadata = {
    title: { template: '%s | Elite CareFinders', default: 'Elite CareFinders' },
    description: 'Senior living advisors helping families find the best care.',
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={`${alexBrush.variable} ${montserrat.variable} min-h-screen flex flex-col bg-white text-gray-900`} data-theme="light" style={{ '--accent': '#239ddb' } as React.CSSProperties}>
            <FavoritesShell>
                <PublicHeader />
                <main className="flex-1">{children}</main>
                <PublicFooter />
            </FavoritesShell>
        </div>
    );
}
