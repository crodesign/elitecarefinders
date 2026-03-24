'use client';

import { createContext, useContext, useTransition } from 'react';
import type { ReactNode } from 'react';

interface FilterPendingContextValue {
    isPending: boolean;
    startFilterTransition: (fn: () => void) => void;
}

const FilterPendingContext = createContext<FilterPendingContextValue>({
    isPending: false,
    startFilterTransition: fn => fn(),
});

export function FilterPendingProvider({ children }: { children: ReactNode }) {
    const [isPending, startTransition] = useTransition();
    return (
        <FilterPendingContext.Provider value={{ isPending, startFilterTransition: startTransition }}>
            {children}
        </FilterPendingContext.Provider>
    );
}

export function useFilterPending() {
    return useContext(FilterPendingContext);
}
