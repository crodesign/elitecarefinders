'use client';

import { useState } from 'react';
import { AlertTriangle, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

interface DraftField {
    key: string;
    label: string;
    value: any;
}

interface DraftApprovalBannerProps {
    entityId: string;
    entityType: 'home' | 'facility';
    draft: Record<string, any>;
    onApprove: () => Promise<void>;
    onReject: () => Promise<void>;
}

const FIELD_LABELS: Record<string, string> = {
    description: 'Description',
    excerpt: 'Summary',
    phone: 'Phone',
    email: 'Email',
    images: 'Gallery Photos',
    teamImages: 'Team Photos',
    cuisineImages: 'Cuisine Photos',
    videos: 'Videos',
    levelOfCare: 'Level of Care',
    bedroomTypes: 'Bed Sizes',
    bathroomType: 'Bathroom Type',
    showerType: 'Shower Type',
    roomTypes: 'Room Types',
    roomPrice: 'Monthly Rate',
    customFields: 'Amenity Fields',
};

function formatValue(key: string, value: any): string {
    if (Array.isArray(value)) {
        if (key === 'images' || key === 'teamImages' || key === 'cuisineImages') {
            return `${value.length} photo${value.length !== 1 ? 's' : ''}`;
        }
        if (key === 'videos') {
            return `${value.filter((v: any) => v.url).length} video${value.filter((v: any) => v.url).length !== 1 ? 's' : ''}`;
        }
        return value.join(', ') || '—';
    }
    if (typeof value === 'object' && value !== null) {
        return `${Object.keys(value).length} field${Object.keys(value).length !== 1 ? 's' : ''}`;
    }
    if (key === 'roomPrice') return value ? `$${value}/mo` : '—';
    return String(value ?? '—');
}

export function DraftApprovalBanner({ entityId, entityType, draft, onApprove, onReject }: DraftApprovalBannerProps) {
    const [expanded, setExpanded] = useState(false);
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [done, setDone] = useState<'approved' | 'rejected' | null>(null);

    const draftFields: DraftField[] = Object.entries(draft)
        .filter(([key]) => key in FIELD_LABELS)
        .map(([key, value]) => ({ key, label: FIELD_LABELS[key] ?? key, value }));

    const handleApprove = async () => {
        setApproving(true);
        await onApprove();
        setDone('approved');
        setApproving(false);
    };

    const handleReject = async () => {
        setRejecting(true);
        await onReject();
        setDone('rejected');
        setRejecting(false);
    };

    if (done === 'approved') {
        return (
            <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                <Check className="h-4 w-4 flex-shrink-0" />
                Draft approved and applied to listing.
            </div>
        );
    }

    if (done === 'rejected') {
        return (
            <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">
                <X className="h-4 w-4 flex-shrink-0" />
                Draft rejected and cleared.
            </div>
        );
    }

    return (
        <div className="mx-4 mt-4 border border-amber-300 bg-amber-50 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800">Pending listing update from local user</p>
                    <p className="text-xs text-amber-600 mt-0.5">{draftFields.length} field{draftFields.length !== 1 ? 's' : ''} submitted for review</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => setExpanded(v => !v)}
                        className="text-xs text-amber-700 hover:text-amber-900 flex items-center gap-1 transition-colors"
                    >
                        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {expanded ? 'Hide' : 'Review'}
                    </button>
                    <button
                        type="button"
                        onClick={handleReject}
                        disabled={rejecting || approving}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                    >
                        {rejecting ? '…' : 'Reject'}
                    </button>
                    <button
                        type="button"
                        onClick={handleApprove}
                        disabled={approving || rejecting}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
                    >
                        {approving ? '…' : 'Approve'}
                    </button>
                </div>
            </div>

            {/* Expandable draft preview */}
            {expanded && (
                <div className="border-t border-amber-200 px-4 py-3 space-y-2 bg-white/60">
                    {draftFields.map(f => (
                        <div key={f.key} className="flex gap-3 text-xs">
                            <span className="text-gray-500 w-32 flex-shrink-0">{f.label}</span>
                            <span className="text-gray-800 flex-1 break-words">
                                {f.key === 'description' || f.key === 'excerpt'
                                    ? String(f.value ?? '').slice(0, 120) + (String(f.value ?? '').length > 120 ? '…' : '')
                                    : formatValue(f.key, f.value)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
