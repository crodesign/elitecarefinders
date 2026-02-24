
/**
 * FLAT STORAGE: All media files live in public/images/media/ (single flat directory).
 * Virtual folder organization is handled entirely by the media_folders DB table.
 */

/**
 * Returns the public URL for a media file in flat storage.
 */
export function getMediaUrl(filename: string): string {
    return `/images/media/${filename}`;
}

/**
 * Removes deleted image URLs from entity records across homes, facilities, and posts.
 * Called when images or folders are deleted to prevent stale/broken references.
 */
export async function cleanEntityImageRefs(
    supabase: any,
    deletedUrls: string[]
): Promise<number> {
    if (deletedUrls.length === 0) return 0;

    let cleaned = 0;
    const entityTables = [
        { table: 'homes', fields: ['images', 'team_images'] },
        { table: 'facilities', fields: ['images', 'team_images'] },
        { table: 'posts', fields: ['images'] },
    ];

    for (const { table, fields } of entityTables) {
        for (const field of fields) {
            const { data: rows } = await supabase
                .from(table)
                .select(`id, ${field}`);

            for (const row of (rows || []) as Record<string, any>[]) {
                const arr = row[field];
                if (!Array.isArray(arr) || arr.length === 0) continue;
                const filtered = arr.filter((url: string) => !deletedUrls.includes(url));
                if (filtered.length !== arr.length) {
                    await supabase.from(table).update({ [field]: filtered }).eq('id', row.id);
                    cleaned++;
                }
            }
        }
    }

    return cleaned;
}
