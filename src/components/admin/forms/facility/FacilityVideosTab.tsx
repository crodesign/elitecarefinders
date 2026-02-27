import { Dispatch, SetStateAction } from "react";
import type { VideoEntry } from "@/types";
import { VideosTabContent } from "@/components/admin/forms/VideosTabContent";

interface FacilityVideosTabProps {
    videos: VideoEntry[];
    setVideos: Dispatch<SetStateAction<VideoEntry[]>>;
    setIsDirty: (value: boolean) => void;
    title: string;
}

export function FacilityVideosTab({ videos, setVideos, setIsDirty, title }: FacilityVideosTabProps) {
    return (
        <div className="h-full flex flex-col">
            <VideosTabContent
                videos={videos}
                setVideos={setVideos}
                setIsDirty={setIsDirty}
                entityTitle={title}
            />
        </div>
    );
}
