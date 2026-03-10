"use client";

import { ReactNode } from "react";

export interface ColumnDef<T> {
    key: string;
    header: string | ReactNode;
    headerLabel?: string; // plain text label for mobile card rows
    render: (item: T) => ReactNode;
    hideOnMobile?: boolean;
    width?: string;
}

interface DataTableProps<T> {
    columns: ColumnDef<T>[];
    data: T[];
    keyField: keyof T;
    actions?: (item: T) => ReactNode;
    emptyMessage?: string;
    primaryColumn?: string; // Key of column to use as card header on mobile
    mobileImageRender?: (item: T) => ReactNode; // Renders featured image in mobile card left column
    mobileFarRightColumn?: string; // Key of column to render far-right in mobile card
}

export function DataTable<T>({
    columns,
    data,
    keyField,
    actions,
    emptyMessage = "No data available.",
    primaryColumn,
    mobileImageRender,
    mobileFarRightColumn,
}: DataTableProps<T>) {
    const primaryCol = primaryColumn || columns[0]?.key;
    const primaryColumnDef = columns.find((c) => c.key === primaryCol);
    const otherColumns = columns.filter((c) => c.key !== primaryCol);

    if (data.length === 0) {
        return (
            <div className="px-6 py-12 text-center text-content-muted">
                {emptyMessage}
            </div>
        );
    }

    return (
        <>
            {/* Desktop Table */}
            <div className="hidden md:block">
                <table className="w-full table-fixed">
                    <thead className="table-header sticky top-0 z-10">
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key} className="px-6 py-3 text-left" style={col.width ? { width: col.width } : undefined}>
                                    {col.header}
                                </th>
                            ))}
                            {actions && (
                                <th className="px-3 py-3 border-l border-ui-border" style={{ width: '92px' }}></th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={String(item[keyField])} className="table-row">
                                {columns.map((col) => (
                                    <td key={col.key} className="px-6 py-[5px]">
                                        {col.render(item)}
                                    </td>
                                ))}
                                {actions && (
                                    <td className="px-3 py-[5px] border-l border-ui-border whitespace-nowrap">
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
                {data.map((item) => {
                    const farRightCol = mobileFarRightColumn
                        ? otherColumns.find(c => c.key === mobileFarRightColumn)
                        : undefined;
                    const mainCols = otherColumns.filter(
                        col => !col.hideOnMobile && col.key !== mobileFarRightColumn
                    );

                    return (
                        <div
                            key={String(item[keyField])}
                            className="bg-surface-card border-2 border-ui-border rounded-lg overflow-hidden"
                        >
                            {/* Card Header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-surface-input">
                                <div className="flex-1 min-w-0">
                                    {primaryColumnDef && (
                                        <div className="text-content-primary font-semibold text-lg truncate">
                                            {primaryColumnDef.render(item)}
                                        </div>
                                    )}
                                </div>
                                {actions && (
                                    <div className="flex gap-3 ml-3 text-content-secondary">
                                        {actions(item)}
                                    </div>
                                )}
                            </div>

                            {/* Card Body */}
                            <div className="p-3">
                                <div className="flex gap-3 items-start">
                                    {/* Column 1: Featured image */}
                                    {mobileImageRender && (
                                        <div className="flex-shrink-0">
                                            {mobileImageRender(item)}
                                        </div>
                                    )}

                                    {/* Column 2: Field data */}
                                    <div className="flex-1 min-w-0 space-y-2">
                                        {mainCols.map(col => (
                                            <div key={col.key}>
                                                <span className="text-[10px] font-semibold uppercase tracking-widest text-content-muted block mb-0.5">
                                                    {col.headerLabel ?? (typeof col.header === 'string' ? col.header : '')}
                                                </span>
                                                <div className="[&_span]:!text-[15px] [&_div]:!text-[15px]">
                                                    {col.render(item)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer: modified date */}
                            {farRightCol && (
                                <div className="border-t-2 border-ui-border px-3 py-2 flex justify-end items-center gap-1.5">
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-content-muted">
                                        {farRightCol.headerLabel ?? (typeof farRightCol.header === 'string' ? farRightCol.header : '')}
                                    </span>
                                    <div className="[&_span]:!text-[10px] text-[10px] text-content-muted">
                                        {farRightCol.render(item)}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}
