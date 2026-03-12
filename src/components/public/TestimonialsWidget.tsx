'use client';

import { useEffect, useRef } from 'react';

export function TestimonialsWidget() {
    const containerRef = useRef<HTMLDivElement>(null);
    const injected = useRef(false);

    useEffect(() => {
        if (injected.current || !containerRef.current) return;
        injected.current = true;

        const s = document.createElement('script');
        s.src = 'https://cdn.trustindex.io/loader.js?07222ea611b977924806dfcdb0c';
        s.defer = true;
        s.async = true;
        containerRef.current.appendChild(s);
    }, []);

    return (
        <section className="max-w-6xl mx-auto px-5 py-16">
            <div className="mb-8 text-center">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#239ddb] mb-1">Testimonials</p>
                <h2 className="text-3xl font-bold text-gray-900">What Our Clients Say</h2>
            </div>
            <div ref={containerRef} />
        </section>
    );
}
