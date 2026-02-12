"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, ChevronsUpDown, MoreVertical, Pencil, Trash2, Check } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { MediaFolder } from "@/types";

// State option type
export interface StateOption {
    id: string;
    name: string;
    slug: string;
}

// Component that shows styled tooltip when text is truncated
function TruncatedText({ text, className }: { text: string; className?: string }) {
    const textRef = useRef<HTMLSpanElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);

    useEffect(() => {
        const checkTruncation = () => {
            if (textRef.current) {
                setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
            }
        };
        checkTruncation();
        const timeout = setTimeout(checkTruncation, 100);
        window.addEventListener('resize', checkTruncation);
        return () => {
            window.removeEventListener('resize', checkTruncation);
            clearTimeout(timeout);
        };
    }, [text]);

    if (!isTruncated) {
        return (
            <span ref={textRef} className={className}>
                {text}
            </span>
        );
    }

    return (
        <Tooltip.Provider delayDuration={300}>
            <Tooltip.Root>
                <Tooltip.Trigger asChild>
                    <span ref={textRef} className={className}>
                        {text}
                    </span>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                    <Tooltip.Content
                        className="px-3 py-2 text-sm text-white bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-[9999] max-w-xs"
                        sideOffset={8}
                        side="right"
                    >
                        {text}
                        <Tooltip.Arrow className="fill-zinc-900" />
                    </Tooltip.Content>
                </Tooltip.Portal>
            </Tooltip.Root>
        </Tooltip.Provider>
    );
}

// Folders that appear above the divider (filtered by state)
const PRIMARY_FOLDER_SLUGS = ["home-images", "facility-images"];
// Folders that appear below the divider
const SECONDARY_FOLDER_SLUGS = ["blog-images", "site-images", "temp"];
// Protected system folders that cannot be renamed or deleted
const PROTECTED_FOLDER_SLUGS = [...PRIMARY_FOLDER_SLUGS, ...SECONDARY_FOLDER_SLUGS];

interface FolderTreeProps {
    folders: MediaFolder[];
    selectedFolderId?: string;
    onSelectFolder: (folder: MediaFolder | null) => void;
    onCreateFolder: (name: string, parentId?: string) => Promise<void>;
    onRenameFolder?: (folderId: string, newName: string) => Promise<void>;
    onDeleteFolder?: (folderId: string) => Promise<void>;
    // State selection
    states: StateOption[];
    selectedStateId: string | null;
    onSelectState: (stateId: string | null) => void;
}

export function FolderTree({
    folders,
    selectedFolderId,
    onSelectFolder,
    onCreateFolder,
    onRenameFolder,
    onDeleteFolder,
    states,
    selectedStateId,
    onSelectState,
}: FolderTreeProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
    const stateDropdownRef = useRef<HTMLDivElement>(null);

    // Hawaii island selector state
    const HAWAIIAN_ISLANDS = ['Oahu', 'Maui', 'Hawaii', 'Kauai', 'Molokai', 'Lanai'];
    const [selectedIsland, setSelectedIsland] = useState<string | null>('Oahu'); // Default to Oahu
    const [isIslandDropdownOpen, setIsIslandDropdownOpen] = useState(false);
    const islandDropdownRef = useRef<HTMLDivElement>(null);

    // Editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

    // Check if Hawaii is selected
    const currentState = states.find(s => s.id === selectedStateId);
    const isHawaiiSelected = currentState?.slug === 'hawaii';

    // Reset island selection when state changes
    useEffect(() => {
        if (isHawaiiSelected) {
            setSelectedIsland('Oahu'); // Default to Oahu when Hawaii is selected
        } else {
            setSelectedIsland(null);
        }
    }, [isHawaiiSelected]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target as Node)) {
                setIsStateDropdownOpen(false);
            }
            if (islandDropdownRef.current && !islandDropdownRef.current.contains(event.target as Node)) {
                setIsIslandDropdownOpen(false);
            }
            // Close folder menu when clicking outside (check if click is not within a menu)
            const target = event.target as HTMLElement;
            if (!target.closest('.folder-menu-container')) {
                setMenuOpenId(null);
            }
            // Close edit mode when clicking outside edit field
            if (editingId && !target.closest('.folder-edit-container')) {
                handleCancelEdit();
            }
            // Close create mode when clicking outside create field
            if (isCreating && !target.closest('.folder-create-container')) {
                handleCreateCancel();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [editingId]);

    // Auto-expand parent folders when selected folder changes
    useEffect(() => {
        if (selectedFolderId) {
            // Find all parent IDs that need to be expanded
            const findParentIds = (foldersToSearch: MediaFolder[], targetId: string, path: string[] = []): string[] | null => {
                for (const folder of foldersToSearch) {
                    if (folder.id === targetId) {
                        return path;
                    }
                    if (folder.children && folder.children.length > 0) {
                        const result = findParentIds(folder.children, targetId, [...path, folder.id]);
                        if (result) return result;
                    }
                }
                return null;
            };

            const parentIds = findParentIds(folders, selectedFolderId);
            if (parentIds && parentIds.length > 0) {
                setExpandedIds(prev => {
                    const next = new Set(prev);
                    parentIds.forEach(id => next.add(id));
                    return next;
                });
            }
        }
    }, [selectedFolderId, folders]);

    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [creatingParentId, setCreatingParentId] = useState<string | undefined>();

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedIds(newExpanded);
    };

    const handleCreateStart = (parentId?: string) => {
        setCreatingParentId(parentId);
        setIsCreating(true);
        setNewFolderName("");
    };

    const handleCreateSubmit = async () => {
        if (newFolderName.trim()) {
            await onCreateFolder(newFolderName.trim(), creatingParentId);
            setIsCreating(false);
            setNewFolderName("");
            setCreatingParentId(undefined);
        }
    };

    const handleCreateCancel = () => {
        setIsCreating(false);
        setNewFolderName("");
        setCreatingParentId(undefined);
    };

    const handleStartEdit = (folder: MediaFolder) => {
        setEditingId(folder.id);
        setEditValue(folder.name);
        setMenuOpenId(null);
    };

    const handleSaveEdit = async () => {
        if (editingId && editValue.trim() && onRenameFolder) {
            await onRenameFolder(editingId, editValue.trim());
            setEditingId(null);
            setEditValue("");
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditValue("");
    };

    const handleDelete = async (folderId: string) => {
        if (onDeleteFolder) {
            await onDeleteFolder(folderId);
            setMenuOpenId(null);
        }
    };

    // With hierarchical structure:
    // - State folders are top-level folders with stateId matching the selected state
    // - Home/Facility folders are children of state folders
    // - When a state is selected, show its children (Home Images, Facility Images) directly
    const stateFolders = selectedStateId
        ? folders.filter(f => f.stateId === selectedStateId && !f.parentId)
        : [];

    // Get the children of the selected state folder (Home Images, Facility Images)
    let primaryFolders = stateFolders.length > 0 && stateFolders[0].children
        ? stateFolders[0].children
        : [];

    // For Hawaii, filter by selected island to get Home/Facility from that island
    if (isHawaiiSelected && selectedIsland && stateFolders.length > 0) {
        const islandFolder = stateFolders[0].children?.find(f => f.name === selectedIsland);
        primaryFolders = islandFolder?.children || [];
    }

    const secondaryFolders = folders.filter(f => SECONDARY_FOLDER_SLUGS.includes(f.slug));

    // Get selected state name
    const selectedState = states.find(s => s.id === selectedStateId);

    const renderFolder = (folder: MediaFolder, depth: number = 0) => {
        const isSelected = folder.id === selectedFolderId;
        const isExpanded = expandedIds.has(folder.id);
        const hasChildren = folder.children && folder.children.length > 0;
        const isEditing = editingId === folder.id;
        const isMenuOpen = menuOpenId === folder.id;
        // Protect system folders by name (Home Images, Facility Images, Blog Images, Site Images, Temp)
        const isProtected = ['Home Images', 'Facility Images', 'Blog Images', 'Site Images', 'Temp'].includes(folder.name);

        return (
            <div key={folder.id}>
                <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${isSelected
                        ? "bg-accent/10 text-accent"
                        : "text-zinc-400 hover:bg-white/5 hover:text-white"
                        }`}
                    style={{ paddingLeft: `${12 + depth * 16}px` }}
                    onClick={() => {
                        if (!isEditing) {
                            onSelectFolder(folder);
                            if (hasChildren) {
                                toggleExpand(folder.id);
                            }
                        }
                    }}
                >
                    {/* Expand/Collapse toggle */}
                    {hasChildren ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(folder.id);
                            }}
                            className="p-0.5 hover:bg-white/10 rounded flex-shrink-0"
                        >
                            {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </button>
                    ) : (
                        <span className="w-5" />
                    )}

                    {/* Folder icon */}
                    {isSelected || isExpanded ? (
                        <FolderOpen className="h-4 w-4 flex-shrink-0" />
                    ) : (
                        <Folder className="h-4 w-4 flex-shrink-0" />
                    )}

                    {/* Folder name or edit input */}
                    {isEditing ? (
                        <div className="relative flex-1 min-w-0 folder-edit-container">
                            <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveEdit();
                                    if (e.key === "Escape") handleCancelEdit();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full bg-black/30 rounded pl-2 pr-14 py-0.5 text-sm text-white placeholder-zinc-500 focus:outline-none"
                                autoFocus
                            />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveEdit();
                                }}
                                className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs bg-accent text-white rounded hover:bg-accent-light transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    ) : (
                        <TruncatedText text={folder.name} className="text-sm truncate flex-1" />
                    )}

                    {/* Item count badge */}
                    {!isEditing && folder.itemCount !== undefined && folder.itemCount > 0 && (
                        <span className="text-xs text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded">
                            {folder.itemCount}
                        </span>
                    )}

                    {/* More menu button (edit/delete) - hidden for protected system folders */}
                    {!isEditing && !isProtected && onRenameFolder && onDeleteFolder && (
                        <div className="relative flex-shrink-0 folder-menu-container">
                            <Tooltip.Provider delayDuration={500}>
                                <Tooltip.Root>
                                    <Tooltip.Trigger asChild>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMenuOpenId(isMenuOpen ? null : folder.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded"
                                        >
                                            <MoreVertical className="h-3.5 w-3.5" />
                                        </button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Portal>
                                        <Tooltip.Content
                                            className="px-3 py-2 text-sm text-white bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-[9999]"
                                            sideOffset={8}
                                        >
                                            More options
                                            <Tooltip.Arrow className="fill-zinc-900" />
                                        </Tooltip.Content>
                                    </Tooltip.Portal>
                                </Tooltip.Root>
                            </Tooltip.Provider>

                            {/* Dropdown menu */}
                            {isMenuOpen && (
                                <div className="absolute right-0 top-full mt-1 bg-[#0b1115] border border-white/10 rounded-lg shadow-2xl z-50 min-w-[120px]">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleStartEdit(folder);
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 flex items-center gap-2 rounded-t-lg"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                        Rename
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(folder.id);
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 rounded-b-lg"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Add subfolder button */}
                    {!isEditing && (
                        <Tooltip.Provider delayDuration={500}>
                            <Tooltip.Root>
                                <Tooltip.Trigger asChild>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCreateStart(folder.id);
                                            if (!isExpanded) toggleExpand(folder.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded"
                                    >
                                        <Plus className="h-3 w-3" />
                                    </button>
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                    <Tooltip.Content
                                        className="px-3 py-2 text-sm text-white bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-[9999]"
                                        sideOffset={8}
                                    >
                                        Add subfolder
                                        <Tooltip.Arrow className="fill-zinc-900" />
                                    </Tooltip.Content>
                                </Tooltip.Portal>
                            </Tooltip.Root>
                        </Tooltip.Provider>
                    )}
                </div>

                {/* New folder input (in-tree creation) - appears at TOP of children */}
                {isCreating && creatingParentId === folder.id && (
                    <div
                        className="flex items-center gap-2 px-3 py-2"
                        style={{ paddingLeft: `${28 + (depth + 1) * 16}px` }}
                    >
                        <Folder className="h-4 w-4 text-zinc-500" />
                        <div className="relative flex-1 min-w-0 folder-create-container">
                            <input
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCreateSubmit();
                                    if (e.key === "Escape") handleCreateCancel();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Folder name"
                                className="w-full bg-black/30 rounded pl-2 pr-14 py-0.5 text-sm text-white placeholder-zinc-500 focus:outline-none"
                                autoFocus
                            />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCreateSubmit();
                                }}
                                className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs bg-accent text-white rounded hover:bg-accent-light transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                )}

                {/* Children */}
                {isExpanded && hasChildren && (
                    <div>
                        {folder.children!.map((child) => renderFolder(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            {/* State Dropdown */}
            <div className="flex-none px-3 py-3" ref={stateDropdownRef}>
                <div className="relative">
                    <button
                        onClick={() => setIsStateDropdownOpen(!isStateDropdownOpen)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white hover:border-white/20 transition-colors"
                    >
                        <span className="truncate">
                            {selectedState ? selectedState.name : "Select State..."}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                    </button>

                    {isStateDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#0b1115] border border-white/10 rounded-lg shadow-2xl max-h-60 overflow-auto z-[9999]">
                            {states.map((state) => (
                                <button
                                    key={state.id}
                                    onClick={() => {
                                        onSelectState(state.id);
                                        setIsStateDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${state.id === selectedStateId
                                        ? "bg-accent/10 text-accent"
                                        : "text-zinc-300 hover:bg-white/5 hover:text-white"
                                        }`}
                                >
                                    {state.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Island Dropdown - Only show for Hawaii */}
            {isHawaiiSelected && (
                <div className="flex-none px-3 pb-3" ref={islandDropdownRef}>
                    <div className="relative">
                        <button
                            onClick={() => setIsIslandDropdownOpen(!isIslandDropdownOpen)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white hover:border-white/20 transition-colors"
                        >
                            <span className="truncate">
                                {selectedIsland || "Select Island..."}
                            </span>
                            <ChevronsUpDown className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                        </button>

                        {isIslandDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-[#0b1115] border border-white/10 rounded-lg shadow-2xl max-h-60 overflow-auto z-[9999]">
                                {HAWAIIAN_ISLANDS.map((island) => (
                                    <button
                                        key={island}
                                        onClick={() => {
                                            setSelectedIsland(island);
                                            setIsIslandDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${island === selectedIsland
                                            ? "bg-accent/10 text-accent"
                                            : "text-zinc-300 hover:bg-white/5 hover:text-white"
                                            }`}
                                    >
                                        {island}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Folder list */}
            <div className="flex-1 overflow-y-auto py-2">
                {/* Home Images and Facility Images - show when state is selected */}
                {selectedStateId && (
                    <div className="space-y-0.5 group">
                        {primaryFolders.map((folder) => renderFolder(folder))}
                    </div>
                )}

                {/* Divider - only show when state is selected and secondary folders exist */}
                {selectedStateId && secondaryFolders.length > 0 && (
                    <div className="mx-4 my-3 border-t border-white/10" />
                )}

                {/* Secondary folders (Blog Images, Site Images, Temp) */}
                <div className="space-y-0.5 group">
                    {secondaryFolders.map((folder) => renderFolder(folder))}
                </div>
            </div>
        </div>
    );
}

