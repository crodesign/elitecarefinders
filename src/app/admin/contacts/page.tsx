"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, MapPin, Pencil, Trash2, Mail, Phone, Calendar, Loader2, ArrowUpAZ, ArrowDownAZ, Clock, ChevronDown, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useContacts, Contact } from "@/hooks/useContacts";
import { useNotification } from "@/contexts/NotificationContext";
import { DataTable, type ColumnDef } from "@/components/admin/DataTable";
import { Pagination } from "@/components/admin/Pagination";
import { ContactForm } from "@/components/admin/ContactForm";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { formatPhone } from "@/lib/formatPhone";

const ITEMS_PER_PAGE = 10;

export default function ContactsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { fetchContacts, fetchContactsFiltered, deleteContact, createContact, updateContact } = useContacts();
    const { showNotification } = useNotification();

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);       // full-page initial load
    const [isTableLoading, setIsTableLoading] = useState(false); // search/filter/sort updates
    const [searchQuery, setSearchQuery] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);

    // Delete State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Contact | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadContacts = useCallback(async () => {
        try {
            // Fetch all contacts for URL-param edit lookup
            const data = await fetchContacts();
            setContacts(data);
            // Also refresh the filtered/sorted view
            const filtered = await fetchContactsFiltered({ sortByRecent: true });
            setFilteredContacts(filtered);
        } catch (error) {
            console.error("Error loading contacts:", error);
            showNotification("Error", "Failed to load contacts");
        } finally {
            setIsLoading(false);
        }
    }, [fetchContacts, fetchContactsFiltered, showNotification]);

    useEffect(() => {
        loadContacts();
    }, [loadContacts]);

    // Handle URL query for edit
    useEffect(() => {
        const editId = searchParams.get('edit');
        const action = searchParams.get('action');

        if (action === 'create') {
            setEditingContact(null);
            setIsFormOpen(true);
            router.replace('/admin/contacts', { scroll: false });
        } else if (editId && contacts.length > 0) {
            const contact = contacts.find(c => c.id === editId);
            if (contact) {
                setEditingContact(contact);
                setIsFormOpen(true);
            }
        }
    }, [searchParams, contacts, router]);


    // Sort + filter state
    const [sortAsc, setSortAsc] = useState(true);
    const [sortByRecent, setSortByRecent] = useState(true);
    const [progressFilter, setProgressFilter] = useState('');
    const [progressFilterOpen, setProgressFilterOpen] = useState(false);
    const progressFilterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (progressFilterRef.current && !progressFilterRef.current.contains(e.target as Node))
                setProgressFilterOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Debounced DB-backed load — re-runs on search / sort / filter changes
    const loadContactsFiltered = useCallback(async (search: string, byRecent: boolean, asc: boolean, progress: string) => {
        try {
            setIsTableLoading(true);
            const data = await fetchContactsFiltered({ search, sortByRecent: byRecent, sortAsc: asc, progressFilter: progress });
            setFilteredContacts(data);
            setCurrentPage(1);
        } catch (error) {
            console.error('Error loading contacts:', error);
            showNotification('Error', 'Failed to load contacts');
        } finally {
            setIsTableLoading(false);
        }
    }, [fetchContactsFiltered, showNotification]);

    // Debounce search; sort/filter changes fire immediately
    useEffect(() => {
        const timer = setTimeout(() => {
            loadContactsFiltered(searchQuery, sortByRecent, sortAsc, progressFilter);
        }, searchQuery ? 300 : 0);
        return () => clearTimeout(timer);
    }, [searchQuery, sortByRecent, sortAsc, progressFilter, loadContactsFiltered]);

    const handleSave = async (data: Partial<Contact>) => {
        try {
            let savedContact: Contact;
            if (editingContact) {
                savedContact = await updateContact(editingContact.id, data);
                showNotification("Contact Updated", `${data.first_name || ''} ${data.last_name || ''}`.trim());
            } else {
                savedContact = await createContact(data as any);
                showNotification("Contact Created", `${data.first_name || ''} ${data.last_name || ''}`.trim());
            }
            await loadContacts();

            setEditingContact(savedContact);

            const currentParams = new URLSearchParams(searchParams.toString());
            currentParams.delete('action');
            currentParams.set('edit', savedContact.id);
            router.replace(`/admin/contacts?${currentParams.toString()}`, { scroll: false });
        } catch (error) {
            console.error("Save failed", error);
            showNotification("Error", "Failed to save contact");
            throw error;
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            await deleteContact(itemToDelete.id);
            showNotification("Contact Deleted", "Contact removed successfully");
            await loadContacts();
            setDeleteModalOpen(false);
            setItemToDelete(null);
        } catch (error) {
            showNotification("Error", "Failed to delete contact");
        } finally {
            setIsDeleting(false);
        }
    };

    const PROGRESS_OPTIONS = [
        { value: 'new', label: 'New', color: 'bg-[hsl(var(--lead-new))]' },
        { value: 'prospects', label: 'Prospects', color: 'bg-[hsl(var(--lead-prospects))]' },
        { value: 'connected', label: 'Connected', color: 'bg-[hsl(var(--lead-connected))]' },
        { value: 'won', label: 'Won', color: 'bg-[hsl(var(--lead-won))]' },
        { value: 'closed', label: 'Closed', color: 'bg-[hsl(var(--lead-closed))]' },
    ];

    // Columns
    const columns: ColumnDef<Contact>[] = [
        {
            key: "name",
            header: (
                <button
                    type="button"
                    onClick={() => { setSortByRecent(false); setSortAsc(prev => sortByRecent ? true : !prev); }}
                    className="flex items-center gap-1 uppercase tracking-wider text-xs font-semibold text-content-secondary hover:text-content-primary transition-colors"
                >
                    Name
                    {!sortByRecent
                        ? (sortAsc ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />)
                        : <ArrowUpAZ className="h-3.5 w-3.5 opacity-30" />}
                </button>
            ),
            headerLabel: "Name",
            render: (contact) => {
                const status = contact.status || '';
                const dotStyle: Record<string, string> = {
                    'Active': 'bg-green-400',
                    'Paused': 'bg-yellow-400',
                    'Disabled': 'bg-red-400',
                };
                const dotColor = dotStyle[status];
                return (
                    <button
                        onClick={() => { setEditingContact(contact); setIsFormOpen(true); }}
                        className="flex flex-col items-start hover:opacity-80 transition-opacity text-left"
                    >
                        <span className="flex items-center gap-1.5 font-medium text-content-primary hover:text-accent transition-colors">
                            {contact.resident_full_name || `${contact.first_name} ${contact.last_name}`}
                            {dotColor && <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${dotColor}`} />}
                        </span>
                        {contact.first_name && (
                            <span className="text-xs text-content-muted">Contact: {contact.first_name} {contact.last_name}</span>
                        )}
                    </button>
                );
            }
        },
        {
            key: "status",
            header: (
                <div className="relative flex items-center gap-1" ref={progressFilterRef}>
                    <button
                        type="button"
                        onClick={() => setProgressFilterOpen(o => !o)}
                        className={`flex items-center gap-1 uppercase tracking-wider text-xs font-semibold transition-colors ${progressFilter ? 'text-accent' : 'text-content-secondary hover:text-content-primary'
                            }`}
                    >
                        Progress
                        <ChevronDown className={`h-3 w-3 transition-transform ${progressFilterOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {progressFilter && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setProgressFilter(''); }}
                            className="flex items-center justify-center h-3.5 w-3.5 rounded bg-accent hover:bg-accent-light transition-colors"
                        >
                            <X className="h-2 w-2 text-white" />
                        </button>
                    )}
                    {progressFilterOpen && (
                        <div className="dropdown-menu absolute left-0 top-full mt-1 w-36 z-50 p-1">
                            <button
                                type="button"
                                onClick={() => { setProgressFilter(''); setProgressFilterOpen(false); }}
                                className={`dropdown-item w-full rounded text-xs ${!progressFilter ? 'active' : ''}`}
                            >
                                <span className="flex-1">All</span>
                                {!progressFilter && <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></span>}
                            </button>
                            {PROGRESS_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => { setProgressFilter(opt.value); setProgressFilterOpen(false); }}
                                    className={`dropdown-item w-full rounded text-xs ${progressFilter === opt.value ? 'active' : ''}`}
                                >
                                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${opt.color}`} />
                                    <span className="flex-1">{opt.label}</span>
                                    {progressFilter === opt.value && <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ),
            headerLabel: "Progress",
            render: (contact) => {
                const raw = contact.care_level || '';
                if (!raw) return <span className="text-content-muted text-xs">—</span>;
                const label = raw.charAt(0).toUpperCase() + raw.slice(1);
                const pillColors: Record<string, string> = {
                    'new': 'bg-[hsl(var(--lead-new))] text-white',
                    'prospects': 'bg-[hsl(var(--lead-prospects))] text-white',
                    'connected': 'bg-[hsl(var(--lead-connected))] text-white',
                    'won': 'bg-[hsl(var(--lead-won))] text-white',
                    'closed': 'bg-[hsl(var(--lead-closed))] text-white',
                };
                return (
                    <span className={`px-2 py-1 rounded-full text-xs ${pillColors[raw] || 'bg-zinc-400 text-white'}`}>
                        {label}
                    </span>
                );
            }
        },
        {
            key: "contact_info",
            header: "Contact Info",
            render: (contact) => (
                <div className="flex flex-col text-sm text-content-secondary space-y-1">
                    {contact.email && (
                        <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[150px]">{contact.email}</span>
                        </div>
                    )}
                    {contact.phone && (
                        <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            <span>{formatPhone(contact.phone)}</span>
                        </div>
                    )}
                </div>
            )
        },
        {
            key: "location",
            header: "Location",
            render: (contact) => (
                <div className="flex items-center text-sm text-content-secondary">
                    <MapPin className="h-3.5 w-3.5 mr-1" />
                    {contact.preferred_neighborhood || contact.preferred_island || "—"}
                </div>
            )
        },
        {
            key: "modified",
            header: "Modified",
            render: (contact) => {
                const diff = Date.now() - new Date(contact.updated_at).getTime();
                const mins = Math.floor(diff / 60000);
                const hours = Math.floor(diff / 3600000);
                const days = Math.floor(diff / 86400000);
                const weeks = Math.floor(days / 7);
                const months = Math.floor(days / 30);
                const relative =
                    mins < 1 ? "just now" :
                        mins < 60 ? `${mins}m ago` :
                            hours < 24 ? `${hours}h ago` :
                                days < 7 ? `${days}d ago` :
                                    weeks < 5 ? `${weeks}w ago` :
                                        `${months}mo ago`;
                return <span className="text-xs text-content-muted">{relative}</span>;
            }
        }
    ];

    const renderActions = (contact: Contact) => (
        <>
            <button
                className="btn-ghost"
                onClick={() => { setEditingContact(contact); setIsFormOpen(true); }}
            >
                <Pencil className="h-4 w-4" />
            </button>
            <button
                className="btn-danger"
                onClick={() => { setItemToDelete(contact); setDeleteModalOpen(true); }}
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </>
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
    const paginatedData = filteredContacts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex-none p-4 md:p-8 pb-4 md:pb-6 space-y-4 md:space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-content-primary">Contacts</h1>
                        <p className="text-xs md:text-sm text-content-secondary mt-1">Manage leads and resident inquiries</p>
                    </div>
                    <button
                        onClick={() => { setEditingContact(null); setIsFormOpen(true); }}
                        className="p-2 bg-accent hover:bg-accent-light text-white rounded-lg transition-colors md:px-4 md:py-2 flex items-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        <span className="hidden md:inline">Add Contact</span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative w-56">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-muted" />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-field pl-8 pr-7"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center h-4 w-4 rounded bg-accent hover:bg-accent-light transition-colors"
                            >
                                <X className="h-2.5 w-2.5 text-white" />
                            </button>
                        )}
                    </div>
                    {/* Sort: A-Z / Z-A toggle */}
                    <button
                        type="button"
                        onClick={() => { setSortByRecent(false); setSortAsc(prev => sortByRecent ? true : !prev); }}
                        title={sortByRecent ? "Sort A–Z" : (sortAsc ? "Sort Z–A" : "Sort A–Z")}
                        className={`p-1.5 rounded-lg transition-colors ${!sortByRecent
                            ? "bg-accent text-white"
                            : "text-content-secondary hover:bg-surface-hover hover:text-content-primary"
                            }`}
                    >
                        {(!sortByRecent && !sortAsc)
                            ? <ArrowDownAZ className="h-4 w-4" />
                            : <ArrowUpAZ className="h-4 w-4" />}
                    </button>
                    {/* Sort: Most Recent */}
                    <button
                        type="button"
                        onClick={() => setSortByRecent(true)}
                        title="Sort by most recent"
                        className={`p-1.5 rounded-lg transition-colors ${sortByRecent
                            ? "bg-accent text-white"
                            : "text-content-secondary hover:bg-surface-hover hover:text-content-primary"
                            }`}
                    >
                        <Clock className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-hidden px-4 md:px-8 pb-4 md:pb-8">
                <div className="bg-surface-card rounded-xl h-full flex flex-col overflow-hidden">
                    <div className={`flex-1 min-h-0 overflow-auto relative transition-opacity duration-150 ${isTableLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <DataTable
                            columns={columns}
                            data={paginatedData}
                            keyField="id"
                            actions={renderActions}
                            primaryColumn="name"
                            emptyMessage="No contacts found."
                        />
                    </div>
                    {filteredContacts.length > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredContacts.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                        />
                    )}
                </div>
            </div>

            {/* Slide Panel Form */}
            <ContactForm
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setEditingContact(null);
                    router.push('/admin/contacts', { scroll: false });
                }}
                onSave={handleSave}
                contact={editingContact}
            />

            {/* Delete Modal */}
            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
                onConfirm={handleDelete}
                title="Delete Contact"
                message={
                    <span>
                        Are you sure you want to delete <strong>{itemToDelete?.first_name} {itemToDelete?.last_name}</strong>?
                        <br />
                        This action cannot be undone.
                    </span>
                }
                confirmLabel="Delete Contact"
                isDangerous={true}
                isLoading={isDeleting}
            />
        </div>
    );
}
