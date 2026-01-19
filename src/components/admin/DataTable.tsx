"use client";

import { ReactNode } from "react";

export interface ColumnDef<T> {
    key: string;
    header: string;
    render: (item: T) => ReactNode;
    hideOnMobile?: boolean;
}

interface DataTableProps<T> {
    columns: ColumnDef<T>[];
    data: T[];
    keyField: keyof T;
    actions?: (item: T) => ReactNode;
    emptyMessage?: string;
    primaryColumn?: string; // Key of column to use as card header on mobile
}

export function DataTable<T>({
    columns,
    data,
    keyField,
    actions,
    emptyMessage = "No data available.",
    primaryColumn,
}: DataTableProps<T>) {
    const primaryCol = primaryColumn || columns[0]?.key;
    const primaryColumnDef = columns.find((c) => c.key === primaryCol);
    const otherColumns = columns.filter((c) => c.key !== primaryCol);

    if (data.length === 0) {
        return (
            <div className="px-6 py-12 text-center text-zinc-500">
                {emptyMessage}
            </div>
        );
    }

    return (
        <>
            {/* Desktop Table */}
            <div className="hidden md:block">
                <table className="min-w-full">
                    <thead className="table-header sticky top-0 z-10">
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key} className="px-6 py-3 text-left">
                                    {col.header}
                                </th>
                            ))}
                            {actions && (
                                <th className="px-6 py-3 text-right">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={String(item[keyField])} className="table-row">
                                {columns.map((col) => (
                                    <td key={col.key} className="px-6 py-4">
                                        {col.render(item)}
                                    </td>
                                ))}
                                {actions && (
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-1">
                                            {actions(item)}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4 p-4">
                {data.map((item) => (
                    <div
                        key={String(item[keyField])}
                        className="bg-[#0f1318] border border-white/10 rounded-lg overflow-hidden"
                    >
                        {/* Card Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                            <div className="flex-1 min-w-0">
                                {primaryColumnDef && (
                                    <div className="text-white font-semibold text-lg truncate">
                                        {primaryColumnDef.render(item)}
                                    </div>
                                )}
                            </div>
                            {actions && (
                                <div className="flex gap-3 ml-3 text-zinc-400">
                                    {actions(item)}
                                </div>
                            )}
                        </div>

                        {/* Data Rows */}
                        <div className="px-4 py-3 space-y-2.5">
                            {otherColumns
                                .filter((col) => !col.hideOnMobile)
                                .map((col) => (
                                    <div
                                        key={col.key}
                                        className="flex items-start"
                                    >
                                        <span className="text-zinc-500 text-sm w-24 flex-shrink-0">{col.header}</span>
                                        <span className="text-white text-sm flex-1">
                                            {col.render(item)}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
