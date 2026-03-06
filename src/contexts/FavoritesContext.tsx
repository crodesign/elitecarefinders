'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClientComponentClient } from '@/lib/supabase';
import {
    readFavoritesCookie,
    clearFavoritesCookie,
    addToCookie,
    removeFromCookie,
} from '@/lib/favorites-cookie';
import type { Favorite } from '@/types';

interface FavoritesContextType {
    favorites: Favorite[];
    isFavorited: (type: string, entityId: string) => boolean;
    toggleFavorite: (item: Omit<Favorite, 'id' | 'createdAt'>) => void;
    isLoading: boolean;
    user: User | null;
    openAuthModal: () => void;
    openSavedModal: () => void;
    signOut: () => void;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function useFavorites() {
    const ctx = useContext(FavoritesContext);
    if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
    return ctx;
}

interface FavoritesProviderProps {
    children: React.ReactNode;
    onOpenAuthModal: () => void;
    onOpenSavedModal: () => void;
}

export function FavoritesProvider({ children, onOpenAuthModal, onOpenSavedModal }: FavoritesProviderProps) {
    const supabase = createClientComponentClient();
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const mergedRef = useRef(false);

    const fetchFromDB = useCallback(async () => {
        const res = await fetch('/api/favorites');
        if (res.ok) {
            const data = await res.json();
            setFavorites(data);
        }
    }, []);

    const mergeCookieToDB = useCallback(async () => {
        if (mergedRef.current) return;
        mergedRef.current = true;
        const cookieItems = readFavoritesCookie();
        if (cookieItems.length > 0) {
            await fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: cookieItems }),
            });
            clearFavoritesCookie();
        }
    }, []);

    // Initial auth check
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
            if (user) {
                fetchFromDB().finally(() => setIsLoading(false));
            } else {
                setFavorites(readFavoritesCookie());
                setIsLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            const nextUser = session?.user ?? null;
            setUser(nextUser);

            if (nextUser) {
                mergedRef.current = false;
                await mergeCookieToDB();
                await fetchFromDB();
            } else {
                setFavorites(readFavoritesCookie());
            }
        });

        return () => subscription.unsubscribe();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const isFavorited = useCallback((type: string, entityId: string) => {
        return favorites.some(f => f.type === type && f.entityId === entityId);
    }, [favorites]);

    const toggleFavorite = useCallback(async (item: Omit<Favorite, 'id' | 'createdAt'>) => {
        const alreadySaved = favorites.some(f => f.type === item.type && f.entityId === item.entityId);

        if (user) {
            // Optimistic update
            if (alreadySaved) {
                setFavorites(prev => prev.filter(f => !(f.type === item.type && f.entityId === item.entityId)));
                await fetch(`/api/favorites?type=${item.type}&entityId=${item.entityId}`, { method: 'DELETE' });
            } else {
                setFavorites(prev => [...prev, { ...item }]);
                await fetch('/api/favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item),
                });
            }
        } else {
            // Guest: use cookie
            if (alreadySaved) {
                removeFromCookie(item.type, item.entityId);
                setFavorites(prev => prev.filter(f => !(f.type === item.type && f.entityId === item.entityId)));
            } else {
                addToCookie(item);
                setFavorites(prev => [...prev, { ...item }]);
            }
        }
    }, [favorites, user]);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        setFavorites([]);
    }, [supabase]);

    return (
        <FavoritesContext.Provider value={{
            favorites,
            isFavorited,
            toggleFavorite,
            isLoading,
            user,
            openAuthModal: onOpenAuthModal,
            openSavedModal: onOpenSavedModal,
            signOut,
        }}>
            {children}
        </FavoritesContext.Provider>
    );
}
