import { Dispatch, SetStateAction } from "react";
import { MediaGallery } from "@/components/admin/media/MediaGallery";

interface HomeGalleryTabProps {
    images: string[];
    setImages: Dispatch<SetStateAction<string[]>>;
    galleryFolderId: string | null;
    title: string;
    setIsDirty: (value: boolean) => void;
    isDirty: boolean;
}

export function HomeGalleryTab({
    images,
    setImages,
    galleryFolderId,
    title,
    setIsDirty,
    isDirty,
}: HomeGalleryTabProps) {
    return (
        <div className="h-full flex flex-col">
            {!galleryFolderId || !title ? (
                <div className="text-center py-12 border border-dashed border-ui-border rounded-xl">
                    <p className="text-content-secondary mb-2">Location Classification and Name Required</p>
                    <p className="text-sm text-content-muted">Please select a Location Classification (Taxonomy) and enter the Home Name to access the gallery.</p>
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
