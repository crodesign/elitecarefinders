interface SerpPreviewProps {
    title: string;
    description: string;
    url: string;
}

export function SerpPreview({ title, description, url }: SerpPreviewProps) {
    const displayTitle = title || 'Page title will appear here';
    const displayDesc = description || 'Meta description will appear here. Write 140–160 characters to fill this space with useful, click-worthy content about the page.';

    const titleOver = title.length > 60;
    const descOver = description.length > 160;

    const breadcrumb = url
        ? url.replace(/^https?:\/\//, '').replace(/\//g, ' › ')
        : 'www.elitecarefinders.com › …';

    return (
        <div className="rounded-lg border border-ui-border overflow-hidden">
            <p className="text-[9px] font-bold uppercase tracking-widest text-content-muted px-3 pt-2 pb-1.5 bg-surface-well">
                Google Preview
            </p>
            <div className="bg-surface-input px-3 py-3">
                <p className="text-[11px] text-emerald-500 truncate mb-0.5">{breadcrumb}</p>
                <p className={`text-[18px] leading-snug mb-1 hover:underline cursor-default ${title ? 'text-accent' : 'text-content-muted'}`}>
                    {displayTitle.length > 60 ? displayTitle.slice(0, 60) + '…' : displayTitle}
                    {titleOver && (
                        <span className="ml-1.5 text-[10px] text-amber-500 font-mono no-underline">{title.length}/60</span>
                    )}
                </p>
                <p className="text-[13px] text-content-secondary leading-relaxed">
                    {displayDesc.length > 160 ? displayDesc.slice(0, 160) + '…' : displayDesc}
                    {descOver && (
                        <span className="ml-1.5 text-[10px] text-amber-500 font-mono">{description.length}/160</span>
                    )}
                </p>
            </div>
        </div>
    );
}
