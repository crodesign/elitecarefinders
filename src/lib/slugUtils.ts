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

/**
 * Builds the canonical contact edit URL.
 * Pattern: /admin/contacts/[id]/[slug]/edit
 */
export function buildContactEditUrl(
    id: string,
    name?: string | null,
    params?: Record<string, string>
): string {
    const slug = name ? toSlug(name) : "contact";
    let url = `/admin/contacts/${id}/${slug}/edit`;
    if (params && Object.keys(params).length > 0) {
        const qs = new URLSearchParams(params).toString();
        url += `?${qs}`;
    }
    return url;
}
