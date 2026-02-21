"use client";

import { Dispatch, SetStateAction } from "react";
import { MediaGallery } from "@/components/admin/media/MediaGallery";

interface FacilityGalleryTabProps {
    galleryFolderId: string | null;
    title: string;
    images: string[];
    setImages: Dispatch<SetStateAction<string[]>>;
    setIsDirty: (value: boolean) => void;
    isDirty: boolean;
}

export function FacilityGalleryTab({
    galleryFolderId,
    title,
    images,
    setImages,
    setIsDirty,
    isDirty,
}: FacilityGalleryTabProps) {
    return (
        <div className="h-full flex flex-col">
            {!galleryFolderId || !title ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                    <p className="text-content-secondary mb-2">Location Classification and Name Required</p>
                    <p className="text-sm text-content-muted">Please select a Location Classification (Taxonomy) and enter the Facility Name to access the gallery.</p>
                </div>
            ) : (
                <MediaGallery
                    folderId={galleryFolderId}
                    title={`${title} Gallery`}
                    selectedUrls={images}
                    className="flex-1 min-h-0"
                    isDirty={isDirty}
                    onSelectionChange={(urls) => {
                        setImages(urls);
                        setIsDirty(true);
                    }}
                />
            )}
        </div>
    );
}
