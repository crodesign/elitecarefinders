'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareNodes } from '@fortawesome/free-solid-svg-icons';

export function MobileShareButton() {
    async function handleShare() {
        const shareData = {
            title: "Elite CareFinders — Hawaii's Most Trusted Senior Living Advisors",
            text: 'Free RN-led consultation to help Hawaii families find trusted senior care homes and communities.',
            url: 'https://elitecarefinders.com',
        };
        if (navigator.share) {
            try { await navigator.share(shareData); } catch { /* cancelled */ }
        } else {
            await navigator.clipboard.writeText(shareData.url);
            alert('Link copied to clipboard!');
        }
    }

    return (
        <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border-2 border-gray-300 rounded-lg px-3 py-1.5 hover:border-[#239ddb] hover:text-[#239ddb] transition-colors bg-white"
        >
            <FontAwesomeIcon icon={faShareNodes} className="h-3.5 w-3.5" />
            Share
        </button>
    );
}
