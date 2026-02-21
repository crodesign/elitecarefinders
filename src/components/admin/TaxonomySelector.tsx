import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, ChevronRight, Search, Check, Ban } from "lucide-react";
import type { Taxonomy } from "@/types";

interface TaxonomyEntry {
    id: string;
    name: string;
    children?: TaxonomyEntry[];
}

interface TaxonomySelectorProps {
    taxonomy: Taxonomy & { entries: TaxonomyEntry[] };
    value: string;
    onChange: (value: string) => void;
    showLabel?: boolean;
    className?: string;
}

interface FlatEntry {
    id: string;
    name: string;
    depth: number;
    parentName?: string;
    fullPath: string;  // Full hierarchical path like "Hawaii - Oahu - Honolulu"
}

export function TaxonomySelector({ taxonomy, value, onChange, showLabel = false, className = "" }: TaxonomySelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedRef = useRef<HTMLButtonElement>(null);

    // Flatten tree for search and finding selected entry
    const flattenTree = (entries: TaxonomyEntry[], depth = 0, parentName = "", pathParts: string[] = []): FlatEntry[] => {
        return entries.reduce<FlatEntry[]>((acc, entry) => {
            const currentPath = [...pathParts, entry.name];
            const flatNode: FlatEntry = {
                id: entry.id,
                name: entry.name,
                depth,
                parentName,
                fullPath: currentPath.join(" - ")
            };
            const children = entry.children
                ? flattenTree(entry.children, depth + 1, entry.name, currentPath)
                : [];
            return [...acc, flatNode, ...children];
        }, []);
    };

    const flatEntries = useMemo(() => flattenTree(taxonomy?.entries || []), [taxonomy?.entries]);
    const selectedEntry = flatEntries.find(e => e.id === value);

    // Auto-expand path to selected entry when dropdown opens
    useEffect(() => {
        if (isOpen && value) {
            // Find path to selected entry and expand all ancestors
            const findPathToEntry = (entries: TaxonomyEntry[], targetId: string, path: string[] = []): string[] | null => {
                for (const entry of entries) {
                    if (entry.id === targetId) {
                        return path;
                    }
                    if (entry.children) {
                        const result = findPathToEntry(entry.children, targetId, [...path, entry.id]);
                        if (result) return result;
                    }
                }
                return null;
            };

            const path = findPathToEntry(taxonomy?.entries || [], value);
            if (path && path.length > 0) {
                setExpandedIds(prev => {
                    const next = new Set(prev);
                    path.forEach(id => next.add(id));
                    return next;
                });
            }

            // Scroll to selected entry after a short delay (to allow expansion rendering)
            setTimeout(() => {
                selectedRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }, 50);
        }
    }, [isOpen, value, taxonomy?.entries]);

    // Filter for search
    const filteredEntries = useMemo(() => {
        if (!searchQuery) return flatEntries;
        return flatEntries.filter(e =>
            e.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [flatEntries, searchQuery]);

    // Toggle expand/collapse
    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Recursive tree renderer
    const renderTreeEntry = (entry: TaxonomyEntry, depth: number = 0) => {
        const hasChildren = entry.children && entry.children.length > 0;
        const isExpanded = expandedIds.has(entry.id);
        const isSelected = value === entry.id;
        const isSelectable = !hasChildren; // Only leaf nodes are selectable

        return (
            <div key={entry.id}>
                <button
                    ref={isSelected ? selectedRef : undefined}
                    type="button"
                    onClick={() => {
                        if (hasChildren) {
                            // Has children: just toggle expand
                            setExpandedIds(prev => {
                                const next = new Set(prev);
                                if (next.has(entry.id)) {
                                    next.delete(entry.id);
                                } else {
                                    next.add(entry.id);
                                }
                                return next;
                            });
                        } else {
                            // Leaf node: select and close
                            onChange(entry.id);
                            setIsOpen(false);
                        }
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center group transition-colors ${isSelected ? "bg-surface-hover text-content-primary" :
                        hasChildren ? "text-content-secondary hover:bg-surface-hover hover:text-content-primary font-medium" :
                            "text-content-secondary hover:bg-surface-hover hover:text-content-primary"
                        }`}
                    style={{ paddingLeft: `${(depth * 12) + 8}px` }}
                >
                    {/* Expand/collapse toggle */}
                    {hasChildren ? (
                        <span
                            onClick={(e) => toggleExpand(entry.id, e)}
                            className="p-0.5 mr-1 hover:bg-surface-hover rounded flex-shrink-0"
                        >
                            {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-content-muted" />
                            ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-content-muted" />
                            )}
                        </span>
                    ) : (
                        <span className="w-5 flex-shrink-0" />
                    )}
                    <span>{entry.name}</span>
                    {isSelected && <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></span>}
                </button>

                {/* Children (only show when expanded) */}
                {hasChildren && isExpanded && (
                    <div>
                        {entry.children!.map(child => renderTreeEntry(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {showLabel && (
                <label className="text-sm font-medium text-content-secondary block mb-1">
                    {taxonomy?.singularName || 'Select'}
                </label>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`form-input w-full flex items-center justify-between px-2 py-1 text-sm min-h-[28px]`}
            >
                <span className={`truncate mr-2 ${selectedEntry ? "text-content-primary" : "text-content-muted"}`}>
                    {selectedEntry ? selectedEntry.fullPath : "Select..."}
                </span>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 text-content-muted ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="dropdown-menu absolute z-50 right-0 min-w-full w-max max-w-xs mt-1 max-h-60 flex flex-col">
                    <div className="p-2 relative border-b border-ui-border">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-muted" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="form-input w-full text-xs py-1.5 pl-8 pr-2"
                            placeholder="Search..."
                            autoFocus
                        />
                    </div>

                    <div className="overflow-y-auto flex-1 p-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <button
                            type="button"
                            onClick={() => {
                                onChange("");
                                setIsOpen(false);
                            }}
                            className="dropdown-item w-full rounded text-sm"
                        >
                            <Ban className="h-3.5 w-3.5" />
                            <span>None</span>
                            {value === "" && <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></span>}
                        </button>

                        {/* Show filtered tree when searching, full tree when not */}
                        {searchQuery ? (
                            (() => {
                                // Filter tree to show entries matching search + their ancestors/descendants
                                const filterTree = (entries: TaxonomyEntry[]): TaxonomyEntry[] => {
                                    return entries.reduce<TaxonomyEntry[]>((acc, entry) => {
                                        const nameMatches = entry.name.toLowerCase().includes(searchQuery.toLowerCase());
                                        const filteredChildren = entry.children ? filterTree(entry.children) : [];

                                        // Include if name matches OR has matching descendants
                                        if (nameMatches || filteredChildren.length > 0) {
                                            acc.push({
                                                ...entry,
                                                // If name matches, show all children; otherwise show filtered children
                                                children: nameMatches ? entry.children : filteredChildren
                                            });
                                        }
                                        return acc;
                                    }, []);
                                };

                                const filteredTree = filterTree(taxonomy?.entries || []);

                                // Auto-expand matching entries when searching
                                const matchingIds = new Set<string>();
                                const collectMatchingIds = (entries: TaxonomyEntry[]) => {
                                    entries.forEach(e => {
                                        if (e.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                                            matchingIds.add(e.id);
                                        }
                                        if (e.children) collectMatchingIds(e.children);
                                    });
                                };
                                collectMatchingIds(taxonomy?.entries || []);

                                if (filteredTree.length === 0) {
                                    return (
                                        <div className="px-2 py-4 text-center text-xs text-content-muted">
                                            No matches found
                                        </div>
                                    );
                                }

                                // Render with matching entries auto-expanded
                                const renderSearchEntry = (entry: TaxonomyEntry, depth: number = 0) => {
                                    const hasChildren = entry.children && entry.children.length > 0;
                                    const isExpanded = matchingIds.has(entry.id) || expandedIds.has(entry.id);
                                    const isSelected = value === entry.id;
                                    const isSelectable = !hasChildren; // Only leaf nodes are selectable

                                    return (
                                        <div key={entry.id}>
                                            <button
                                                ref={isSelected ? selectedRef : undefined}
                                                type="button"
                                                onClick={() => {
                                                    if (hasChildren) {
                                                        setExpandedIds(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(entry.id)) next.delete(entry.id);
                                                            else next.add(entry.id);
                                                            return next;
                                                        });
                                                    } else {
                                                        onChange(entry.id);
                                                        setIsOpen(false);
                                                        setSearchQuery("");
                                                    }
                                                }}
                                                className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center group transition-colors ${isSelected ? "bg-surface-hover text-content-primary" :
                                                    hasChildren ? "text-content-secondary hover:bg-surface-hover hover:text-content-primary font-medium" :
                                                        "text-content-secondary hover:bg-surface-hover hover:text-content-primary"
                                                    }`}
                                                style={{ paddingLeft: `${(depth * 12) + 8}px` }}
                                            >
                                                {hasChildren ? (
                                                    <span className="p-0.5 mr-1 hover:bg-white/10 rounded flex-shrink-0">
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-3.5 w-3.5 text-content-muted" />
                                                        ) : (
                                                            <ChevronRight className="h-3.5 w-3.5 text-content-muted" />
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="w-5 flex-shrink-0" />
                                                )}
                                                <span>{entry.name}</span>
                                                {isSelected && <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></span>}
                                            </button>
                                            {hasChildren && isExpanded && (
                                                <div>
                                                    {entry.children!.map(child => renderSearchEntry(child, depth + 1))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                };

                                return filteredTree.map(entry => renderSearchEntry(entry, 0));
                            })()
                        ) : (
                            (taxonomy?.entries || []).length === 0 ? (
                                <div className="px-2 py-4 text-center text-xs text-content-muted">
                                    No entries available
                                </div>
                            ) : (
                                (taxonomy?.entries || []).map((entry) => renderTreeEntry(entry, 0))
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
