"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Star, Check, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useNotification } from "@/contexts/NotificationContext";

const TRUSTINDEX_FB_WIDGET_ID = '973b5556931b160e9496d710799';

interface ScrapedReview {
    name: string;
    rating: number;
    text: string;
    date: string;
    photoUrl: string | null;
}

export default function ImportFacebookReviewsPage() {
    const router = useRouter();
    const { showNotification } = useNotification();
    const widgetContainerRef = useRef<HTMLDivElement>(null);
    const injected = useRef(false);

    const [widgetLoaded, setWidgetLoaded] = useState(false);
    const [widgetError, setWidgetError] = useState<string | null>(null);
    const [scrapedReviews, setScrapedReviews] = useState<ScrapedReview[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ imported: number } | null>(null);

    useEffect(() => {
        if (injected.current || !widgetContainerRef.current) return;
        injected.current = true;

        const script = document.createElement('script');
        script.src = `https://cdn.trustindex.io/loader.js?${TRUSTINDEX_FB_WIDGET_ID}`;
        script.defer = true;
        script.async = true;
        widgetContainerRef.current.appendChild(script);

        const observer = new MutationObserver((_mutations, obs) => {
            const items = widgetContainerRef.current?.querySelectorAll('.ti-review-item');
            if (items && items.length > 0) {
                setWidgetLoaded(true);
                obs.disconnect();
            }
        });

        observer.observe(widgetContainerRef.current, { childList: true, subtree: true });

        const timeout = setTimeout(() => {
            observer.disconnect();
            if (!widgetContainerRef.current?.querySelectorAll('.ti-review-item')?.length) {
                setWidgetError('Widget did not load within 15 seconds. Check the widget ID.');
            }
        }, 15000);

        return () => {
            observer.disconnect();
            clearTimeout(timeout);
        };
    }, []);

    const handleScrape = useCallback(() => {
        if (!widgetContainerRef.current) return;

        // Log the DOM structure for debugging selectors
        const firstItem = widgetContainerRef.current.querySelector('.ti-review-item');
        if (firstItem) {
            console.log('[scraper] First review item HTML:', firstItem.innerHTML);
        }

        const items = widgetContainerRef.current.querySelectorAll('.ti-review-item');
        const reviews: ScrapedReview[] = [];

        items.forEach(item => {
            try {
                const name = item.querySelector('.ti-name')?.textContent?.trim() || 'Unknown';

                // Facebook reviews use "recommends" not stars
                // Check for recommendation text or thumbs-up indicator
                const reviewText = item.textContent?.toLowerCase() || '';
                const hasRecommend = reviewText.includes('recommends') || reviewText.includes('recommended');
                const hasNotRecommend = reviewText.includes('doesn\'t recommend') || reviewText.includes('does not recommend');

                let rating: number;
                if (hasNotRecommend) {
                    rating = 1;
                } else if (hasRecommend) {
                    rating = 5;
                } else {
                    // Fallback to star count for non-Facebook reviews
                    const filled = item.querySelectorAll('.ti-stars .ti-star.f').length;
                    const half = item.querySelectorAll('.ti-stars .ti-star.h').length;
                    rating = Math.min(5, Math.max(1, filled + (half * 0.5)));
                }

                const text = item.querySelector('.ti-review-text-container')?.textContent?.trim() || '';

                // Try multiple date selectors and attributes
                const dateEl = item.querySelector('.ti-date') || item.querySelector('[data-time]');
                const timestamp = dateEl?.getAttribute('data-time');
                let dateStr: string;
                if (timestamp) {
                    const ts = parseInt(timestamp);
                    // Handle both seconds and milliseconds timestamps
                    dateStr = new Date(ts < 1e12 ? ts * 1000 : ts).toISOString();
                } else {
                    // Try parsing the visible date text
                    const dateText = dateEl?.textContent?.trim();
                    if (dateText) {
                        const parsed = new Date(dateText);
                        dateStr = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
                    } else {
                        dateStr = new Date().toISOString();
                    }
                }

                const imgEl = item.querySelector('.ti-profile-img img') as HTMLImageElement | null;
                const photoUrl = imgEl?.src?.includes('noprofile') ? null : (imgEl?.src || null);

                if (name || text) {
                    reviews.push({ name, rating: Math.round(rating), text, date: dateStr, photoUrl });
                }
            } catch (e) {
                console.error('Error scraping review item:', e);
            }
        });

        setScrapedReviews(reviews);
        setSelectedIndices(new Set(reviews.map((_, i) => i)));

        if (reviews.length === 0) {
            showNotification("Warning", "No reviews found. The widget DOM structure may have changed.");
        } else {
            showNotification("Success", `Found ${reviews.length} reviews`);
        }
    }, [showNotification]);

    const toggleSelect = (index: number) => {
        setSelectedIndices(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedIndices.size === scrapedReviews.length) {
            setSelectedIndices(new Set());
        } else {
            setSelectedIndices(new Set(scrapedReviews.map((_, i) => i)));
        }
    };

    const handleImport = async () => {
        const selected = scrapedReviews.filter((_, i) => selectedIndices.has(i));
        if (selected.length === 0) return;

        setIsImporting(true);
        try {
            const res = await fetch('/api/admin/reviews/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reviews: selected }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.details || data.error);

            setImportResult({ imported: data.imported });
            showNotification("Success", data.message);
        } catch (error: any) {
            showNotification("Error", error.message || "Failed to import reviews");
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <>
            <div className="flex-none p-4 md:p-8 pb-4 md:pb-6 space-y-4 md:space-y-6">
                <div>
                    <Link
                        href="/admin/reviews"
                        className="text-content-muted hover:text-content-primary text-sm flex items-center gap-1 mb-2"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back to Reviews
                    </Link>
                    <h1 className="text-xl md:text-2xl font-bold text-content-primary">Import Facebook Reviews</h1>
                    <p className="text-xs md:text-sm text-content-muted mt-1">
                        Scrape reviews from Trustindex widget and import into the database
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 space-y-6">
                {/* Widget Container */}
                <div className="bg-surface-secondary border border-border-primary rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-medium text-content-primary uppercase tracking-wider">
                            Trustindex Widget Preview
                        </h2>
                        <button
                            onClick={handleScrape}
                            disabled={!widgetLoaded}
                            className="btn-primary flex items-center gap-2"
                        >
                            {!widgetLoaded && !widgetError && <Loader2 className="h-4 w-4 animate-spin" />}
                            {widgetLoaded ? 'Scrape Reviews' : 'Waiting for widget...'}
                        </button>
                    </div>

                    {widgetError && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                            <p className="text-red-400 text-sm">{widgetError}</p>
                        </div>
                    )}

                    <div
                        ref={widgetContainerRef}
                        className="bg-white rounded-lg p-4 max-h-[400px] overflow-y-auto"
                    />
                </div>

                {/* Preview Table */}
                {scrapedReviews.length > 0 && (
                    <div className="bg-surface-secondary border border-border-primary rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-medium text-content-primary uppercase tracking-wider">
                                Scraped Reviews ({scrapedReviews.length})
                            </h2>
                            <div className="flex items-center gap-3">
                                <button onClick={toggleAll} className="btn-ghost text-xs">
                                    {selectedIndices.size === scrapedReviews.length ? 'Deselect All' : 'Select All'}
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={isImporting || selectedIndices.size === 0}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    Import {selectedIndices.size} Review{selectedIndices.size !== 1 ? 's' : ''}
                                </button>
                            </div>
                        </div>

                        {importResult && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-4">
                                <p className="text-emerald-400 text-sm">
                                    Successfully imported {importResult.imported} reviews.{' '}
                                    <Link href="/admin/reviews" className="underline hover:text-emerald-300">
                                        View Reviews
                                    </Link>
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            {scrapedReviews.map((review, index) => (
                                <div
                                    key={index}
                                    onClick={() => toggleSelect(index)}
                                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                        selectedIndices.has(index)
                                            ? 'bg-accent/10 border border-accent/30'
                                            : 'bg-surface-input border border-transparent hover:border-border-primary'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIndices.has(index)}
                                        onChange={() => toggleSelect(index)}
                                        className="mt-1 shrink-0"
                                    />
                                    {review.photoUrl ? (
                                        <img
                                            src={review.photoUrl}
                                            alt={review.name}
                                            className="w-10 h-10 rounded-full object-cover shrink-0"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-surface-secondary flex items-center justify-center shrink-0">
                                            <span className="text-xs font-bold text-content-muted">
                                                {review.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-content-primary">{review.name}</span>
                                            <div className="flex items-center gap-0.5">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`h-3 w-3 ${
                                                            i < review.rating
                                                                ? 'text-yellow-400 fill-current'
                                                                : 'text-content-muted'
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-xs text-content-muted">
                                                {new Date(review.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-content-secondary line-clamp-2 mt-0.5">{review.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
