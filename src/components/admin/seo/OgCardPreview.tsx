interface OgCardPreviewProps {
    title: string;
    description: string;
    imageUrl?: string;
    siteName?: string;
}

export function OgCardPreview({ title, description, imageUrl, siteName = 'elitecarefinders.com' }: OgCardPreviewProps) {
    const displayTitle = title || 'Social share title will appear here';
    const displayDesc = description || 'Social share description will appear here.';

    return (
        <div className="rounded-lg border border-ui-border overflow-hidden">
            <p className="text-[9px] font-bold uppercase tracking-widest text-content-muted px-3 pt-2 pb-1.5 bg-surface-well">
                Social Card Preview
            </p>
            <div className="bg-surface-input">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt="OG preview"
                        className="w-full h-32 object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                ) : (
                    <div className="w-full h-28 bg-surface-hover flex items-center justify-center">
                        <span className="text-[11px] text-content-muted">No image — main image will be used</span>
                    </div>
                )}
                <div className="px-3 py-2 border-t border-ui-border">
                    <p className="text-[10px] text-content-muted uppercase mb-0.5 tracking-wide">{siteName}</p>
                    <p className={`text-[13px] font-semibold leading-snug mb-0.5 ${title ? 'text-content-primary' : 'text-content-muted'}`}>
                        {displayTitle.length > 60 ? displayTitle.slice(0, 60) + '…' : displayTitle}
                    </p>
                    <p className="text-[12px] text-content-secondary leading-snug">
                        {displayDesc.length > 100 ? displayDesc.slice(0, 100) + '…' : displayDesc}
                    </p>
                </div>
            </div>
        </div>
    );
}
