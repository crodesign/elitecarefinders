"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Check } from "lucide-react";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange?: (itemsPerPage: number) => void;
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function Pagination({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
}: PaginationProps) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-ui-border bg-surface-card">
            <div className="flex items-center gap-4">
                {/* Desktop: Full description */}
                <span className="hidden md:inline text-sm text-content-secondary">
                    {startItem}-{endItem} of {totalItems}
                </span>
                {/* Mobile: Just total count */}
                <span className="md:hidden text-sm text-content-secondary">
                    {totalItems}
                </span>

                {/* Items per page - hidden on mobile */}
                {onItemsPerPageChange && (
                    <div className="relative hidden md:block" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="form-input flex items-center gap-2 px-3 py-1.5 text-xs h-8 min-w-[150px]"
                        >
                            <span className="flex-1 text-left text-content-primary">{itemsPerPage} per page</span>
                            <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 text-content-muted ${dropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {dropdownOpen && (
                            <div className="dropdown-menu absolute left-0 bottom-full mb-1 w-full min-w-[150px] z-50 p-1">
                                {PER_PAGE_OPTIONS.map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => {
                                            onItemsPerPageChange(opt);
                                            setDropdownOpen(false);
                                        }}
                                        className={`dropdown-item w-full rounded text-xs ${itemsPerPage === opt ? "active" : ""}`}
                                    >
                                        <span className="flex-1">{opt} per page</span>
                                        {itemsPerPage === opt && (
                                            <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center">
                                                <Check className="h-2.5 w-2.5 text-white" />
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1 md:gap-2">
                {/* Previous Button */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Previous Page"
                    className="flex items-center justify-center p-1.5 bg-surface-input text-content-primary rounded hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Page Numbers - hidden on mobile */}
                <div className="hidden md:flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                            pageNum = i + 1;
                        } else if (currentPage <= 3) {
                            pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                        } else {
                            pageNum = currentPage - 2 + i;
                        }

                        return (
                            <button
                                key={pageNum}
                                onClick={() => onPageChange(pageNum)}
                                className={`px-3 py-1.5 text-sm rounded transition-colors ${currentPage === pageNum
                                    ? "bg-accent text-white font-medium"
                                    : "bg-surface-input text-content-primary hover:bg-surface-hover"
                                    }`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                {/* Mobile: Current page indicator */}
                <span className="md:hidden text-sm text-content-secondary px-2">
                    {currentPage} / {totalPages}
                </span>

                {/* Next Button */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Next Page"
                    className="flex items-center justify-center p-1.5 bg-surface-input text-content-primary rounded hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
