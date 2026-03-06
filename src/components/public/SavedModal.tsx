'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faHeart, faHouse, faBuilding, faFileAlt, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useFavorites } from '@/contexts/FavoritesContext';
import type { Favorite } from '@/types';

type Tab = 'all' | 'home' | 'facility' | 'post';

const ENTITY_PATHS: Record<Favorite['type'], string> = {
    home: '/homes',
    facility: '/facilities',
    post: '/blog',
};

const TAB_ICONS = {
    all: faHeart,
    home: faHouse,
    facility: faBuilding,
    post: faFileAlt,
};

function SavedCard({ item, onRemove, onClose }: { item: Favorite; onRemove: () => void; onClose: () => void }) {
    const path = `${ENTITY_PATHS[item.type]}/${item.entitySlug}`;
    return (
        <div className="group relative bg-gray-100 rounded-xl overflow-hidden border border-gray-100 hover:border-[#239ddb]/30 transition-colors">
            <Link href={path} onClick={onClose} className="block aspect-square bg-gray-200 overflow-hidden">
                {item.entityImage ? (
                    <img
                        src={item.entityImage}
                        alt={item.entityTitle ?? ''}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <FontAwesomeIcon icon={TAB_ICONS[item.type]} className="h-8 w-8 text-gray-300" />
                    </div>
                )}
            </Link>
            <div className="p-3">
                <Link href={path} onClick={onClose} className="block text-sm text-gray-800 hover:text-[#239ddb] transition-colors line-clamp-2 leading-tight">
                    {item.entityTitle ?? item.entitySlug}
                </Link>
            </div>
            <button
                type="button"
                onClick={onRemove}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 text-gray-400 hover:text-red-500 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
                aria-label="Remove from saved"
            >
                <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
            </button>
        </div>
    );
}

export function SavedModal({ onClose }: { onClose: () => void }) {
    const { favorites, toggleFavorite } = useFavorites();
    const [tab, setTab] = useState<Tab>('all');

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const filtered = tab === 'all' ? favorites : favorites.filter(f => f.type === tab);
    const counts = {
        all: favorites.length,
        home: favorites.filter(f => f.type === 'home').length,
        facility: favorites.filter(f => f.type === 'facility').length,
        post: favorites.filter(f => f.type === 'post').length,
    };

    return (
        <div className="fixed inset-0 z-[200] bg-white/50 backdrop-blur-md flex flex-col pt-14" onClick={onClose}>
            {/* Top bar */}
            <div className="absolute top-0 inset-x-0 h-14 bg-[#239ddb] flex items-center justify-center px-4 shadow-md z-10" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 text-white font-bold tracking-widest uppercase text-sm">
                    <FontAwesomeIcon icon={faHeart} className="h-5 w-5" />
                    My Saved
                </div>
                <button
                    onClick={onClose}
                    className="absolute right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    aria-label="Close"
                >
                    <FontAwesomeIcon icon={faXmark} className="h-6 w-6" />
                </button>
            </div>

            {/* Scrolling content */}
            <div className="modal-content-slide-in flex-1 overflow-y-auto w-full pb-6">
                <div className="max-w-[640px] mx-5 sm:mx-auto bg-white shadow-[0_8px_30px_rgba(0,0,0,0.15)] rounded-b-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                    {/* Tabs */}
                    <div className="border-b-[6px] border-[#f3f4f6]">
                        <div className="flex justify-center items-start overflow-visible gap-1 pt-2 px-2">
                            {(['all', 'home', 'facility', 'post'] as Tab[]).map(t => {
                                const isActive = tab === t;
                                const tabColor = '#f3f4f6';
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setTab(t)}
                                        className={`relative flex items-center gap-2 px-4 text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
                                            isActive
                                                ? 'pt-[10px] pb-[11px] text-gray-900 z-10 rounded-tl-lg rounded-tr-lg'
                                                : 'pt-2 pb-2 bg-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg border-2 border-gray-100'
                                        }`}
                                        style={isActive ? { backgroundColor: tabColor } : undefined}
                                    >
                                        {isActive && (
                                            <span className="absolute bottom-0 left-[-8px] w-2 h-2 pointer-events-none">
                                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M8 0 L8 8 L0 8 A 8 8 0 0 0 8 0 Z" fill={tabColor} />
                                                </svg>
                                            </span>
                                        )}
                                        <FontAwesomeIcon icon={TAB_ICONS[t]} className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-[#239ddb]' : ''}`} />
                                        <span className="hidden sm:inline">{t === 'all' ? 'All' : t === 'home' ? 'Homes' : t === 'facility' ? 'Facilities' : 'Posts'}</span>
                                        <span className={`text-[10px] px-1.5 py-px rounded font-bold ${isActive ? 'bg-[#239ddb] text-white' : 'bg-gray-200 text-gray-500'} `}>
                                            {counts[t]}
                                        </span>
                                        {isActive && (
                                            <span className="absolute bottom-0 right-[-8px] w-2 h-2 pointer-events-none">
                                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M0 0 L0 8 L8 8 A 8 8 0 0 1 0 0 Z" fill={tabColor} />
                                                </svg>
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="p-5">
                        {filtered.length === 0 ? (
                            <div className="py-16 text-center">
                                <FontAwesomeIcon icon={faHeart} className="h-10 w-10 text-gray-200 mb-4" />
                                <p className="text-gray-400 text-sm">No saved {tab === 'all' ? 'items' : tab + 's'} yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {filtered.map(item => (
                                    <SavedCard
                                        key={`${item.type}-${item.entityId}`}
                                        item={item}
                                        onClose={onClose}
                                        onRemove={() => toggleFavorite({
                                            type: item.type,
                                            entityId: item.entityId,
                                            entitySlug: item.entitySlug,
                                            entityTitle: item.entityTitle,
                                            entityImage: item.entityImage,
                                        })}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
