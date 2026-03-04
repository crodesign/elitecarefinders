
/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['@napi-rs/canvas', '@napi-rs/canvas-win32-x64-msvc', 'pdfjs-dist'],
    },
    webpack(config, { isServer }) {
        if (isServer) {
            // Prevent webpack from trying to bundle native .node binaries
            const originalExternals = config.externals || [];
            config.externals = [
                ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
                '@napi-rs/canvas',
                '@napi-rs/canvas-win32-x64-msvc',
            ];
        }
        return config;
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'kkdklpwmohjsagauirus.supabase.co',
                port: '',
                pathname: '/storage/v1/object/public/**',
            },
            {
                protocol: 'https',
                hostname: 'pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev',
                port: '',
                pathname: '/media/**',
            },
        ],
    },
};

export default nextConfig;
