"use client";

export function HeartLoader({ size = 10 }: { size?: number }) {
    return (
        <>
            <style>{`
                @keyframes heartSpin {
                    from { stroke-dashoffset: 0; }
                    to   { stroke-dashoffset: 1; }
                }
            `}</style>
            <svg
                viewBox="0 0 24 24"
                className={`h-${size} w-${size}`}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path
                    pathLength="1"
                    strokeDasharray="0.9 0.1"
                    style={{ animation: "heartSpin 1.2s linear infinite" }}
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                />
            </svg>
        </>
    );
}
