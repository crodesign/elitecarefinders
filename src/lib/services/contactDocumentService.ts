export interface ContactDocument {
    id: string;
    contactId: string;
    filename: string;
    originalFilename: string;
    title: string;
    mimeType: string;
    fileSize: number;
    url: string;
    urlThumb: string | null;
    createdAt: string;
}

export async function getContactDocuments(contactId: string): Promise<ContactDocument[]> {
    const res = await fetch(`/api/contacts/documents?contactId=${encodeURIComponent(contactId)}`);
    if (!res.ok) throw new Error("Failed to fetch documents");
    const data = await res.json();
    return data.documents;
}

export async function uploadContactDocument(contactId: string, file: File, thumbnail?: Blob): Promise<ContactDocument> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("contactId", contactId);
    if (thumbnail) formData.append("thumbnail", thumbnail, "thumbnail.webp");

    const res = await fetch("/api/contacts/documents/upload", {
        method: "POST",
        body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.document;
}

export async function deleteContactDocument(documentId: string): Promise<void> {
    const res = await fetch("/api/contacts/documents/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Delete failed");
}

