'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

interface DiagonalRevealProps {
    children: ReactNode;
    color?: string;
    className?: string;
}

export function DiagonalReveal({ children, color = '#f0f8fc', className = '' }: DiagonalRevealProps) {
    const [revealed, setRevealed] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => setRevealed(entry.isIntersecting),
            { threshold: 1.0 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className={`relative overflow-hidden ${className}`}>
            <div
                className={`absolute inset-0 diagonal-reveal-overlay${revealed ? ' diagonal-reveal-active' : ''}`}
                style={{ backgroundColor: color }}
            />
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
