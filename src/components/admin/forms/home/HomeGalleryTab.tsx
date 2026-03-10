import { Dispatch, SetStateAction } from "react";
import { MediaGallery } from "@/components/admin/media/MediaGallery";

interface HomeGalleryTabProps {
    images: string[];
    setImages: Dispatch<SetStateAction<string[]>>;
    teamImages?: string[];
    setTeamImages?: Dispatch<SetStateAction<string[]>>;
    cuisineImages?: string[];
    setCuisineImages?: Dispatch<SetStateAction<string[]>>;
    galleryFolderId: string | null;
    title: string;
    setIsDirty: (value: boolean) => void;
    isDirty: boolean;
}

export function HomeGalleryTab({
    images,
    setImages,
    teamImages = [],
    setTeamImages,
    cuisineImages = [],
    setCuisineImages,
    galleryFolderId,
    title,
    setIsDirty,
    isDirty,
}: HomeGalleryTabProps) {
    return (
        <div className="sm:flex sm:flex-col sm:flex-1 sm:min-h-0">
            {!galleryFolderId || !title ? (
                <div className="text-center py-12 border border-dashed border-ui-border rounded-xl">
                    <p className="text-content-secondary mb-2">Location Classification and Name Required</p>
                    <p className="text-sm text-content-muted">Please select a Location Classification (Taxonomy) and enter the Home Name to access the gallery.</p>
                </div>
            ) : (
                <MediaGallery
                    folderId={galleryFolderId}
                    title={`${title} Image Library`}
                    className="sm:flex-1 sm:min-h-0"
                    isDirty={isDirty}
                    galleries={[
                        {
                            id: "main",
                            title: "Gallery Images",
                            shortLabel: "Image Gallery",
                            mobileLabel: "Gallery",
                            urls: images,
                            onChange: (urls) => {
                                setImages(urls);
                                setIsDirty(true);
                            }
                        },
                        {
                            id: "team",
                            title: "Team Images",
                            shortLabel: "Team Photos",
                            mobileLabel: "Team",
                            urls: teamImages,
                            onChange: (urls) => {
                                setTeamImages?.(urls);
                                setIsDirty(true);
                            }
                        },
                        {
                            id: "cuisine",
                            title: "Cuisine Images",
                            shortLabel: "Cuisine Images",
                            mobileLabel: "Cuisine",
                            urls: cuisineImages,
                            onChange: (urls) => {
                                setCuisineImages?.(urls);
                                setIsDirty(true);
                            }
                        }
                    ]}
                />
            )}
        </div>
    );
}
