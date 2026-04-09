import type { Metadata } from 'next';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faArrowLeft, faArrowRight, faHeart } from '@fortawesome/free-solid-svg-icons';
import { faFacebook } from '@fortawesome/free-brands-svg-icons';
import { getApprovedReviews } from '@/lib/public-db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Client Reviews | Elite CareFinders',
    description: 'Read what Hawaii families say about Elite CareFinders senior living placement services.',
};

const PER_PAGE = 12;

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
                <FontAwesomeIcon
                    key={i}
                    icon={faStar}
                    className={`h-3.5 w-3.5 ${i <= rating ? 'text-amber-400' : 'text-gray-200'}`}
                />
            ))}
        </div>
    );
}

function AuthorAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
    if (photoUrl) {
        return (
            <div className="relative h-11 w-11 rounded-full overflow-hidden flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
        );
    }
    const initials = name
        .split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    return (
        <div className="h-11 w-11 rounded-full bg-[#239ddb] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">{initials}</span>
        </div>
    );
}

const GoogleIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

function SourceIcon({ source }: { source: string | null }) {
    if (source === 'google') return <GoogleIcon className="h-4 w-4" />;
    if (source === 'facebook') return <FontAwesomeIcon icon={faFacebook} className="h-4 w-4 text-[#1877F2]" />;
    return <FontAwesomeIcon icon={faHeart} className="h-4 w-4 text-red-500" />;
}

function ReviewCard({ review }: { review: { id: string; authorName: string; authorPhotoUrl: string | null; rating: number; content: string; createdAt: string; source: string | null } }) {
    const date = new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return (
        <div className="bg-gray-100 rounded-2xl p-5 flex flex-col gap-3 relative">
            <div className="absolute top-4 right-4">
                <SourceIcon source={review.source} />
            </div>
            <div className="flex items-start gap-3">
                <AuthorAvatar name={review.authorName} photoUrl={review.authorPhotoUrl} />
                <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{review.authorName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{date}</p>
                    <div className="mt-1">
                        <StarRating rating={review.rating} />
                    </div>
                </div>
            </div>
            <div className="review-scroll overflow-y-auto max-h-44 pr-1">
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{review.content}</p>
            </div>
        </div>
    );
}

export default async function ReviewsPage({ searchParams }: { searchParams: { page?: string } }) {
    const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
    const { reviews, total } = await getApprovedReviews(page, PER_PAGE);
    const totalPages = Math.ceil(total / PER_PAGE);

    return (
        <main className="min-h-screen bg-white">
            <div className="max-w-6xl mx-auto px-5 py-12">
                {/* Header */}
                <div className="mb-10">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#239ddb] mb-1">Testimonials</p>
                    <h1 className="text-3xl font-bold text-gray-900">What Our Clients Say</h1>
                    {total > 0 && (
                        <p className="text-sm text-gray-500 mt-2">{total} review{total !== 1 ? 's' : ''}</p>
                    )}
                </div>

                {/* Grid */}
                {reviews.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <p>No reviews yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {reviews.map(r => (
                            <ReviewCard key={r.id} review={r} />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-12">
                        {page > 1 ? (
                            <Link
                                href={`/reviews?page=${page - 1}`}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-[#239ddb] hover:text-[#239ddb] transition-colors"
                            >
                                <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
                                Previous
                            </Link>
                        ) : (
                            <span className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-300 bg-white border border-gray-100 rounded-lg">
                                <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
                                Previous
                            </span>
                        )}
                        <span className="text-sm text-gray-500">
                            Page {page} of {totalPages}
                        </span>
                        {page < totalPages ? (
                            <Link
                                href={`/reviews?page=${page + 1}`}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-[#239ddb] hover:text-[#239ddb] transition-colors"
                            >
                                Next
                                <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                            </Link>
                        ) : (
                            <span className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-300 bg-white border border-gray-100 rounded-lg">
                                Next
                                <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                            </span>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
