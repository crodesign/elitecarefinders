"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar, faChevronLeft, faChevronRight, faHeart } from "@fortawesome/free-solid-svg-icons";
import { faFacebook } from "@fortawesome/free-brands-svg-icons";
import { AuthorAvatarWithImage } from "./AuthorAvatarWithImage";
import { WriteReviewDropdown } from "./WriteReviewDropdown";

const GoogleIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

interface Review {
    id: string;
    authorName: string;
    authorPhotoUrl: string | null;
    rating: number;
    content: string;
    createdAt: string;
    source: string | null;
}

function SourceIcon({ source }: { source: string | null }) {
    if (source === 'google') return <GoogleIcon className="h-3.5 w-3.5" />;
    if (source === 'facebook') return <FontAwesomeIcon icon={faFacebook} className="h-3.5 w-3.5 text-[#1877F2]" />;
    return <FontAwesomeIcon icon={faHeart} className="h-3.5 w-3.5 text-red-500" />;
}

function AuthorAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
    const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    if (!photoUrl) {
        return (
            <div className="h-10 w-10 rounded-full bg-[#239ddb] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{initials}</span>
            </div>
        );
    }
    return <AuthorAvatarWithImage name={name} photoUrl={photoUrl} initials={initials} />;
}

function ReviewCard({ review }: { review: Review }) {
    const date = new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return (
        <div className="bg-white rounded-xl p-5 flex flex-col gap-3 min-w-[300px] max-w-[340px] flex-shrink-0 snap-start relative h-full">
            <div className="absolute top-4 right-4">
                <SourceIcon source={review.source} />
            </div>
            <div className="flex items-center gap-3">
                <AuthorAvatar name={review.authorName} photoUrl={review.authorPhotoUrl} />
                <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{review.authorName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{date}</p>
                </div>
            </div>
            <div className="flex items-center gap-1">
                {review.source === 'facebook' ? (
                    <span className="text-xs font-medium text-[#1877F2]">Recommends</span>
                ) : (
                    [1, 2, 3, 4, 5].map(i => (
                        <FontAwesomeIcon
                            key={i}
                            icon={faStar}
                            className={`h-3 w-3 ${i <= review.rating ? 'text-amber-400' : 'text-gray-200'}`}
                        />
                    ))
                )}
            </div>
            <div className="text-sm text-gray-600 leading-relaxed flex-1 overflow-y-auto max-h-[calc(7.5em+10px)] pr-1 review-scroll">
                <p className="whitespace-pre-line">{review.content}</p>
            </div>
        </div>
    );
}

export function TestimonialsCarousel({
    reviews,
    totalReviews,
    avgRating,
    googleUrl,
}: {
    reviews: Review[];
    totalReviews: number;
    avgRating: number;
    googleUrl: string | null;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const trustindexRef = useRef<HTMLDivElement>(null);
    const tiInjected = useRef(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const ratingLabel = avgRating >= 4.5 ? 'Excellent' : avgRating >= 3.5 ? 'Great' : 'Good';

    const updateScrollState = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 10);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    }, []);

    const scroll = useCallback((dir: 'left' | 'right') => {
        const el = scrollRef.current;
        if (!el) return;
        const cardWidth = 340 + 20;
        el.scrollBy({ left: dir === 'left' ? -cardWidth : cardWidth, behavior: 'smooth' });
    }, []);

    const startAutoScroll = useCallback(() => {
        if (autoScrollRef.current) clearInterval(autoScrollRef.current);
        autoScrollRef.current = setInterval(() => {
            const el = scrollRef.current;
            if (!el) return;
            if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 10) {
                el.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                scroll('right');
            }
        }, 5000);
    }, [scroll]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener('scroll', updateScrollState);
        updateScrollState();
        startAutoScroll();
        return () => {
            el.removeEventListener('scroll', updateScrollState);
            if (autoScrollRef.current) clearInterval(autoScrollRef.current);
        };
    }, [updateScrollState, startAutoScroll]);

    useEffect(() => {
        if (tiInjected.current || !trustindexRef.current) return;
        tiInjected.current = true;
        const s = document.createElement('script');
        s.src = 'https://cdn.trustindex.io/loader.js?cb4eda061a4577951396bec726d';
        s.defer = true;
        s.async = true;
        trustindexRef.current.appendChild(s);
    }, []);

    const pauseAutoScroll = () => {
        if (autoScrollRef.current) { clearInterval(autoScrollRef.current); autoScrollRef.current = null; }
    };

    const resumeAutoScroll = () => { startAutoScroll(); };

    return (
        <div>
            <div className="bg-gray-100 rounded-2xl p-5">
            {/* Rating Summary */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-6">
                <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-900">{ratingLabel}</span>
                    <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                            <FontAwesomeIcon
                                key={i}
                                icon={faStar}
                                className={`h-5 w-5 ${i <= Math.round(avgRating) ? 'text-amber-400' : 'text-gray-200'}`}
                            />
                        ))}
                    </div>
                </div>
                <div className="h-6 w-px bg-gray-300 hidden sm:block" />
                <span className="text-sm text-gray-500">
                    Based on <strong className="text-gray-900">{totalReviews}</strong> review{totalReviews !== 1 ? 's' : ''}
                </span>
                <WriteReviewDropdown googleUrl={googleUrl} />
            </div>

            {/* Carousel */}
            <div
                className="relative group"
                onMouseEnter={pauseAutoScroll}
                onMouseLeave={resumeAutoScroll}
            >
                {canScrollLeft && (
                    <button
                        onClick={() => scroll('left')}
                        className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white shadow-lg border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:text-[#239ddb] hover:border-[#239ddb] transition-colors opacity-100"
                    >
                        <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
                    </button>
                )}
                <div
                    ref={scrollRef}
                    className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {reviews.map(r => (
                        <ReviewCard key={r.id} review={r} />
                    ))}
                </div>
                {canScrollRight && (
                    <button
                        onClick={() => scroll('right')}
                        className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white shadow-lg border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:text-[#239ddb] hover:border-[#239ddb] transition-colors opacity-100"
                    >
                        <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4" />
                    </button>
                )}
            </div>
            </div>

            {/* Trustindex rich snippet */}
            <div ref={trustindexRef} />
        </div>
    );
}
