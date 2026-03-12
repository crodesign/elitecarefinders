'use client';

import { useEffect, useRef } from 'react';

export function ReviewsWidget() {
    const injected = useRef(false);

    useEffect(() => {
        if (injected.current) return;
        injected.current = true;

        const s1 = document.createElement('script');
        s1.src = 'https://cdn.trustindex.io/loader-cert.js?3e91a8b6153064199866847cb49';
        s1.defer = true;
        s1.async = true;
        document.body.appendChild(s1);

        const s2 = document.createElement('script');
        s2.src = 'https://cdn.trustindex.io/assets/js/richsnippet.js?8b4875394605g68e';
        s2.type = 'text/javascript';
        s2.defer = true;
        s2.async = true;
        document.body.appendChild(s2);
    }, []);

    return (
        <section className="max-w-6xl mx-auto px-5 py-16">
            <div className="mb-8 text-center">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#239ddb] mb-1">Testimonials</p>
                <h2 className="text-3xl font-bold text-gray-900">What Our Clients Say</h2>
            </div>
            <div id="trustindex-widget" />
        </section>
    );
}
