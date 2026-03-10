"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Search, ChevronLeft, ChevronRight, Check, Loader2, ExternalLink } from "lucide-react";

interface StockPhoto {
    id: string;
    thumbUrl: string;
    downloadUrl: string;
    downloadLocation: string;
    description: string;
    photographer: string;
    photographerUrl: string;
}

interface StockImagePickerProps {
    isOpen: boolean;
    onClose: () => void;
    folderId: string;
    namePrefix?: string;
    onImportComplete: () => void;
}

type ImportState = "idle" | "importing" | "done" | "error";

export function StockImagePicker({ isOpen, onClose, folderId, namePrefix, onImportComplete }: StockImagePickerProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<StockPhoto[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [importStates, setImportStates] = useState<Record<string, ImportState>>({});
    const [unconfigured, setUnconfigured] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const hasSearched = useRef(false);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setQuery("");
            setResults([]);
            setPage(1);
            setTotalPages(0);
            setSearchError(null);
            setImportStates({});
            setUnconfigured(false);
            hasSearched.current = false;
        }
    }, [isOpen]);

    const search = async (q: string, p: number) => {
        if (!q.trim()) return;
        setIsSearching(true);
        setSearchError(null);
        try {
            const res = await fetch(`/api/stock-images/search?q=${encodeURIComponent(q)}&page=${p}`);
            if (res.status === 503) {
                setUnconfigured(true);
                return;
            }
            const data = await res.json();
            if (!res.ok) {
                setSearchError(data.error || "Search failed");
                return;
            }
            setResults(data.results);
            setTotalPages(data.totalPages);
            hasSearched.current = true;
        } catch {
            setSearchError("Search failed. Check your connection.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        search(query, 1);
    };

    const handlePage = (newPage: number) => {
        setPage(newPage);
        search(query, newPage);
    };

    const handleImport = async (photo: StockPhoto) => {
        setImportStates(prev => ({ ...prev, [photo.id]: "importing" }));
        try {
            const res = await fetch("/api/stock-images/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageUrl: photo.downloadUrl,
                    folderId,
                    namePrefix,
                    downloadLocation: photo.downloadLocation,
                }),
            });
            if (!res.ok) {
                setImportStates(prev => ({ ...prev, [photo.id]: "error" }));
                return;
            }
            setImportStates(prev => ({ ...prev, [photo.id]: "done" }));
            onImportComplete();
        } catch {
            setImportStates(prev => ({ ...prev, [photo.id]: "error" }));
        }
    };

    if (!isOpen || typeof document === "undefined") return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] bg-ui-bg/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div
                className="bg-surface-primary w-full max-w-3xl rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-ui-border shrink-0">
                    <div>
                        <h3 className="text-base font-semibold text-content-primary">Free Stock Images</h3>
                        <p className="text-xs text-content-muted mt-0.5">Powered by Unsplash</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-hover transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Search bar */}
                <div className="px-5 py-3 border-b border-ui-border shrink-0">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search photos (e.g. senior care, nature, community...)"
                            className="form-input flex-1 text-sm h-9 px-3 rounded-lg"
                        />
                        <button
                            type="submit"
                            disabled={isSearching || !query.trim()}
                            className="flex items-center gap-2 px-4 h-9 bg-accent hover:bg-accent-light text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            Search
                        </button>
                    </form>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    {unconfigured ? (
                        <div className="text-center py-12 space-y-3">
                            <p className="text-content-primary font-medium">Unsplash API key not configured</p>
                            <p className="text-sm text-content-muted max-w-sm mx-auto">
                                Add <code className="bg-surface-hover px-1.5 py-0.5 rounded text-xs font-mono">UNSPLASH_ACCESS_KEY</code> to your <code className="bg-surface-hover px-1.5 py-0.5 rounded text-xs font-mono">.env.local</code> file.
                                Get a free key at{" "}
                                <a href="https://unsplash.com/developers" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                                    unsplash.com/developers
                                </a>.
                            </p>
                        </div>
                    ) : searchError ? (
                        <div className="text-center py-12">
                            <p className="text-red-400 text-sm">{searchError}</p>
                        </div>
                    ) : isSearching ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-accent" />
                        </div>
                    ) : results.length === 0 && hasSearched.current ? (
                        <div className="text-center py-12">
                            <p className="text-content-muted text-sm">No results for &quot;{query}&quot;</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-content-muted text-sm">Search for photos to add to your post library.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {results.map(photo => {
                                const state = importStates[photo.id] || "idle";
                                return (
                                    <div key={photo.id} className="relative group rounded-lg overflow-hidden bg-surface-hover aspect-[4/3]">
                                        <img
                                            src={photo.thumbUrl}
                                            alt={photo.description || "Stock photo"}
                                            className="w-full h-full object-cover"
                                        />
                                        {/* Overlay */}
                                        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity ${state === "idle" ? "opacity-0 group-hover:opacity-100" : "opacity-100"} bg-black/50`}>
                                            {state === "idle" && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleImport(photo)}
                                                    className="px-3 py-1.5 bg-accent hover:bg-accent-light text-white text-xs font-medium rounded-lg transition-colors shadow-lg"
                                                >
                                                    Add to Library
                                                </button>
                                            )}
                                            {state === "importing" && (
                                                <Loader2 className="h-6 w-6 animate-spin text-white" />
                                            )}
                                            {state === "done" && (
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="bg-emerald-500 rounded-full p-1.5">
                                                        <Check className="h-4 w-4 text-white" />
                                                    </div>
                                                    <span className="text-white text-xs font-medium">Added</span>
                                                </div>
                                            )}
                                            {state === "error" && (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-red-400 text-xs font-medium">Failed</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleImport(photo)}
                                                        className="text-white text-xs underline"
                                                    >
                                                        Retry
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {/* Photographer credit */}
                                        <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a
                                                href={`${photo.photographerUrl}?utm_source=elitecarefinders&utm_medium=referral`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-white/80 text-[10px] flex items-center gap-1 hover:text-white truncate"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                                                {photo.photographer}
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-ui-border shrink-0">
                        <button
                            type="button"
                            onClick={() => handlePage(page - 1)}
                            disabled={page <= 1 || isSearching}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-content-secondary hover:text-content-primary hover:bg-surface-hover rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </button>
                        <span className="text-sm text-content-muted">Page {page} of {totalPages}</span>
                        <button
                            type="button"
                            onClick={() => handlePage(page + 1)}
                            disabled={page >= totalPages || isSearching}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-content-secondary hover:text-content-primary hover:bg-surface-hover rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Footer attribution */}
                <div className="px-5 py-2 border-t border-ui-border shrink-0 flex justify-end">
                    <a
                        href="https://unsplash.com/?utm_source=elitecarefinders&utm_medium=referral"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-content-muted hover:text-content-secondary transition-colors"
                    >
                        Photos from Unsplash
                    </a>
                </div>
            </div>
        </div>,
        document.body
    );
}
