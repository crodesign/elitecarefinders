'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as faHeartOutline } from '@fortawesome/free-regular-svg-icons';
import { useFavorites } from '@/contexts/FavoritesContext';
import type { Favorite } from '@/types';

interface FavoriteButtonProps {
    type: Favorite['type'];
    entityId: string;
    entitySlug: string;
    entityTitle?: string;
    entityImage?: string;
    className?: string;
    iconOnly?: boolean;
}

export function FavoriteButton({ type, entityId, entitySlug, entityTitle, entityImage, className = '', iconOnly }: FavoriteButtonProps) {
    const { isFavorited, toggleFavorite, user, openAuthModal } = useFavorites();
    const [pending, setPending] = useState(false);
    const saved = isFavorited(type, entityId);

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (pending) return;
        if (!user && !saved) {
            openAuthModal();
            return;
        }
        setPending(true);
        await toggleFavorite({ type, entityId, entitySlug, entityTitle, entityImage });
        setPending(false);
    };

    if (iconOnly) {
        return (
            <button
                type="button"
                onClick={handleClick}
                disabled={pending}
                className={`flex items-center justify-center p-1.5 rounded-md bg-white shadow-sm transition-colors disabled:opacity-50 group/btn ${className}`}
                aria-label={saved ? 'Remove from favorites' : 'Add to favorites'}
            >
                <FontAwesomeIcon
                    icon={saved ? faHeart : faHeartOutline}
                    className={`h-4 w-4 transition-colors ${saved ? 'text-rose-500' : 'text-gray-400 group-hover/btn:text-rose-400'}`}
                />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={pending}
            className={`flex items-center gap-2 px-4 py-2 border-2 text-xs rounded uppercase tracking-wider transition-colors disabled:opacity-50 ${
                saved
                    ? 'border-[#239ddb] bg-[#239ddb] text-white hover:bg-[#1a7fb3] hover:border-[#1a7fb3]'
                    : 'border-[#239ddb] text-[#239ddb] bg-white hover:bg-[#239ddb] hover:text-white'
            } ${className}`}
            aria-label={saved ? 'Remove from favorites' : 'Add to favorites'}
        >
            <FontAwesomeIcon icon={saved ? faHeart : faHeartOutline} className="h-3.5 w-3.5" />
            {saved ? 'Saved' : 'Save'}
        </button>
    );
}
