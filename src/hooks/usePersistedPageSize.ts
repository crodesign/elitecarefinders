import { useState } from "react";

const KEY = "admin_page_size";
const DEFAULT = 25;

export function usePersistedPageSize(): [number, (size: number) => void] {
    const [pageSize, setPageSizeState] = useState<number>(() => {
        if (typeof window === "undefined") return DEFAULT;
        const stored = parseInt(localStorage.getItem(KEY) || "", 10);
        return isNaN(stored) ? DEFAULT : stored;
    });

    const setPageSize = (size: number) => {
        localStorage.setItem(KEY, String(size));
        setPageSizeState(size);
    };

    return [pageSize, setPageSize];
}
