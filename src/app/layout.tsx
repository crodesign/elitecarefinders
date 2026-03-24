import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { HeadInjector } from "@/components/HeadInjector";

import { cookies } from "next/headers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    metadataBase: new URL('https://elitecarefinders.com'),
    title: "Elite CareFinders",
    description: "Senior Living Advisors",
    icons: {
        icon: 'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site-4.png',
    },
};

function hexToHsl(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function lighten(hex: string, amount: number) {
    const [h, s, l] = hexToHsl(hex);
    return `hsl(${h}, ${s}%, ${Math.min(100, l + amount)}%)`;
}

function darken(hex: string, amount: number) {
    const [h, s, l] = hexToHsl(hex);
    return `hsl(${h}, ${s}%, ${Math.max(0, l - amount)}%)`;
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // 1. Read the theme cookie on the server
    const cookieStore = await cookies();
    const themeCookie = cookieStore.get('elite_theme');

    let accent = '#239ddb';
    let mode = 'dark';
    let grey = 'zinc';

    if (themeCookie?.value) {
        try {
            const parsed = JSON.parse(decodeURIComponent(themeCookie.value));
            if (parsed.accent) accent = parsed.accent;
            if (parsed.mode) mode = parsed.mode;
            if (parsed.grey) grey = parsed.grey;
        } catch (e) {
            console.error("Failed to parse theme cookie", e);
        }
    }

    // 2. Generate the CSS variables object for inline injection
    const accentLight = lighten(accent, 12);
    const accentDark = darken(accent, 12);
    const themeStyles = {
        '--accent': accent,
        '--accent-light': accentLight,
        '--accent-dark': accentDark,
    } as React.CSSProperties;

    // 3. Render HTML with injected inline styles
    return (
        <html
            lang="en"
            suppressHydrationWarning
            data-theme={mode === 'light' ? 'light' : undefined}
            data-grey={grey}
            style={themeStyles}
        >
            <head />
            <body className={inter.className}>
                <HeadInjector />
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}

