'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faBookOpen, faHandsHolding, faUsers, faHeart, faNewspaper, faUtensils, faBook } from '@fortawesome/free-solid-svg-icons';
import { POST_TYPE_CONFIG } from '@/lib/post-type-config';

const ICON_MAP: Record<string, typeof faBookOpen> = {
    faHandsHolding: faHandsHolding,
    faUsers: faUsers,
    faHeart: faHeart,
    faNewspaper: faNewspaper,
    faUtensils: faUtensils,
    faBook: faBook,
};

interface ResourcesModalProps {
    onClose: () => void;
}

export function ResourcesModal({ onClose }: ResourcesModalProps) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[200] bg-white/50 backdrop-blur-md flex flex-col pt-14" onClick={onClose}>
            {/* Full-width blue top bar */}
            <div className="absolute top-0 inset-x-0 h-14 bg-[#239ddb] flex items-center justify-center px-4 shadow-md z-10" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 text-white font-bold tracking-widest uppercase text-sm">
                    <FontAwesomeIcon icon={faBookOpen} className="h-5 w-5" />
                    Resources
                </div>
                <button
                    onClick={onClose}
                    className="absolute right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    aria-label="Close"
                >
                    <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
                </button>
            </div>

            {/* Scrolling card */}
            <div className="modal-content-slide-in flex-1 overflow-y-auto w-full pb-6">
                <div className="max-w-[480px] mx-5 sm:mx-auto bg-white pt-6 px-6 shadow-[0_8px_30px_rgba(0,0,0,0.15)] rounded-b-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

                    <div className="flex flex-col gap-2">
                        {POST_TYPE_CONFIG.map(pt => {
                            const icon = ICON_MAP[pt.icon] ?? faBook;
                            return (
                                <Link
                                    key={pt.postType}
                                    href={`/resources/${pt.slug}`}
                                    onClick={onClose}
                                    className="group w-full text-left rounded-xl p-3 bg-white shadow-sm hover:shadow-md transition-shadow flex items-start gap-3"
                                >
                                    <div className="flex-none w-9 h-9 rounded-lg flex items-center justify-center bg-gray-100 group-hover:bg-[#239ddb] transition-colors">
                                        <FontAwesomeIcon icon={icon} className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <span className="block font-semibold text-sm leading-snug mb-0.5 text-gray-800 group-hover:text-[#239ddb] transition-colors">{pt.label}</span>
                                        <span className="block text-xs text-gray-400 leading-snug">{pt.description}</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="-mx-6 px-6 pt-4 pb-6 mt-2 bg-gray-100 rounded-b-2xl">
                        <Link
                            href="/resources"
                            onClick={onClose}
                            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-[#239ddb] transition-colors"
                        >
                            <span className="flex items-center justify-center w-5 h-5 rounded bg-[#239ddb] shrink-0">
                                <FontAwesomeIcon icon={faBookOpen} className="h-3 w-3 text-white" />
                            </span>
                            View All Resources
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
