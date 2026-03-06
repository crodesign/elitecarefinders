'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { useFavorites } from '@/contexts/FavoritesContext';

export function MySavedButton() {
    const { openSavedModal } = useFavorites();
    return (
        <button
            type="button"
            onClick={openSavedModal}
            className="flex items-center gap-2 px-4 py-2 border-2 border-[#239ddb] text-[#239ddb] bg-white text-xs rounded hover:bg-[#239ddb] hover:text-white transition-colors uppercase tracking-wider"
        >
            My Saved <FontAwesomeIcon icon={faHeart} className="h-3.5 w-3.5" />
        </button>
    );
}
