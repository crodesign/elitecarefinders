import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";

interface SortableGalleryItemProps {
    url: string;
    onRemove: (url: string) => void;
    onError?: (url: string) => void;
}

export function SortableGalleryItem({ url, onRemove, onError }: SortableGalleryItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: url });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="relative group flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-ui-border bg-surface-input cursor-grab active:cursor-grabbing touch-none"
        >
            <img
                src={url}
                alt=""
                className={`w-full h-full ${url.toLowerCase().endsWith('.svg') ? 'object-contain p-1' : 'object-cover'} pointer-events-none`}
                onError={() => onError?.(url)}
            />
            <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()} // Prevent drag start when clicking remove
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(url);
                }}
                className="absolute top-1 right-1 p-1 bg-[var(--media-edit-btn-bg)] text-[var(--media-edit-btn-text)] opacity-50 group-hover:opacity-100 transition-all rounded-md hover:!bg-accent hover:text-white cursor-pointer"
            >
                <X className="h-3 w-3" />
            </button>
        </div>
    );
}

