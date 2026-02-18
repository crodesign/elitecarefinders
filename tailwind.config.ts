import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px'
            }
        },
        extend: {
            colors: {
                // Existing EliteCareFinders accent
                accent: {
                    DEFAULT: "#239ddb",
                    light: "#4bb3e8",
                    dark: "#1a7fb3",
                    foreground: 'hsl(var(--accent-foreground))' // Added for compatibility
                },
                // Lovable UI Colors
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                'button-save': {
                    DEFAULT: 'hsl(var(--button-save))',
                    foreground: 'hsl(var(--button-save-foreground))'
                },
                'button-grey': {
                    DEFAULT: 'hsl(var(--button-grey))',
                    foreground: 'hsl(var(--button-grey-foreground))'
                },
                'button-view': {
                    DEFAULT: '152 75% 51%',  /* #23db87 - Green for View buttons */
                    foreground: '0 0% 100%'
                },
                'button-edit': {
                    DEFAULT: '202 75% 51%',  /* #239ddb - Blue for Edit buttons */
                    foreground: '0 0% 100%'
                },
                'status-active': {
                    DEFAULT: 'hsl(var(--status-active))',
                    foreground: 'hsl(0 0% 100%)'
                },
                'status-paused': {
                    DEFAULT: 'hsl(var(--status-paused))',
                    foreground: 'hsl(0 0% 100%)'
                },
                'status-disabled': {
                    DEFAULT: 'hsl(var(--status-disabled))',
                    foreground: 'hsl(0 0% 100%)'
                },
                sidebar: {
                    DEFAULT: 'hsl(var(--sidebar-background))',
                    foreground: 'hsl(var(--sidebar-foreground))',
                    primary: 'hsl(var(--sidebar-primary))',
                    'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
                    accent: 'hsl(var(--sidebar-accent))',
                    'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
                    border: 'hsl(var(--sidebar-border))',
                    ring: 'hsl(var(--sidebar-ring))'
                }
            },
            fontSize: {
                'title-desktop': '1.65rem',
                'title-tablet': '1.6rem',
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' }
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' }
                },
                'swipe-left': {
                    '0%': { transform: 'translateX(0px)', opacity: '1' },
                    '100%': { transform: 'translateX(-20px)', opacity: '0.8' }
                },
                'swipe-right': {
                    '0%': { transform: 'translateX(0px)', opacity: '1' },
                    '100%': { transform: 'translateX(20px)', opacity: '0.8' }
                },
                'slide-up-mobile': {
                    '0%': { transform: 'translateY(100%)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' }
                },
                'slide-down-mobile': {
                    '0%': { transform: 'translateY(0)', opacity: '1' },
                    '100%': { transform: 'translateY(-100%)', opacity: '0' }
                },
                'fadeSlideUp': {
                    '0%': { transform: 'translateY(0)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' }
                },
                'fadeSlideFromRight': {
                    '0%': { transform: 'translateX(0)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' }
                },
                'fadeSlideFromLeft': {
                    '0%': { transform: 'translateX(0)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' }
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'swipe-left': 'swipe-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                'swipe-right': 'swipe-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                'slide-up-mobile': 'slide-up-mobile 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                'slide-down-mobile': 'slide-down-mobile 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                'fadeSlideUp': 'fadeSlideUp 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                'fadeSlideFromRight': 'fadeSlideFromRight 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                'fadeSlideFromLeft': 'fadeSlideFromLeft 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }
        },
    },
    plugins: [
        require("@tailwindcss/typography"),
        require("tailwindcss-animate"),
    ],
};
export default config;
