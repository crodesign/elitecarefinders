"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Home, Building2, Video, GripVertical, LayoutTemplate, Eye, EyeOff } from "lucide-react";
import {
    DndContext,
    closestCenter,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import { HeartLoader } from "@/components/ui/HeartLoader";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SortableHome {
    id: string;
    slug: string;
    title: string;
    image: string | null;
    featuredLabel: string | null;
}

interface SortableFacility {
    id: string;
    slug: string;
    title: string;
    image: string | null;
    featuredLabel: string | null;
}

interface SortableVideo {
    id: string;
    entitySlug: string;
    entityType: "home" | "facility";
    entityTitle: string;
    entityImage: string | null;
}

interface SortableSection {
    id: string;
    label: string;
    visible: boolean;
}

// ─── Sortable Row Card ─────────────────────────────────────────────────────────

function SortableRowCard({ id, children }: { id: string; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1,
                zIndex: isDragging ? 50 : undefined,
            }}
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing select-none"
        >
            {children}
        </div>
    );
}

// ─── Row Card UI ───────────────────────────────────────────────────────────────

function RowCard({ image, title, badge, badgeColor }: {
    image: string | null;
    title: string;
    badge?: string;
    badgeColor?: string;
}) {
    return (
        <div className="flex items-center gap-2 px-2 py-2.5 rounded-lg border border-ui-border bg-surface-card hover:bg-surface-hover transition-colors">
            <GripVertical className="flex-shrink-0 h-4 w-4 text-content-muted" />
            <div className="flex-shrink-0 w-10 h-10 rounded-md overflow-hidden bg-surface-secondary">
                {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={image.startsWith('/images/media/') ? image.replace(/(\.[^.]+)$/, '-100x100.webp') : image}
                        alt={title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Home className="h-4 w-4 text-content-muted" />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-content-primary truncate">{title}</p>
                {badge && (
                    <span
                        className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none text-white"
                        style={{ backgroundColor: badgeColor || '#16a34a' }}
                    >
                        {badge}
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Sortable Section Row ──────────────────────────────────────────────────────

function SortableSectionRow({ section, onToggle }: { section: SortableSection; onToggle: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1,
                zIndex: isDragging ? 50 : undefined,
            }}
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing select-none flex items-center gap-2 px-2 py-2.5 rounded-lg border border-ui-border bg-surface-card hover:bg-surface-hover transition-colors"
        >
            <GripVertical className="flex-shrink-0 h-4 w-4 text-content-muted" />
            <p className="flex-1 min-w-0 text-xs font-medium text-content-primary truncate">{section.label}</p>
            <button
                onClick={e => { e.stopPropagation(); onToggle(); }}
                onPointerDown={e => e.stopPropagation()}
                title={section.visible ? 'Hide section' : 'Show section'}
                className="flex-shrink-0 p-1 rounded hover:bg-surface-secondary transition-colors"
            >
                {section.visible
                    ? <Eye className="h-4 w-4 text-accent" />
                    : <EyeOff className="h-4 w-4 text-content-muted" />
                }
            </button>
        </div>
    );
}

// ─── Sections Column ───────────────────────────────────────────────────────────

function SectionsColumn({ sections, onReorder, onToggle, onSave, isSaving, isDirty }: {
    sections: SortableSection[];
    onReorder: (items: SortableSection[]) => void;
    onToggle: (id: string) => void;
    onSave: () => Promise<void>;
    isSaving: boolean;
    isDirty: boolean;
}) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = sections.findIndex(s => s.id === active.id);
        const newIndex = sections.findIndex(s => s.id === over.id);
        onReorder(arrayMove(sections, oldIndex, newIndex));
    }

    return (
        <div className="flex flex-col overflow-hidden bg-surface-secondary rounded-2xl border border-ui-border">
            <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-ui-border">
                <div className="flex items-center gap-2">
                    <span className="text-accent"><LayoutTemplate className="h-4 w-4" /></span>
                    <h2 className="text-sm font-semibold text-content-primary">Homepage Sections</h2>
                    <span className="text-xs text-content-muted bg-surface-hover px-1.5 py-0.5 rounded-full leading-none">{sections.length}</span>
                </div>
                <button
                    onClick={onSave}
                    disabled={isSaving || !isDirty}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                        backgroundColor: isDirty && !isSaving ? 'var(--accent)' : 'var(--surface-hover)',
                        color: isDirty && !isSaving ? 'white' : 'var(--content-secondary)',
                    }}
                >
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    {isSaving ? 'Saving…' : 'Save'}
                </button>
            </div>
            <div className="flex-1 overflow-y-auto">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        <div className="p-2.5 space-y-1.5">
                            {sections.map(section => (
                                <SortableSectionRow
                                    key={section.id}
                                    section={section}
                                    onToggle={() => onToggle(section.id)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
}

// ─── Column ────────────────────────────────────────────────────────────────────

interface SortColumnProps<T extends { id: string }> {
    title: string;
    icon: React.ReactNode;
    items: T[];
    onReorder: (items: T[]) => void;
    onSave: () => Promise<void>;
    isSaving: boolean;
    isDirty: boolean;
    renderRow: (item: T) => React.ReactNode;
}

function SortColumn<T extends { id: string }>({
    title, icon, items, onReorder, onSave, isSaving, isDirty, renderRow,
}: SortColumnProps<T>) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        onReorder(arrayMove(items, oldIndex, newIndex));
    }

    return (
        <div className="flex flex-col overflow-hidden bg-surface-secondary rounded-2xl border border-ui-border">
            {/* Column header */}
            <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-ui-border">
                <div className="flex items-center gap-2">
                    <span className="text-accent">{icon}</span>
                    <h2 className="text-sm font-semibold text-content-primary">{title}</h2>
                    <span className="text-xs text-content-muted bg-surface-hover px-1.5 py-0.5 rounded-full leading-none">{items.length}</span>
                </div>
                <button
                    onClick={onSave}
                    disabled={isSaving || !isDirty}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                        backgroundColor: isDirty && !isSaving ? 'var(--accent)' : 'var(--surface-hover)',
                        color: isDirty && !isSaving ? 'white' : 'var(--content-secondary)',
                    }}
                >
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    {isSaving ? 'Saving…' : 'Save'}
                </button>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto">
                {items.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-content-muted">No items found.</div>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                            <div className="p-2.5 space-y-1.5">
                                {items.map(item => (
                                    <SortableRowCard key={item.id} id={item.id}>
                                        {renderRow(item)}
                                    </SortableRowCard>
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        </div>
    );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SortOrderPage() {
    const { isSuperAdmin, isSystemAdmin, loading: authLoading } = useAuth();
    const { showNotification } = useNotification();

    const [isLoading, setIsLoading] = useState(true);

    const [homes, setHomes] = useState<SortableHome[]>([]);
    const [facilities, setFacilities] = useState<SortableFacility[]>([]);
    const [videos, setVideos] = useState<SortableVideo[]>([]);
    const [sections, setSections] = useState<SortableSection[]>([]);

    const [homesDirty, setHomesDirty] = useState(false);
    const [facilitiesDirty, setFacilitiesDirty] = useState(false);
    const [videosDirty, setVideosDirty] = useState(false);
    const [sectionsDirty, setSectionsDirty] = useState(false);

    const [savingHomes, setSavingHomes] = useState(false);
    const [savingFacilities, setSavingFacilities] = useState(false);
    const [savingVideos, setSavingVideos] = useState(false);
    const [savingSections, setSavingSections] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        Promise.all([
            fetch('/api/admin/sort-order').then(r => r.json()),
            fetch('/api/admin/sort-order/sections').then(r => r.json()),
        ])
            .then(([data, sectionsData]) => {
                setHomes((data.homes || []).map((h: any) => ({ ...h, id: h.slug })));
                setFacilities((data.facilities || []).map((f: any) => ({ ...f, id: f.slug })));
                setVideos((data.videos || []).map((v: any) => ({
                    id: `${v.entityType}:${v.entitySlug}`,
                    entitySlug: v.entitySlug,
                    entityType: v.entityType,
                    entityTitle: v.entityTitle,
                    entityImage: v.entityImage,
                })));
                setSections(sectionsData.sections || []);
            })
            .catch(() => showNotification('error', 'Failed to load sort data'))
            .finally(() => setIsLoading(false));
    }, [authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

    async function saveHomes() {
        setSavingHomes(true);
        try {
            const res = await fetch('/api/admin/sort-order/homes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slugs: homes.map(h => h.slug) }),
            });
            if (!res.ok) throw new Error();
            showNotification('success', 'Featured homes order saved');
            setHomesDirty(false);
        } catch {
            showNotification('error', 'Failed to save homes order');
        } finally {
            setSavingHomes(false);
        }
    }

    async function saveFacilities() {
        setSavingFacilities(true);
        try {
            const res = await fetch('/api/admin/sort-order/facilities', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slugs: facilities.map(f => f.slug) }),
            });
            if (!res.ok) throw new Error();
            showNotification('success', 'Featured facilities order saved');
            setFacilitiesDirty(false);
        } catch {
            showNotification('error', 'Failed to save facilities order');
        } finally {
            setSavingFacilities(false);
        }
    }

    async function saveVideos() {
        setSavingVideos(true);
        try {
            const res = await fetch('/api/admin/sort-order/videos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: videos.map(v => ({ entityType: v.entityType, entitySlug: v.entitySlug })) }),
            });
            if (!res.ok) throw new Error();
            showNotification('success', 'Featured video order saved');
            setVideosDirty(false);
        } catch {
            showNotification('error', 'Failed to save video order');
        } finally {
            setSavingVideos(false);
        }
    }

    async function saveSections() {
        setSavingSections(true);
        try {
            const res = await fetch('/api/admin/sort-order/sections', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sections }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `HTTP ${res.status}`);
            }
            showNotification('success', 'Homepage section order saved');
            setSectionsDirty(false);
        } catch (err: any) {
            showNotification('error', `Failed to save section order: ${err.message}`);
        } finally {
            setSavingSections(false);
        }
    }

    function toggleSectionVisibility(id: string) {
        setSections(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
        setSectionsDirty(true);
    }

    if (authLoading || isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <HeartLoader />
            </div>
        );
    }

    if (!isSuperAdmin && !isSystemAdmin) {
        return (
            <div className="flex-1 flex items-center justify-center text-content-muted text-sm">
                You do not have permission to access this page.
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden px-6 py-6 gap-4">
            <div className="flex-none">
                <h1 className="text-xl font-bold text-content-primary">Sort Order</h1>
                <p className="text-sm text-content-muted mt-0.5">Drag items to reorder featured content on the public site. Save each column independently.</p>
            </div>

            <div className="flex-1 grid grid-cols-4 gap-4 overflow-hidden min-h-0">
                <SortColumn
                    title="Featured Homes"
                    icon={<Home className="h-4 w-4" />}
                    items={homes}
                    onReorder={(items) => { setHomes(items); setHomesDirty(true); }}
                    onSave={saveHomes}
                    isSaving={savingHomes}
                    isDirty={homesDirty}
                    renderRow={(item) => (
                        <RowCard
                            image={item.image}
                            title={item.title}
                            badge={item.featuredLabel || undefined}
                        />
                    )}
                />

                <SortColumn
                    title="Featured Facilities"
                    icon={<Building2 className="h-4 w-4" />}
                    items={facilities}
                    onReorder={(items) => { setFacilities(items); setFacilitiesDirty(true); }}
                    onSave={saveFacilities}
                    isSaving={savingFacilities}
                    isDirty={facilitiesDirty}
                    renderRow={(item) => (
                        <RowCard
                            image={item.image}
                            title={item.title}
                            badge={item.featuredLabel || undefined}
                        />
                    )}
                />

                <SortColumn
                    title="Featured Videos"
                    icon={<Video className="h-4 w-4" />}
                    items={videos}
                    onReorder={(items) => { setVideos(items); setVideosDirty(true); }}
                    onSave={saveVideos}
                    isSaving={savingVideos}
                    isDirty={videosDirty}
                    renderRow={(item) => (
                        <RowCard
                            image={item.entityImage}
                            title={item.entityTitle}
                            badge={item.entityType === 'home' ? 'Home' : 'Facility'}
                            badgeColor={item.entityType === 'home' ? '#1e3a5f' : '#4169e1'}
                        />
                    )}
                />

                <SectionsColumn
                    sections={sections}
                    onReorder={(items) => { setSections(items); setSectionsDirty(true); }}
                    onToggle={toggleSectionVisibility}
                    onSave={saveSections}
                    isSaving={savingSections}
                    isDirty={sectionsDirty}
                />
            </div>
        </div>
    );
}
