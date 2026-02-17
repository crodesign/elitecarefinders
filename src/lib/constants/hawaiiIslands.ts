export const HAWAII_ISLAND_MAPPING: Record<string, string> = {
    // Oahu
    "Honolulu": "Oahu",
    "Kailua": "Oahu",
    "Kaneohe": "Oahu",
    "Kapolei": "Oahu",
    "Mililani": "Oahu",
    "Pearl City": "Oahu",
    "Wahiawa": "Oahu",
    "Waipahu": "Oahu",
    "Ewa Beach": "Oahu",
    "Aiea": "Oahu",
    "Waimanalo": "Oahu",
    "Haleiwa": "Oahu",
    "Laie": "Oahu",
    "Kahuku": "Oahu",
    "Hauula": "Oahu",
    "Waialua": "Oahu",

    // Maui
    "Kahului": "Maui",
    "Kihei": "Maui",
    "Lahaina": "Maui",
    "Wailuku": "Maui",
    "Makawao": "Maui",
    "Pukalani": "Maui",
    "Hana": "Maui",
    "Kula": "Maui",
    "Haiku": "Maui",
    "Paia": "Maui",

    // Big Island (Hawaii)
    "Hilo": "Hawaii",
    "Kailua-Kona": "Hawaii",
    "Waimea": "Hawaii",
    "Keaau": "Hawaii",
    "Pahoa": "Hawaii",
    "Captain Cook": "Hawaii",
    "Waikoloa": "Hawaii",
    "Holualoa": "Hawaii",
    "Honokaa": "Hawaii",
    "Mountain View": "Hawaii",

    // Kauai
    "Lihue": "Kauai",
    "Kapaa": "Kauai",
    "Koloa": "Kauai",
    "Kalaheo": "Kauai",
    "Hanalei": "Kauai",
    "Princeville": "Kauai",
    "Waimea (Kauai)": "Kauai",
    "Hanapepe": "Kauai",

    // Molokai
    "Kaunakakai": "Molokai",
    "Maunaloa": "Molokai",
    "Kualapuu": "Molokai",

    // Lanai
    "Lanai City": "Lanai"
};

export function getHawaiiIsland(city: string): string | null {
    if (!city) return null;
    return HAWAII_ISLAND_MAPPING[city] || HAWAII_ISLAND_MAPPING[Object.keys(HAWAII_ISLAND_MAPPING).find(key => city.includes(key)) || ""] || null;
}
