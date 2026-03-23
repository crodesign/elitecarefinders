export async function geocodeAddress(query: string): Promise<[number, number] | null> {
    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'EliteCareFinders/1.0 (info@elitecarefinders.com)' },
            next: { revalidate: 86400 },
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.length) return null;
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    } catch {
        return null;
    }
}
