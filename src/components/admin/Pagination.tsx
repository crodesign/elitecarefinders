"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange?: (itemsPerPage: number) => void;
}

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

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-[#0b1115]">
            <div className="flex items-center gap-4">
                {/* Desktop: Full description */}
                <span className="hidden md:inline text-sm text-zinc-400">
                    Showing <span className="text-white font-medium">{startItem}</span> to{" "}
                    <span className="text-white font-medium">{endItem}</span> of{" "}
                    <span className="text-white font-medium">{totalItems}</span> entries
                </span>
                {/* Mobile: Just total count */}
                <span className="md:hidden text-sm text-zinc-400">
                    <span className="text-white font-medium">{totalItems}</span> items
                </span>

                {/* Items per page - hidden on mobile */}
                {onItemsPerPageChange && (
                    <select
                        value={itemsPerPage}
                        onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                        className="hidden md:block appearance-none cursor-pointer text-xs text-zinc-300 hover:text-white bg-[#1a1f2e] border border-white/10 rounded-md px-3 py-1.5 pr-7 focus:outline-none focus:border-accent/50 transition-colors"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 8px center',
                        }}
                    >
                        <option value={10} className="bg-[#1a1f2e]">10 per page</option>
                        <option value={25} className="bg-[#1a1f2e]">25 per page</option>
                        <option value={50} className="bg-[#1a1f2e]">50 per page</option>
                        <option value={100} className="bg-[#1a1f2e]">100 per page</option>
                    </select>
                )}
            </div>

            <div className="flex items-center gap-1 md:gap-2">
                {/* Previous Button */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-2 md:px-3 py-1.5 text-sm text-white border border-white/10 rounded hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden md:inline">Previous</span>
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
                                    : "text-white border border-white/10 hover:bg-white/5"
                                    }`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                {/* Mobile: Current page indicator */}
                <span className="md:hidden text-sm text-zinc-400 px-2">
                    {currentPage} / {totalPages}
                </span>

                {/* Next Button */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-2 md:px-3 py-1.5 text-sm text-white border border-white/10 rounded hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <span className="hidden md:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
