'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, GripVertical, Images } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface GalleryTab {
    id: 'main' | 'team' | 'cuisine';
    label: string;
    urls: string[];
    onChange: (urls: string[]) => void;
    emptyText?: string;
}

interface SortableImageProps {
    url: string;
    onRemove: () => void;
    disabled?: boolean;
}

function SortableImage({ url, onRemove, disabled }: SortableImageProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });
    const thumb = url.startsWith('/images/media/') ? url.replace(/(\.[^.]+)$/, '-200x200.webp') : url;

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
            className="relative group aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200"
        >
            <img src={thumb} alt="" className="w-full h-full object-cover" />
            {!disabled && (
                <>
                    <div
                        {...attributes}
                        {...listeners}
                        className="absolute top-1.5 left-1.5 w-6 h-6 bg-black/40 text-white rounded-md flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <GripVertical className="h-3.5 w-3.5" />
                    </div>
                    <button
                        type="button"
                        onClick={onRemove}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/40 text-white rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </>
            )}
            {/* First image badge */}
        </div>
    );
}

interface PublicGalleryProps {
    tabs: GalleryTab[];
    entitySlug?: string;
    disabled?: boolean;
}

export function PublicGallery({ tabs, entitySlug, disabled }: PublicGalleryProps) {
    const [activeTab, setActiveTab] = useState<'main' | 'team' | 'cuisine'>(tabs[0]?.id ?? 'main');
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const currentTab = tabs.find(t => t.id === activeTab) ?? tabs[0];

    const uploadFiles = useCallback(async (files: FileList | File[]) => {
        if (!currentTab || disabled) return;
        setUploading(true);
        setUploadError('');
        const uploaded: string[] = [];
        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) continue;
            const form = new FormData();
            form.append('file', file);
            if (entitySlug) form.append('namePrefix', entitySlug);
            try {
                const res = await fetch('/api/media/upload', { method: 'POST', body: form });
                const data = await res.json();
                if (res.ok && data.item?.url) {
                    uploaded.push(data.item.url);
                }
            } catch {
                // skip failed files
            }
        }
        if (uploaded.length > 0) {
            currentTab.onChange([...currentTab.urls, ...uploaded]);
        } else if (files.length > 0) {
            setUploadError('Upload failed. Please try again.');
        }
        setUploading(false);
    }, [currentTab, entitySlug, disabled]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) uploadFiles(e.target.files);
        e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        if (!currentTab) return;
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = currentTab.urls.indexOf(active.id as string);
            const newIndex = currentTab.urls.indexOf(over.id as string);
            currentTab.onChange(arrayMove(currentTab.urls, oldIndex, newIndex));
        }
    };

    const removeImage = (url: string) => {
        if (!currentTab) return;
        currentTab.onChange(currentTab.urls.filter(u => u !== url));
    };

    return (
        <div className="space-y-4">
            {/* Tab bar */}
            {tabs.length > 1 && (
                <div className="flex gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-[#239ddb] text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                        >
                            {tab.label}
                            <span className="ml-1.5 opacity-70">({tab.urls.length})</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Drop zone + upload button */}
            {!disabled && (
                <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl px-4 py-5 text-center transition-colors ${
                        dragOver ? 'border-[#239ddb] bg-[#239ddb]/5' : 'border-gray-200 bg-gray-50'
                    }`}
                >
                    {uploading ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                            <div className="w-4 h-4 border-2 border-[#239ddb] border-t-transparent rounded-full animate-spin" />
                            Uploading…
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <Upload className="h-5 w-5 text-gray-400" />
                            <p className="text-sm text-gray-500">
                                Drag &amp; drop images here, or{' '}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-[#239ddb] font-semibold hover:underline"
                                >
                                    browse
                                </button>
                            </p>
                            <p className="text-[11px] text-gray-400">JPG, PNG, WebP — drag to reorder after upload</p>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>
            )}

            {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}

            {/* Sortable grid */}
            {currentTab && currentTab.urls.length > 0 ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={currentTab.urls} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {currentTab.urls.map(url => (
                                <SortableImage
                                    key={url}
                                    url={url}
                                    onRemove={() => removeImage(url)}
                                    disabled={disabled}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <Images className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">{currentTab?.emptyText ?? 'No photos yet'}</p>
                </div>
            )}
        </div>
    );
}
