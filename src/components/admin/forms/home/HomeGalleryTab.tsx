import { Dispatch, SetStateAction } from "react";
import { MediaGallery } from "@/components/admin/media/MediaGallery";

interface HomeGalleryTabProps {
    images: string[];
    setImages: Dispatch<SetStateAction<string[]>>;
    galleryFolderId: string | null;
    title: string;
    setIsDirty: (value: boolean) => void;
}

export function HomeGalleryTab({
    images,
    setImages,
    galleryFolderId,
    title,
    setIsDirty
}: HomeGalleryTabProps) {
    return (
        <div className="space-y-6">
            <div className="bg-[#0b1115] border border-white/5 rounded-lg p-6">
                {!galleryFolderId || !title ? (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                        <p className="text-zinc-400 mb-2">Location Classification and Name Required</p>
                        <p className="text-sm text-zinc-500">Please select a Location Classification (Taxonomy) and enter the Home Name to access the gallery.</p>
                    </div>
                ) : (
                    <MediaGallery
                        folderId={galleryFolderId}
                        title={`${title} Gallery`}
                        selectedUrls={images}
                        onSelectionChange={(urls) => {
                            setImages(urls);
                            setIsDirty(true);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
