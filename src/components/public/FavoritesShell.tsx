'use client';

import { useState } from 'react';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { AuthModal } from '@/components/public/AuthModal';
import { SavedModal } from '@/components/public/SavedModal';

export function FavoritesShell({ children }: { children: React.ReactNode }) {
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [savedModalOpen, setSavedModalOpen] = useState(false);

    return (
        <FavoritesProvider
            onOpenAuthModal={() => setAuthModalOpen(true)}
            onOpenSavedModal={() => setSavedModalOpen(true)}
        >
            {children}
            {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
            {savedModalOpen && <SavedModal onClose={() => setSavedModalOpen(false)} />}
        </FavoritesProvider>
    );
}
