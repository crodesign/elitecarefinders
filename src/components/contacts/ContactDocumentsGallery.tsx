"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Upload, Trash2, FileText, Loader2 } from "lucide-react";
import { HeartLoader } from "@/components/ui/HeartLoader";
import {
    ContactDocument,
    getContactDocuments,
    uploadContactDocument,
    deleteContactDocument,
} from "@/lib/services/contactDocumentService";
import { DocumentModal } from "./DocumentModal";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

interface ContactDocumentsGalleryProps {
    contactId: string;
    readOnly?: boolean;
}

const ACCEPTED_TYPES = "image/jpeg,image/png,image/gif,image/webp,application/pdf";
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_DIMENSION = 1940;
const MAX_BYTES = 4 * 1024 * 1024; // 4MB safety margin under Vercel's 4.5MB limit

async function generatePdfThumbnail(file: File): Promise<Blob | null> {
    try {
        const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
        GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.5.207/build/pdf.worker.min.mjs`;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const scale = 100 / viewport.width;
        const scaledViewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(scaledViewport.width);
        canvas.height = Math.round(scaledViewport.height);
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport: scaledViewport, canvas: canvas as unknown as HTMLCanvasElement }).promise;
        return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.8));
    } catch (err) {
        console.error("[PDF thumbnail]", err);
        return null;
    }
}

async function compressImage(file: File): Promise<File> {
    if (!IMAGE_TYPES.has(file.type)) return file;
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => {
                    if (!blob) { reject(new Error("Image compression failed")); return; }
                    resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
                },
                "image/webp",
                0.85
            );
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
        img.src = url;
    });
}

export function ContactDocumentsGallery({ contactId, readOnly = false }: ContactDocumentsGalleryProps) {
    const [documents, setDocuments] = useState<ContactDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<ContactDocument | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        load();
    }, [contactId]);

    async function load() {
        setLoading(true);
        try {
            const docs = await getContactDocuments(contactId);
            setDocuments(docs);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        e.target.value = "";

        setUploading(true);
        try {
            for (const rawFile of files) {
                const file = IMAGE_TYPES.has(rawFile.type) ? await compressImage(rawFile) : rawFile;
                if (file.size > MAX_BYTES) {
                    throw new Error(`"${rawFile.name}" is too large (max 4 MB)`);
                }
                const thumbnail = rawFile.type === "application/pdf"
                    ? await generatePdfThumbnail(rawFile)
                    : null;
                const doc = await uploadContactDocument(contactId, file, thumbnail ?? undefined);
                setDocuments((prev) => [doc, ...prev]);
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploading(false);
        }
    }

    async function confirmAndDelete(doc: ContactDocument) {
        setDeletingId(doc.id);
        setConfirmDelete(null);
        try {
            await deleteContactDocument(doc.id);
            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
        } catch (err) {
            alert(err instanceof Error ? err.message : "Delete failed");
        } finally {
            setDeletingId(null);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-3">
                <HeartLoader size={6} />
            </div>
        );
    }

    return (
        <>
            <div className="space-y-3">
                {/* Header row */}
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-content-primary pl-[10px]">
                        Documents
                        {documents.length > 0 && (
                            <span className="ml-2 text-content-muted font-normal">({documents.length})</span>
                        )}
                    </h4>
                    {!readOnly && (
                        <>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="p-1.5 rounded-lg bg-accent text-white hover:bg-white dark:hover:bg-black hover:text-content-secondary transition-colors disabled:opacity-30"
                            >
                                {uploading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="h-4 w-4" />
                                )}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={ACCEPTED_TYPES}
                                multiple
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </>
                    )}
                </div>

                {/* Gallery grid */}
                {documents.length === 0 ? (
                    <p className="text-sm text-content-muted italic">No documents uploaded</p>
                ) : (
                    <div className="flex flex-wrap gap-2 px-[10px] pb-[10px]">
                        {documents.map((doc, index) => {
                            const ts = new Date(doc.createdAt);
                            return (
                                <div
                                    key={doc.id}
                                    className="group w-20 flex-shrink-0 cursor-pointer flex flex-col items-center"
                                    onClick={() => setSelectedIndex(index)}
                                >
                                    {/* Thumbnail */}
                                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-surface-primary">
                                        {doc.urlThumb ? (
                                            <img
                                                src={doc.urlThumb}
                                                alt={doc.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <FileText className="h-8 w-8 text-content-muted" />
                                            </div>
                                        )}

                                        {/* Delete button */}
                                        {!readOnly && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmDelete(doc);
                                                }}
                                                disabled={deletingId === doc.id}
                                                className="absolute top-1.5 right-1.5 p-1.5 rounded-lg shadow-sm backdrop-blur-md bg-[var(--media-edit-btn-bg)] text-[var(--media-edit-btn-text)] opacity-50 group-hover:opacity-100 hover:bg-[var(--media-edit-btn-hover-bg)] hover:text-red-500 transition-all cursor-pointer"
                                            >
                                                {deletingId === doc.id ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                )}
                                            </button>
                                        )}

                                        {/* PDF label */}
                                        {doc.mimeType === "application/pdf" && (
                                            <div className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 backdrop-blur-md bg-[var(--media-edit-btn-bg)] text-[var(--media-edit-btn-text)] text-[10px] font-medium text-center truncate pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                PDF
                                            </div>
                                        )}
                                    </div>

                                    {/* Date / time */}
                                    <div className="mt-1 text-center leading-tight">
                                        <div className="text-[10px] text-content-muted">{format(ts, "MMM d, yyyy")}</div>
                                        <div className="text-[10px] text-content-muted">{format(ts, "h:mm a")}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedIndex !== null && (
                <DocumentModal
                    documents={documents}
                    initialIndex={selectedIndex}
                    onClose={() => setSelectedIndex(null)}
                />
            )}

            <ConfirmationModal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={() => confirmDelete && confirmAndDelete(confirmDelete)}
                title="Delete Document"
                message={`Are you sure you want to permanently delete "${confirmDelete?.title || confirmDelete?.originalFilename}"? This cannot be undone.`}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                isDangerous={true}
            />
        </>
    );
}
