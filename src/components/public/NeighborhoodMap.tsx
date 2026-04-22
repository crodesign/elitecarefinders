'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export interface NeighborhoodPin {
    id: string;
    name: string;
    slug: string;
    homes: number;
    facilities: number;
    lat: number;
    lng: number;
}

// Tight bounds hugging each island's coastline — minimizes visible ocean.
const ISLAND_BOUNDS: Record<string, [[number, number], [number, number]]> = {
    oahu:         [[21.258, -158.282], [21.714, -157.648]],
    maui:         [[20.574, -156.697], [21.018, -155.979]],
    'big-island': [[18.912, -156.064], [20.268, -154.806]],
    kauai:        [[21.872, -159.788], [22.236, -159.286]],
};

function pinHtml(size: number, highlighted: boolean): string {
    const bg = highlighted ? '#22c55e' : '#239ddb';
    const scale = highlighted ? 'transform:scale(1.2);' : '';
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;transition:background 0.15s,transform 0.15s;${scale}"></div>`;
}

interface Props {
    pins: NeighborhoodPin[];
    islandSlug: string;
    center: [number, number];
    onPinClick?: (pin: NeighborhoodPin) => void;
    highlightedSlug?: string | null;
}

export function NeighborhoodMap({ pins, islandSlug, center, onPinClick, highlightedSlug }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<Record<string, { marker: any; size: number }>>({});
    const LRef = useRef<any>(null);
    const router = useRouter();

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        import('leaflet').then(L => {
            if (!containerRef.current) return;
            LRef.current = L;
            delete (containerRef.current as any)._leaflet_id;
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });

            const map = L.map(containerRef.current, {
                center,
                zoom: 10,
                scrollWheelZoom: false,
                dragging: !L.Browser.mobile,
                zoomControl: true,
            });

            const bounds = ISLAND_BOUNDS[islandSlug];
            if (bounds) map.fitBounds(bounds, { padding: [0, 0] });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 18,
            }).addTo(map);

            pins.forEach(pin => {
                const total = pin.homes + pin.facilities;
                if (total === 0) return;

                const size = total >= 20 ? 44 : total >= 10 ? 38 : total >= 5 ? 34 : 30;
                const icon = L.divIcon({
                    className: '',
                    iconSize: [size, size],
                    iconAnchor: [size / 2, size / 2],
                    html: pinHtml(size, false),
                });

                const tooltipHtml = `<div style="font-family:sans-serif;font-weight:700;font-size:13px;white-space:nowrap;">${pin.name}</div>`;

                const marker = L.marker([pin.lat, pin.lng], { icon });
                marker.bindTooltip(tooltipHtml, { direction: 'top', offset: [0, -size / 2 + 4] });
                marker.on('click', () => {
                    if (onPinClick) {
                        onPinClick(pin);
                    } else {
                        router.push(`/location/hawaii/${islandSlug}/${pin.slug}`);
                    }
                });
                marker.addTo(map);
                markersRef.current[pin.slug] = { marker, size };
            });

            mapRef.current = map;
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
            markersRef.current = {};
            LRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Update pin colours when highlighted slug changes
    useEffect(() => {
        const L = LRef.current;
        if (!L) return;
        Object.entries(markersRef.current).forEach(([slug, { marker, size }]) => {
            const isHighlighted = slug === highlightedSlug;
            marker.setIcon(L.divIcon({
                className: '',
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2],
                html: pinHtml(size, isHighlighted),
            }));
            if (isHighlighted) marker.openTooltip();
            else marker.closeTooltip();
        });
    }, [highlightedSlug]);

    return (
        <div className="relative w-full h-full min-h-[320px] overflow-hidden isolate">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
            <div ref={containerRef} className="w-full h-full" />
            <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 rounded-lg px-3 py-1.5 text-xs text-gray-500 shadow-sm pointer-events-none">
                Click a pin to browse that neighborhood
                <span className="sm:hidden block mt-0.5">Use two fingers to scroll and zoom</span>
            </div>
        </div>
    );
}

export default NeighborhoodMap;
