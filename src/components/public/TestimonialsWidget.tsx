'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';

export function TestimonialsWidget() {
    const containerRef = useRef<HTMLDivElement>(null);
    const injected = useRef(false);

    useEffect(() => {
        if (injected.current || !containerRef.current) return;
        injected.current = true;

        const s1 = document.createElement('script');
        s1.src = 'https://cdn.trustindex.io/loader.js?07222ea611b977924806dfcdb0c';
        s1.defer = true;
        s1.async = true;
        containerRef.current.appendChild(s1);

        const s2 = document.createElement('script');
        s2.src = 'https://cdn.trustindex.io/loader.js?cb4eda061a4577951396bec726d';
        s2.defer = true;
        s2.async = true;
        containerRef.current.appendChild(s2);
    }, []);

    return (
        <section className="max-w-6xl mx-auto px-5 py-16">
            <div className="flex items-end justify-between mb-8">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#239ddb] mb-1">Testimonials</p>
                    <h2 className="text-3xl font-bold text-gray-900">What Our Clients Say</h2>
                    <Link
                        href="/reviews"
                        className="mt-3 sm:hidden inline-flex items-center gap-1.5 text-sm font-semibold bg-[#239ddb] text-white rounded-lg px-4 py-2 hover:bg-[#1a7fb8] transition-colors"
                    >
                        View All Testimonials <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                    </Link>
                </div>
                <Link
                    href="/reviews"
                    className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold bg-[#239ddb] text-white rounded-lg px-4 py-2 hover:bg-[#1a7fb8] transition-colors"
                >
                    View All Testimonials <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                </Link>
            </div>
            <div ref={containerRef} />
        </section>
    );
}
