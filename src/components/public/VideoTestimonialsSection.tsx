import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';
import type { PublicReview } from '@/lib/public-db';

function getYouTubeEmbedUrl(url: string): string | null {
    try {
        const u = new URL(url);
        let videoId: string | null = null;
        if (u.hostname.includes('youtube.com')) {
            videoId = u.searchParams.get('v');
        } else if (u.hostname === 'youtu.be') {
            videoId = u.pathname.slice(1).split('?')[0];
        }
        if (!videoId) return null;
        return `https://www.youtube.com/embed/${videoId}`;
    } catch {
        return null;
    }
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return 'Today';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
}

export function VideoTestimonialsSection({ testimonials }: { testimonials: PublicReview[] }) {
    const valid = testimonials.filter(t => t.sourceLink && getYouTubeEmbedUrl(t.sourceLink));
    if (valid.length === 0) return null;

    return (
        <section className="max-w-6xl mx-auto px-5 py-16">
            <div className="mb-10">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#239ddb] mb-1">Video Testimonials</p>
                <h2 className="text-3xl font-bold text-gray-900">Hear From Our Clients</h2>
            </div>

            <div className="flex flex-col gap-8">
                {valid.map(t => {
                    const embedUrl = getYouTubeEmbedUrl(t.sourceLink!)!;
                    return (
                        <div
                            key={t.id}
                            className="grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden border border-gray-100 shadow-md"
                        >
                            {/* Left: YouTube embed */}
                            <div className="relative aspect-video">
                                <iframe
                                    src={embedUrl}
                                    className="absolute inset-0 w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title={`Video testimonial by ${t.authorName}`}
                                />
                            </div>

                            {/* Right: Review content */}
                            <div className="review-scroll overflow-y-auto bg-white p-6 flex flex-col gap-4">
                                {/* Author */}
                                <div className="flex items-center gap-3">
                                    {t.authorPhotoUrl ? (
                                        <Image
                                            src={t.authorPhotoUrl}
                                            alt={t.authorName}
                                            width={44}
                                            height={44}
                                            className="rounded-full object-cover flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400 font-bold text-sm">
                                            {t.authorName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-semibold text-gray-900 leading-tight">{t.authorName}</div>
                                        <div className="text-xs text-gray-400">{timeAgo(t.createdAt)}</div>
                                    </div>
                                </div>

                                {/* Stars */}
                                <div className="flex items-center gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <FontAwesomeIcon
                                            key={i}
                                            icon={faStar}
                                            className={`h-3.5 w-3.5 ${i < t.rating ? 'text-yellow-400' : 'text-gray-200'}`}
                                        />
                                    ))}
                                </div>

                                {/* Content */}
                                <p className="text-sm text-gray-600 leading-relaxed">{t.content}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
