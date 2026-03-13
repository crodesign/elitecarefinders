'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHouse, faBuilding, faMapMarkerAlt, faPhone, faEnvelope,
    faLock, faCheck, faChevronLeft, faChevronRight, faPaperPlane,
    faCircleInfo, faVideo, faImage,
} from '@fortawesome/free-solid-svg-icons';
import { PublicGallery, type GalleryTab } from '@/components/public/PublicGallery';
import { useFavorites } from '@/contexts/FavoritesContext';

// ─── Types ─────────────────────────────────────────────────────────────────

interface TaxonomyEntry { id: string; name: string; parentName?: string; }

interface WizardData {
    // Tier 1 — read-only
    title: string;
    slug: string;
    entityType: 'home' | 'facility';
    status: string;
    address?: { street?: string; city?: string; state?: string; zip?: string };
    taxonomyEntries: TaxonomyEntry[];
    // Tier 3 — always editable (live values)
    description: string;
    excerpt: string;
    phone: string;
    email: string;
    images: string[];
    team_images: string[];
    cuisine_images: string[];
    videos: { url: string; caption?: string }[];
    // Tier 2 — care/room details (locks after first save)
    room_details?: Record<string, any>;
    // Draft
    local_user_draft?: Record<string, any> | null;
    local_user_draft_status?: 'none' | 'draft' | 'pending_review';
    local_user_locked_fields?: Record<string, boolean>;
}

interface RoomFieldDef {
    id: string;
    name: string;
    type: string;
    options?: string[];
    categoryId: string;
    isPublic: boolean;
    isActive: boolean;
    targetType: 'home' | 'facility' | 'both';
    displayOrder: number;
}

interface RoomFieldCategory {
    id: string;
    name: string;
    section: string;
    displayOrder: number;
}

// ─── Step definitions ──────────────────────────────────────────────────────

const STEPS = [
    { id: 'identity', label: 'Your Listing' },
    { id: 'description', label: 'Description' },
    { id: 'contact', label: 'Contact' },
    { id: 'care', label: 'Care Details' },
    { id: 'amenities', label: 'Amenities' },
    { id: 'photos', label: 'Photos' },
    { id: 'videos', label: 'Videos' },
    { id: 'review', label: 'Review & Submit' },
];

// ─── Helper components ─────────────────────────────────────────────────────

function LockedField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                <FontAwesomeIcon icon={faLock} className="h-3 w-3 text-gray-300 flex-shrink-0" />
                <span className="text-sm text-gray-600">{value || '—'}</span>
            </div>
        </div>
    );
}

function FieldLabel({ children, locked }: { children: React.ReactNode; locked?: boolean }) {
    return (
        <div className="flex items-center gap-1.5 mb-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{children}</p>
            {locked && (
                <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                    <FontAwesomeIcon icon={faLock} className="h-2.5 w-2.5" />
                    Locked — contact your manager to change
                </span>
            )}
        </div>
    );
}

const fieldBase = 'w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#239ddb] focus:bg-white transition-colors';

// ─── Main page ─────────────────────────────────────────────────────────────

export default function ListingWizardPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user } = useFavorites();

    const [step, setStep] = useState(0);
    const [data, setData] = useState<WizardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');
    const [fieldDefs, setFieldDefs] = useState<RoomFieldDef[]>([]);
    const [fieldCategories, setFieldCategories] = useState<RoomFieldCategory[]>([]);

    // Draft working state — what user is currently editing
    const [description, setDescription] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [teamImages, setTeamImages] = useState<string[]>([]);
    const [cuisineImages, setCuisineImages] = useState<string[]>([]);
    const [videos, setVideos] = useState<{ url: string; caption: string }[]>([]);
    const [careFields, setCareFields] = useState<Record<string, any>>({});
    const [customFields, setCustomFields] = useState<Record<string, any>>({});

    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Redirect if not logged in
    useEffect(() => {
        if (!user && !loading) router.push('/profile');
    }, [user, loading, router]);

    // Load entity + room field defs
    useEffect(() => {
        if (!id) return;
        Promise.all([
            fetch(`/api/profile/listing/${id}`).then(r => r.json()),
            fetch('/api/room-fields/public').then(r => r.json()).catch(() => ({ fields: [], categories: [] })),
        ]).then(([entity, fieldData]) => {
            if (entity.error) { router.push('/profile'); return; }
            setData(entity);
            setFieldDefs(fieldData.fields ?? []);
            setFieldCategories(fieldData.categories ?? []);

            // Populate working state from draft (preferred) or live values
            const d = entity.local_user_draft ?? {};
            const rd = entity.room_details ?? {};
            setDescription(d.description ?? entity.description ?? '');
            setExcerpt(d.excerpt ?? entity.excerpt ?? '');
            setPhone(d.phone ?? entity.phone ?? '');
            setEmail(d.email ?? entity.email ?? '');
            setImages(d.images ?? entity.images ?? []);
            setTeamImages(d.teamImages ?? entity.team_images ?? []);
            setCuisineImages(d.cuisineImages ?? entity.cuisine_images ?? []);
            setVideos(d.videos ?? entity.videos ?? []);
            setCareFields({
                levelOfCare: d.levelOfCare ?? rd.levelOfCare ?? [],
                bedroomTypes: d.bedroomTypes ?? rd.bedroomTypes ?? rd.bedroomType ? [rd.bedroomType] : [],
                bathroomType: d.bathroomType ?? rd.bathroomType ?? '',
                showerType: d.showerType ?? rd.showerType ?? '',
                roomTypes: d.roomTypes ?? rd.roomTypes ?? [],
                roomPrice: d.roomPrice ?? rd.roomPrice ?? '',
            });
            setCustomFields(d.customFields ?? rd.customFields ?? {});
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [id, router]);

    // Auto-save helper
    const autoSave = useCallback((stepId: string, stepData: Record<string, any>) => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
            setSaving(true);
            try {
                await fetch(`/api/profile/listing/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ step: stepId, data: stepData }),
                });
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            } catch {
                setSaveStatus('error');
            }
            setSaving(false);
        }, 800);
    }, [id]);

    // Trigger auto-save when editing step-specific fields
    useEffect(() => {
        if (loading || !data) return;
        const stepId = STEPS[step]?.id;
        if (stepId === 'description') autoSave('description', { description, excerpt });
        if (stepId === 'contact') autoSave('contact', { phone, email });
        if (stepId === 'care') autoSave('care', careFields);
        if (stepId === 'amenities') autoSave('amenities', { customFields });
        if (stepId === 'photos') autoSave('photos', { images, teamImages, cuisineImages });
        if (stepId === 'videos') autoSave('videos', { videos });
    }, [description, excerpt, phone, email, careFields, customFields, images, teamImages, cuisineImages, videos, step, loading, data, autoSave]);

    const handleSubmit = async () => {
        setSubmitStatus('submitting');
        try {
            const res = await fetch(`/api/profile/listing/${id}/submit`, { method: 'POST' });
            if (!res.ok) throw new Error();
            setSubmitStatus('submitted');
            setData(prev => prev ? { ...prev, local_user_draft_status: 'pending_review' } : prev);
        } catch {
            setSubmitStatus('error');
        }
    };

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto px-5 py-16 flex justify-center">
                <div className="w-8 h-8 border-2 border-[#239ddb] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!data) return null;

    const locked = data.local_user_locked_fields ?? {};
    const isPending = data.local_user_draft_status === 'pending_review';
    const currentStepId = STEPS[step].id;

    // ─── Gallery tabs ─────────────────────────────────────────────────────
    const galleryTabs: GalleryTab[] = [
        { id: 'main', label: 'Gallery', urls: images, onChange: setImages, emptyText: 'No gallery photos yet' },
        { id: 'team', label: 'Team', urls: teamImages, onChange: setTeamImages, emptyText: 'No team photos yet' },
        { id: 'cuisine', label: 'Cuisine', urls: cuisineImages, onChange: setCuisineImages, emptyText: 'No cuisine photos yet' },
    ];

    // ─── Dynamic amenity fields (isPublic + isActive + matches entity type) ─
    const publicFieldDefs = fieldDefs.filter(f =>
        f.isPublic && f.isActive && (f.targetType === 'both' || f.targetType === data.entityType)
    );
    // Exclude care/room-config fields already in Step 4
    const CARE_SLUGS = new Set(['level-of-care', 'bedroom-type', 'bedroom-types', 'bathroom-type', 'shower-type', 'room-type', 'room-price']);
    const amenityFields = publicFieldDefs.filter(f => !CARE_SLUGS.has(f.id));

    // ─── Step content ──────────────────────────────────────────────────────
    function renderStep() {
        switch (currentStepId) {

            case 'identity':
                return (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-[#239ddb]/5 border border-[#239ddb]/20 rounded-xl">
                            <div className="w-10 h-10 rounded-xl bg-[#239ddb]/10 flex items-center justify-center flex-shrink-0">
                                <FontAwesomeIcon
                                    icon={data!.entityType === 'home' ? faHouse : faBuilding}
                                    className="h-5 w-5 text-[#239ddb]"
                                />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#239ddb]">
                                    {data!.entityType === 'home' ? 'Care Home' : 'Facility'}
                                </p>
                                <p className="text-base font-bold text-gray-900 leading-tight">{data!.title}</p>
                            </div>
                        </div>

                        <LockedField label="Listing Name" value={data!.title} />

                        {data!.address && (
                            <LockedField
                                label="Address"
                                value={[data!.address.street, data!.address.city, data!.address.state, data!.address.zip]
                                    .filter(Boolean).join(', ')}
                            />
                        )}

                        {data!.taxonomyEntries.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-1.5 opacity-60" />
                                    Classification
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {data!.taxonomyEntries.map(entry => (
                                        <span key={entry.id} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 border border-gray-200 rounded-full px-3 py-1">
                                            {entry.parentName && <span className="text-gray-400">{entry.parentName} /</span>}
                                            {entry.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                            <FontAwesomeIcon icon={faCircleInfo} className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                            <p>These details are controlled by your account manager and cannot be changed here. Contact them if anything needs to be corrected.</p>
                        </div>
                    </div>
                );

            case 'description':
                return (
                    <div className="space-y-4">
                        <div>
                            <FieldLabel>Description</FieldLabel>
                            <textarea
                                rows={7}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className={`${fieldBase} resize-none`}
                                placeholder="Describe your listing — the environment, what makes it special, services offered, your philosophy of care…"
                            />
                            <p className="text-[11px] text-gray-400 mt-1">This is the main description shown on your listing page.</p>
                        </div>
                        <div>
                            <FieldLabel>Short Summary</FieldLabel>
                            <textarea
                                rows={3}
                                value={excerpt}
                                onChange={e => setExcerpt(e.target.value)}
                                className={`${fieldBase} resize-none`}
                                placeholder="A brief 1–2 sentence summary shown in search results…"
                            />
                            <p className="text-[11px] text-gray-400 mt-1">Appears in search result cards. Keep it under 160 characters.</p>
                        </div>
                    </div>
                );

            case 'contact':
                return (
                    <div className="space-y-4">
                        <div>
                            <FieldLabel>Phone Number</FieldLabel>
                            <div className="relative">
                                <FontAwesomeIcon icon={faPhone} className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className={`${fieldBase} pl-8`}
                                    placeholder="(808) 555-1234"
                                />
                            </div>
                        </div>
                        <div>
                            <FieldLabel>Email Address</FieldLabel>
                            <div className="relative">
                                <FontAwesomeIcon icon={faEnvelope} className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className={`${fieldBase} pl-8`}
                                    placeholder="contact@yourlisting.com"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'care':
                return (
                    <div className="space-y-4">
                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                            <FontAwesomeIcon icon={faLock} className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                            <p>Fields on this step lock after your first save and require your manager to change. Please fill them in carefully.</p>
                        </div>

                        {/* Level of care */}
                        <CareMultiSelect
                            label="Level of Care"
                            field="levelOfCare"
                            options={['Independent Living', 'Assisted Living', 'Memory Care', 'Skilled Nursing', 'Respite Care', 'Hospice Care']}
                            value={careFields.levelOfCare ?? []}
                            locked={!!locked.levelOfCare}
                            onChange={v => setCareFields(p => ({ ...p, levelOfCare: v }))}
                        />

                        {/* Room types */}
                        <CareMultiSelect
                            label="Room Types"
                            field="roomTypes"
                            options={['Studio', 'Private Room', 'Semi-Private', '1 Bedroom', '2 Bedroom', 'Suite']}
                            value={careFields.roomTypes ?? []}
                            locked={!!locked.roomTypes}
                            onChange={v => setCareFields(p => ({ ...p, roomTypes: v }))}
                        />

                        {/* Bedroom types */}
                        <CareMultiSelect
                            label="Bed Sizes"
                            field="bedroomTypes"
                            options={['Twin', 'Full', 'Queen', 'King']}
                            value={careFields.bedroomTypes ?? []}
                            locked={!!locked.bedroomTypes}
                            onChange={v => setCareFields(p => ({ ...p, bedroomTypes: v }))}
                        />

                        {/* Bathroom */}
                        <CareSingleSelect
                            label="Bathroom Type"
                            field="bathroomType"
                            options={['En-suite', 'Shared', 'Private', 'Jack and Jill']}
                            value={careFields.bathroomType ?? ''}
                            locked={!!locked.bathroomType}
                            onChange={v => setCareFields(p => ({ ...p, bathroomType: v }))}
                        />

                        {/* Shower */}
                        <CareSingleSelect
                            label="Shower Type"
                            field="showerType"
                            options={['Walk-in', 'Accessible', 'Standard', 'Roll-in']}
                            value={careFields.showerType ?? ''}
                            locked={!!locked.showerType}
                            onChange={v => setCareFields(p => ({ ...p, showerType: v }))}
                        />

                        {/* Room price */}
                        <div>
                            <FieldLabel locked={!!locked.roomPrice}>Monthly Rate (Starting)</FieldLabel>
                            {locked.roomPrice ? (
                                <LockedField label="" value={careFields.roomPrice ? `$${careFields.roomPrice}` : '—'} />
                            ) : (
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                    <input
                                        type="number"
                                        value={careFields.roomPrice ?? ''}
                                        onChange={e => setCareFields(p => ({ ...p, roomPrice: e.target.value }))}
                                        className={`${fieldBase} pl-7`}
                                        placeholder="3500"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'amenities':
                if (amenityFields.length === 0) {
                    return (
                        <div className="py-10 text-center text-gray-400">
                            <p className="text-sm">No additional amenity fields are configured yet.</p>
                            <p className="text-xs mt-1">Your manager can enable them in the admin panel.</p>
                        </div>
                    );
                }
                return (
                    <div className="space-y-4">
                        {amenityFields.map(field => (
                            <DynamicField
                                key={field.id}
                                field={field}
                                value={customFields[field.id]}
                                onChange={v => setCustomFields(p => ({ ...p, [field.id]: v }))}
                            />
                        ))}
                    </div>
                );

            case 'photos':
                return (
                    <PublicGallery
                        tabs={galleryTabs}
                        entitySlug={data!.slug}
                        disabled={isPending}
                    />
                );

            case 'videos':
                return (
                    <div className="space-y-4">
                        {videos.map((v, i) => (
                            <div key={i} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Video {i + 1}</p>
                                    <button
                                        type="button"
                                        onClick={() => setVideos(prev => prev.filter((_, idx) => idx !== i))}
                                        className="text-xs text-red-400 hover:text-red-600"
                                    >
                                        Remove
                                    </button>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">URL (YouTube or Vimeo)</label>
                                    <input
                                        type="url"
                                        value={v.url}
                                        onChange={e => setVideos(prev => prev.map((vv, idx) => idx === i ? { ...vv, url: e.target.value } : vv))}
                                        className={fieldBase}
                                        placeholder="https://youtube.com/watch?v=..."
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Caption (optional)</label>
                                    <input
                                        type="text"
                                        value={v.caption}
                                        onChange={e => setVideos(prev => prev.map((vv, idx) => idx === i ? { ...vv, caption: e.target.value } : vv))}
                                        className={fieldBase}
                                        placeholder="A tour of our common areas…"
                                    />
                                </div>
                            </div>
                        ))}
                        {!isPending && (
                            <button
                                type="button"
                                onClick={() => setVideos(prev => [...prev, { url: '', caption: '' }])}
                                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-[#239ddb] hover:text-[#239ddb] transition-colors"
                            >
                                <FontAwesomeIcon icon={faVideo} className="h-4 w-4" />
                                Add Video
                            </button>
                        )}
                    </div>
                );

            case 'review':
                return (
                    <div className="space-y-5">
                        {isPending && (
                            <div className="flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                                <FontAwesomeIcon icon={faCheck} className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold">Submitted for review</p>
                                    <p className="text-xs mt-0.5 text-green-600">Your listing update is awaiting approval from your account manager. You can continue editing and resubmit at any time.</p>
                                </div>
                            </div>
                        )}

                        {/* Summary rows */}
                        {[
                            { label: 'Listing Name', value: data!.title },
                            { label: 'Description', value: description ? `${description.slice(0, 100)}${description.length > 100 ? '…' : ''}` : '—' },
                            { label: 'Summary', value: excerpt || '—' },
                            { label: 'Phone', value: phone || '—' },
                            { label: 'Email', value: email || '—' },
                            { label: 'Level of Care', value: (careFields.levelOfCare ?? []).join(', ') || '—' },
                            { label: 'Room Types', value: (careFields.roomTypes ?? []).join(', ') || '—' },
                            { label: 'Monthly Rate', value: careFields.roomPrice ? `$${careFields.roomPrice}` : '—' },
                            { label: 'Gallery Photos', value: `${images.length} photo${images.length !== 1 ? 's' : ''}` },
                            { label: 'Team Photos', value: `${teamImages.length} photo${teamImages.length !== 1 ? 's' : ''}` },
                            { label: 'Videos', value: `${videos.filter(v => v.url).length} video${videos.filter(v => v.url).length !== 1 ? 's' : ''}` },
                        ].map(row => (
                            <div key={row.label} className="flex gap-4 py-2.5 border-b border-gray-100 last:border-0">
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-32 flex-shrink-0">{row.label}</span>
                                <span className="text-sm text-gray-700 flex-1">{row.value}</span>
                            </div>
                        ))}

                        {submitStatus === 'error' && (
                            <p className="text-xs text-red-500">Something went wrong. Please try again.</p>
                        )}
                        {submitStatus === 'submitted' && (
                            <p className="text-xs text-green-600 font-medium">Submitted! Your manager has been notified.</p>
                        )}

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitStatus === 'submitting' || submitStatus === 'submitted'}
                            className="w-full flex items-center justify-center gap-2 bg-[#239ddb] text-white text-sm font-bold uppercase tracking-wider py-3.5 rounded-xl hover:bg-[#1a7fb3] transition-colors disabled:opacity-50"
                        >
                            <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4" />
                            {submitStatus === 'submitting' ? 'Submitting…' : isPending ? 'Resubmit for Review' : 'Submit for Review'}
                        </button>
                        <p className="text-[11px] text-center text-gray-400">
                            Your manager will review your changes before they go live. You can keep editing after submitting.
                        </p>
                    </div>
                );

            default:
                return null;
        }
    }

    return (
        <div className="max-w-3xl mx-auto px-5 py-10">
            {/* Back link */}
            <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#239ddb] transition-colors mb-6">
                <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />
                Back to Profile
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{data.title}</h1>
                    <p className="text-sm text-gray-400 mt-0.5">
                        {data.entityType === 'home' ? 'Care Home' : 'Facility'} · Listing Profile
                    </p>
                </div>
                {isPending && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-3 py-1">
                        Pending Review
                    </span>
                )}
                {saveStatus === 'saved' && !isPending && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest bg-green-100 text-green-700 border border-green-200 rounded-full px-3 py-1 flex items-center gap-1">
                        <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />
                        Draft saved
                    </span>
                )}
            </div>

            {/* Step progress */}
            <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
                {STEPS.map((s, i) => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => setStep(i)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            i === step
                                ? 'bg-[#239ddb] text-white'
                                : i < step
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                    >
                        {i < step && <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />}
                        <span>{s.label}</span>
                    </button>
                ))}
            </div>

            {/* Step card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-bold text-gray-900">{STEPS[step].label}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Step {step + 1} of {STEPS.length}</p>
                </div>
                <div className="p-6">
                    {renderStep()}
                </div>
                {/* Navigation */}
                {currentStepId !== 'review' && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setStep(s => Math.max(0, s - 1))}
                            disabled={step === 0}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-colors"
                        >
                            <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />
                            Back
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
                            className="flex items-center gap-1.5 px-5 py-2 bg-[#239ddb] text-white text-sm font-bold rounded-lg hover:bg-[#1a7fb3] transition-colors"
                        >
                            {step === STEPS.length - 2 ? 'Review' : 'Next'}
                            <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function CareMultiSelect({ label, field, options, value, locked, onChange }: {
    label: string; field: string; options: string[]; value: string[]; locked: boolean;
    onChange: (v: string[]) => void;
}) {
    const toggle = (opt: string) => {
        if (locked) return;
        onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
    };
    return (
        <div>
            <FieldLabel locked={locked}>{label}</FieldLabel>
            <div className="flex flex-wrap gap-2">
                {options.map(opt => (
                    <button
                        key={opt}
                        type="button"
                        disabled={locked}
                        onClick={() => toggle(opt)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                            value.includes(opt)
                                ? 'bg-[#239ddb] text-white border-[#239ddb]'
                                : locked
                                ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-[#239ddb] hover:text-[#239ddb]'
                        }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
}

function CareSingleSelect({ label, field, options, value, locked, onChange }: {
    label: string; field: string; options: string[]; value: string; locked: boolean;
    onChange: (v: string) => void;
}) {
    return (
        <div>
            <FieldLabel locked={locked}>{label}</FieldLabel>
            <div className="flex flex-wrap gap-2">
                {options.map(opt => (
                    <button
                        key={opt}
                        type="button"
                        disabled={locked}
                        onClick={() => !locked && onChange(value === opt ? '' : opt)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                            value === opt
                                ? 'bg-[#239ddb] text-white border-[#239ddb]'
                                : locked
                                ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-[#239ddb] hover:text-[#239ddb]'
                        }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
}

function DynamicField({ field, value, onChange }: { field: RoomFieldDef; value: any; onChange: (v: any) => void }) {
    const base = 'w-full bg-gray-100 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#239ddb] focus:bg-white transition-colors';

    return (
        <div>
            <FieldLabel>{field.name}</FieldLabel>
            {field.type === 'boolean' && (
                <button
                    type="button"
                    onClick={() => onChange(!value)}
                    className={`text-xs px-4 py-2 rounded-lg border font-medium transition-colors ${
                        value ? 'bg-[#239ddb] text-white border-[#239ddb]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#239ddb]'
                    }`}
                >
                    {value ? 'Yes' : 'No'}
                </button>
            )}
            {(field.type === 'text' || field.type === 'phone' || field.type === 'email' || field.type === 'number' || field.type === 'currency') && (
                <input
                    type={field.type === 'number' || field.type === 'currency' ? 'number' : field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                    value={value ?? ''}
                    onChange={e => onChange(e.target.value)}
                    className={base}
                />
            )}
            {field.type === 'textarea' && (
                <textarea rows={3} value={value ?? ''} onChange={e => onChange(e.target.value)} className={`${base} resize-none`} />
            )}
            {(field.type === 'single' || field.type === 'dropdown') && (
                <div className="flex flex-wrap gap-2">
                    {(field.options ?? []).map(opt => (
                        <button key={opt} type="button" onClick={() => onChange(value === opt ? '' : opt)}
                            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                                value === opt ? 'bg-[#239ddb] text-white border-[#239ddb]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#239ddb]'
                            }`}>
                            {opt}
                        </button>
                    ))}
                </div>
            )}
            {field.type === 'multi' && (
                <div className="flex flex-wrap gap-2">
                    {(field.options ?? []).map(opt => {
                        const arr: string[] = Array.isArray(value) ? value : [];
                        const active = arr.includes(opt);
                        return (
                            <button key={opt} type="button"
                                onClick={() => onChange(active ? arr.filter(v => v !== opt) : [...arr, opt])}
                                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                                    active ? 'bg-[#239ddb] text-white border-[#239ddb]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#239ddb]'
                                }`}>
                                {opt}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
