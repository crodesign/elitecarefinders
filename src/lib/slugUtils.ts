/**
 * Generates a URL-safe slug from a name string.
 * Example: "John Doe" -> "john-doe"
 */
export function generateSlug(name: string | null | undefined): string {
    if (!name || name.trim() === '') return 'contact';
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-')          // Replace spaces with hyphens
        .replace(/-+/g, '-')           // Collapse multiple hyphens
        .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens
}

/**
 * Builds a contact edit URL with a resident name slug.
 * Example: buildContactEditUrl("abc-123", "John Doe") -> "/admin/contacts/abc-123/john-doe/edit"
 */
export function buildContactEditUrl(
    contactId: string,
    residentName?: string | null,
    queryParams?: Record<string, string>
): string {
    const slug = generateSlug(residentName);
    const base = `/admin/contacts/${contactId}/${slug}/edit`;
    if (queryParams && Object.keys(queryParams).length > 0) {
        const qs = new URLSearchParams(queryParams).toString();
        return `${base}?${qs}`;
    }
    return base;
}
