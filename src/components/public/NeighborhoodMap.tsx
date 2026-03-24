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

interface Props {
    pins: NeighborhoodPin[];
    islandSlug: string;
    center: [number, number];
}

export function NeighborhoodMap({ pins, islandSlug, center }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const router = useRouter();

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        import('leaflet').then(L => {
            if (!containerRef.current) return;
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
                    html: `<div style="
                        width:${size}px;height:${size}px;border-radius:50%;
                        background:#239ddb;border:3px solid #fff;
                        box-shadow:0 2px 6px rgba(0,0,0,0.3);
                        display:flex;align-items:center;justify-content:center;
                        cursor:pointer;color:#fff;font-weight:700;
                        font-family:sans-serif;font-size:${size <= 30 ? 11 : 12}px;line-height:1;
                    ">${total}</div>`,
                });

                const tooltipHtml = `
                    <div style="font-family:sans-serif;min-width:120px;">
                        <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${pin.name}</div>
                        ${pin.homes > 0 ? `<div style="font-size:12px;color:#555;">${pin.homes} Care Home${pin.homes !== 1 ? 's' : ''}</div>` : ''}
                        ${pin.facilities > 0 ? `<div style="font-size:12px;color:#555;">${pin.facilities} Communit${pin.facilities !== 1 ? 'ies' : 'y'}</div>` : ''}
                        <div style="font-size:11px;color:#239ddb;margin-top:4px;">Click to browse →</div>
                    </div>`;

                const marker = L.marker([pin.lat, pin.lng], { icon });
                marker.bindTooltip(tooltipHtml, { direction: 'top', offset: [0, -size / 2 + 4] });
                marker.on('click', () => router.push(`/location/hawaii/${islandSlug}/${pin.slug}`));
                marker.addTo(map);
            });

            mapRef.current = map;
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="relative w-full h-full min-h-[320px] overflow-hidden isolate">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
            <div ref={containerRef} className="w-full h-full" />
            <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 rounded-lg px-3 py-1.5 text-xs text-gray-500 shadow-sm pointer-events-none">
                Click a pin to browse that neighborhood
            </div>
        </div>
    );
}

export default NeighborhoodMap;
