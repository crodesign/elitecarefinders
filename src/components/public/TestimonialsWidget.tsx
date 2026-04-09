import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { TestimonialsCarousel } from './TestimonialsCarousel';
import type { PublicReview } from '@/lib/public-db';

export function TestimonialsWidget({
    reviews,
    totalReviews,
    avgRating,
    googleUrl,
}: {
    reviews: PublicReview[];
    totalReviews: number;
    avgRating: number;
    googleUrl: string | null;
}) {
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
            <TestimonialsCarousel
                reviews={reviews}
                totalReviews={totalReviews}
                avgRating={avgRating}
                googleUrl={googleUrl}
            />
        </section>
    );
}
