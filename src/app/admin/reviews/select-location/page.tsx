"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HeartLoader } from "@/components/ui/HeartLoader";

interface Location {
    accountId: string;
    accountName: string;
    locationId: string;
    locationTitle: string;
}

export default function SelectLocationPage() {
    const router = useRouter();
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selecting, setSelecting] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/admin/google/locations")
            .then(async (res) => {
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to fetch locations");
                }
                return res.json();
            })
            .then((data) => {
                setLocations(data.locations || []);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    async function handleSelect(loc: Location) {
        setSelecting(loc.locationId);
        try {
            const res = await fetch("/api/admin/google/locations/select", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accountId: loc.accountId, locationId: loc.locationId }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save location");
            }
            router.push("/admin/reviews?success=Location+selected");
        } catch (err: any) {
            setError(err.message);
            setSelecting(null);
        }
    }

    const grouped = locations.reduce<Record<string, Location[]>>((acc, loc) => {
        (acc[loc.accountName] ||= []).push(loc);
        return acc;
    }, {});

    return (
        <div className="max-w-2xl mx-auto py-12 px-4">
            <div className="flex items-center gap-3 mb-8">
                <svg viewBox="0 0 48 48" className="w-8 h-8 shrink-0">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <h1 className="text-xl md:text-2xl font-bold text-content-primary">
                    Select Business Location
                </h1>
            </div>

            {loading && (
                <div className="flex flex-col items-center gap-4 py-16">
                    <HeartLoader size={10} />
                    <p className="text-content-secondary">Loading Google Business locations...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {!loading && !error && locations.length === 0 && (
                <div className="bg-surface-secondary border border-border-primary rounded-lg p-6 text-center">
                    <p className="text-content-secondary">No business locations found for this Google account.</p>
                    <button
                        onClick={() => router.push("/admin/reviews")}
                        className="btn-secondary mt-4"
                    >
                        Back to Reviews
                    </button>
                </div>
            )}

            {!loading && Object.keys(grouped).length > 0 && (
                <div className="space-y-6">
                    <p className="text-content-secondary">
                        Choose which location to sync Google reviews from:
                    </p>
                    {Object.entries(grouped).map(([accountName, locs]) => (
                        <div key={accountName}>
                            {Object.keys(grouped).length > 1 && (
                                <h2 className="text-sm font-medium text-content-muted uppercase tracking-wider mb-2">
                                    {accountName}
                                </h2>
                            )}
                            <div className="space-y-2">
                                {locs.map((loc) => (
                                    <button
                                        key={loc.locationId}
                                        onClick={() => handleSelect(loc)}
                                        disabled={selecting !== null}
                                        className="w-full text-left bg-surface-secondary border border-border-primary rounded-lg p-4 hover:border-accent transition-colors disabled:opacity-50"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-content-primary font-medium">
                                                {loc.locationTitle}
                                            </span>
                                            {selecting === loc.locationId ? (
                                                <HeartLoader size={5} />
                                            ) : (
                                                <span className="text-content-muted text-sm">Select</span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
