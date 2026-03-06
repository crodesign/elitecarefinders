'use client';

import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareNodes, faEnvelope, faLink, faCheck } from '@fortawesome/free-solid-svg-icons';
import { faFacebookF, faXTwitter, faPinterestP, faLinkedinIn } from '@fortawesome/free-brands-svg-icons';

interface ShareButtonProps {
    url: string;
    title: string;
    image?: string;
}

const POPUP_OPTS = 'width=600,height=600,left=200,top=100,noopener,noreferrer';

export function ShareButton({ url, title, image }: ShareButtonProps) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const enc = encodeURIComponent;

    const options = [
        {
            label: 'Facebook',
            icon: faFacebookF,
            color: '#1877F2',
            action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, '_blank', POPUP_OPTS),
        },
        {
            label: 'X / Twitter',
            icon: faXTwitter,
            color: '#000000',
            action: () => window.open(`https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`, '_blank', POPUP_OPTS),
        },
        {
            label: 'Pinterest',
            icon: faPinterestP,
            color: '#E60023',
            action: () => {
                const base = `https://pinterest.com/pin/create/button/?url=${enc(url)}&description=${enc(title)}`;
                const pinUrl = image ? `${base}&media=${enc(image)}` : base;
                window.open(pinUrl, '_blank', POPUP_OPTS);
            },
        },
        {
            label: 'LinkedIn',
            icon: faLinkedinIn,
            color: '#0A66C2',
            action: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, '_blank', POPUP_OPTS),
        },
        {
            label: 'Email',
            icon: faEnvelope,
            color: '#6B7280',
            action: () => { window.location.href = `mailto:?subject=${enc(title)}&body=${enc(url)}`; setOpen(false); },
        },
        {
            label: copied ? 'Copied!' : 'Copy Link',
            icon: copied ? faCheck : faLink,
            color: copied ? '#239ddb' : '#6B7280',
            action: () => {
                navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => { setCopied(false); setOpen(false); }, 1500);
            },
        },
    ];

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-500 bg-white text-xs rounded hover:border-[#239ddb] hover:text-[#239ddb] transition-colors uppercase tracking-wider"
                aria-label="Share options"
            >
                <FontAwesomeIcon icon={faShareNodes} className="h-3.5 w-3.5" />
                Share
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-lg border-2 border-gray-100 p-[5px] z-50">
                    {options.map(opt => (
                        <button
                            key={opt.label}
                            type="button"
                            onClick={opt.action}
                            className="group flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <FontAwesomeIcon
                                icon={opt.icon}
                                className="h-3.5 w-3.5 flex-shrink-0 text-gray-400 group-hover:text-[#239ddb] transition-colors"
                            />
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
