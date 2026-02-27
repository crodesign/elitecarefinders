import { Dispatch, SetStateAction } from "react";
import type { VideoEntry } from "@/types";
import { VideosTabContent } from "@/components/admin/forms/VideosTabContent";

interface HomeVideosTabProps {
    videos: VideoEntry[];
    setVideos: Dispatch<SetStateAction<VideoEntry[]>>;
    setIsDirty: (value: boolean) => void;
    title: string;
}

export function HomeVideosTab({ videos, setVideos, setIsDirty, title }: HomeVideosTabProps) {
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
