'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareNodes } from '@fortawesome/free-solid-svg-icons';

interface ShareButtonProps {
    url: string;
    title: string;
    image?: string;
}

export function ShareButton({ url, title }: ShareButtonProps) {
    async function handleShare() {
        if (navigator.share) {
            try { await navigator.share({ title, url }); } catch { /* cancelled */ }
        } else {
            await navigator.clipboard.writeText(url);
            alert('Link copied to clipboard!');
        }
    }

    return (
        <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-500 bg-white text-xs rounded hover:border-[#239ddb] hover:text-[#239ddb] transition-colors uppercase tracking-wider"
            aria-label="Share"
        >
            <FontAwesomeIcon icon={faShareNodes} className="h-3.5 w-3.5" />
            Share
        </button>
    );
}
