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
                <div className="max-w-[480px] mx-5 sm:mx-auto bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.15)] rounded-b-2xl" onClick={e => e.stopPropagation()}>

                    <ul className="space-y-1">
                        {POST_TYPE_CONFIG.map(pt => {
                            const icon = ICON_MAP[pt.icon] ?? faBook;
                            return (
                                <li key={pt.postType}>
                                    <Link
                                        href={`/resources/${pt.slug}`}
                                        onClick={onClose}
                                        className="group flex items-start gap-3 py-2.5 px-3 -mx-3 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <span className="flex items-center justify-center w-7 h-7 rounded-md bg-[#239ddb]/10 text-[#239ddb] shrink-0 mt-0.5 group-hover:bg-[#239ddb] group-hover:text-white transition-colors">
                                            <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" />
                                        </span>
                                        <span>
                                            <span className="block text-sm font-semibold text-gray-800 group-hover:text-[#239ddb] transition-colors">{pt.label}</span>
                                            <span className="block text-xs text-gray-400 mt-0.5">{pt.description}</span>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    <div className="pt-4 mt-2 border-t border-gray-100">
                        <Link
                            href="/resources"
                            onClick={onClose}
                            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-[#239ddb] transition-colors"
                        >
                            <span className="flex items-center justify-center w-5 h-5 rounded bg-[#239ddb] shrink-0">
                                <FontAwesomeIcon icon={faBookOpen} className="h-3 w-3 text-white" />
                            </span>
                            All Resources
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
