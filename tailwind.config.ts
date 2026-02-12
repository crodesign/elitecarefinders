import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Primary accent color
                accent: {
                    DEFAULT: "#239ddb",
                    light: "#4bb3e8",
                    dark: "#1a7fb3",
                },
            },
        },
    },
    plugins: [
        require("@tailwindcss/typography"),
    ],
};
export default config;
