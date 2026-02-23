"use client";

import { Dispatch, SetStateAction } from "react";
import { MediaGallery } from "@/components/admin/media/MediaGallery";

interface FacilityGalleryTabProps {
    galleryFolderId: string | null;
    title: string;
    images: string[];
    setImages: Dispatch<SetStateAction<string[]>>;
    teamImages?: string[];
    setTeamImages?: Dispatch<SetStateAction<string[]>>;
    setIsDirty: (value: boolean) => void;
    isDirty: boolean;
}

export function FacilityGalleryTab({
    galleryFolderId,
    title,
    images,
    setImages,
    teamImages = [],
    setTeamImages,
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
                    className="flex-1 min-h-0"
                    isDirty={isDirty}
                    galleries={[
                        {
                            id: "main",
                            title: "Gallery Images",
                            shortLabel: "Image Gallery",
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
                            urls: teamImages,
                            onChange: (urls) => {
                                setTeamImages?.(urls);
                                setIsDirty(true);
                            }
                        }
                    ]}
                />
            )}
        </div>
    );
}
