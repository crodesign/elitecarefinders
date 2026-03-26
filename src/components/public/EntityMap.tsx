'use client';

import { useEffect, useRef } from 'react';

interface Props {
    lat: number;
    lng: number;
    zoom?: number;
    circleMode?: boolean;
    neighborhoodSlug?: string;
}

const CIRCLE_STYLE = {
    color: '#239ddb',
    weight: 2,
    opacity: 0.7,
    fillColor: '#239ddb',
    fillOpacity: 0.12,
};

function slugToQuery(slug: string): string {
    return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ', Hawaii';
}

export function EntityMap({ lat, lng, zoom = 15, circleMode = false, neighborhoodSlug }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        import('leaflet').then(async L => {
            if (!containerRef.current) return;
            delete (containerRef.current as any)._leaflet_id;
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
            });

            const map = L.map(containerRef.current, {
                center: [lat, lng],
                zoom,
                scrollWheelZoom: false,
                zoomControl: true,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 18,
            }).addTo(map);

            if (circleMode) {
                let drawnBoundary = false;
                if (neighborhoodSlug) {
                    try {
                        const query = slugToQuery(neighborhoodSlug);
                        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=geojson&polygon_geojson=1&limit=1`;
                        const res = await fetch(url, {
                            headers: { 'User-Agent': 'EliteCareFinders/1.0 (info@elitecarefinders.com)' },
                        });
                        if (res.ok) {
                            const geojson = await res.json();
                            if (geojson.features?.length > 0) {
                                const feature = geojson.features[0];
                                const geomType = feature.geometry?.type;
                                if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
                                    L.geoJSON(feature, { style: () => CIRCLE_STYLE }).addTo(map);
                                    drawnBoundary = true;
                                }
                            }
                        }
                    } catch {
                        // fall through to circle
                    }
                }
                if (!drawnBoundary) {
                    L.circle([lat, lng], { radius: 3200, ...CIRCLE_STYLE }).addTo(map);
                }
            } else {
                L.marker([lat, lng]).addTo(map);
            }

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
        <div className="w-full h-full isolate">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
            <div ref={containerRef} className="w-full h-full" />
        </div>
    );
}

export default EntityMap;
