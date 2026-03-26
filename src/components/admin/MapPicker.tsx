'use client';

import { useEffect, useRef } from 'react';

interface Props {
    lat: number;
    lng: number;
    onChange: (lat: number, lng: number) => void;
}

export function MapPicker({ lat, lng, onChange }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const onChangeRef = useRef(onChange);

    useEffect(() => {
        onChangeRef.current = onChange;
    });

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
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
            });

            const map = L.map(containerRef.current, {
                center: [lat, lng],
                zoom: 15,
                scrollWheelZoom: true,
                zoomControl: true,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19,
            }).addTo(map);

            const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
            markerRef.current = marker;

            marker.on('drag', (e: any) => {
                if (e.originalEvent) {
                    const latlng = map.mouseEventToLatLng(e.originalEvent);
                    marker.setLatLng(latlng);
                }
            });

            marker.on('dragend', () => {
                const pos = marker.getLatLng();
                onChangeRef.current(pos.lat, pos.lng);
            });

            map.on('click', (e: any) => {
                marker.setLatLng(e.latlng);
                onChangeRef.current(e.latlng.lat, e.latlng.lng);
            });

            mapRef.current = map;
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markerRef.current = null;
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="w-full isolate">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
            <div ref={containerRef} className="w-full h-52 rounded-lg overflow-hidden" />
        </div>
    );
}

export default MapPicker;
