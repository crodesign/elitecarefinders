/**
 * Generates a URL-friendly slug from a name string.
 * e.g. "George Asato" -> "george-asato"
 */
export function toSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

export function buildContactEditUrl(
    id: string,
    name?: string | null,
    params?: Record<string, string>
): string {
    const slug = name ? toSlug(name) : "contact";
    let url = `/admin/contacts`;

    const searchParams = new URLSearchParams(params || {});
    searchParams.set('edit', id);
    // Note: We include the slug in the query for aesthetic/analytics reasons,
    // although the system only needs the ID to fetch the record.
    searchParams.set('slug', slug);

    return `${url}?${searchParams.toString()}`;
}
