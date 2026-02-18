"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, MapPin, Pencil, Trash2, Mail, Phone, Calendar, Loader2 } from "lucide-react";
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
    const { fetchContacts, deleteContact, createContact, updateContact } = useContacts();
    const { showNotification } = useNotification();

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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
            setIsLoading(true);
            const data = await fetchContacts();
            setContacts(data);
            setFilteredContacts(data);
        } catch (error) {
            console.error("Error loading contacts:", error);
            showNotification("Error", "Failed to load contacts");
        } finally {
            setIsLoading(false);
        }
    }, [fetchContacts, showNotification]);

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


    // Filtering
    useEffect(() => {
        const query = searchQuery.toLowerCase();
        const filtered = contacts.filter(c =>
            (c.first_name || "").toLowerCase().includes(query) ||
            (c.last_name || "").toLowerCase().includes(query) ||
            (c.email || "").toLowerCase().includes(query) ||
            (c.phone || "").includes(query)
        );
        setFilteredContacts(filtered);
        setCurrentPage(1);
    }, [searchQuery, contacts]);

    const handleSave = async (data: Partial<Contact>) => {
        try {
            if (editingContact) {
                await updateContact(editingContact.id, data);
                showNotification("Contact Updated", `${data.first_name} ${data.last_name}`);
            } else {
                // Create needs required fields, assuming logic handles it or partial allows undefined but API will check
                await createContact(data as any);
                showNotification("Contact Created", `${data.first_name} ${data.last_name}`);
            }
            await loadContacts();
            // Don't close, just update state like HomeForm if needed, or close? 
            // HomeForm keeps open. Let's keep open for now or follow typical pattern.
            // Actually HomeForm keeps open to allow further edits. 
            // For now let's just refresh list.
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

    // Columns
    const columns: ColumnDef<Contact>[] = [
        {
            key: "name",
            header: "Name",
            render: (contact) => (
                <button
                    onClick={() => { setEditingContact(contact); setIsFormOpen(true); }}
                    className="flex flex-col items-start hover:opacity-80 transition-opacity text-left"
                >
                    <span className="font-medium text-white hover:text-accent transition-colors">
                        {contact.resident_full_name || `${contact.first_name} ${contact.last_name}`}
                    </span>
                    {contact.first_name && (
                        <span className="text-xs text-zinc-500">Contact: {contact.first_name} {contact.last_name}</span>
                    )}
                </button>
            )
        },
        {
            key: "status",
            header: "Status",
            render: (contact) => {
                const statusColors: Record<string, string> = {
                    'New': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                    'Prospects': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                    'Connected': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    'Won': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    'Closed': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
                };
                // Map database care_level/status to display
                const displayStatus = contact.care_level
                    ? contact.care_level.charAt(0).toUpperCase() + contact.care_level.slice(1)
                    : (contact.status || 'New');

                return (
                    <span className={`px-2 py-1 rounded-full text-xs border ${statusColors[displayStatus] || 'bg-zinc-500/10 text-zinc-400'}`}>
                        {displayStatus}
                    </span>
                );
            }
        },
        {
            key: "contact_info",
            header: "Contact Info",
            render: (contact) => (
                <div className="flex flex-col text-sm text-zinc-400 space-y-1">
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
                <div className="flex items-center text-sm text-zinc-400">
                    <MapPin className="h-3.5 w-3.5 mr-1" />
                    {contact.preferred_neighborhood || contact.preferred_island || "—"}
                </div>
            )
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
                        <h1 className="text-xl md:text-2xl font-bold text-white">Contacts</h1>
                        <p className="text-xs md:text-sm text-zinc-400 mt-1">Manage leads and resident inquiries</p>
                    </div>
                    <button
                        onClick={() => { setEditingContact(null); setIsFormOpen(true); }}
                        className="p-2 bg-accent hover:bg-accent-light text-white rounded-lg transition-colors md:px-4 md:py-2 flex items-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        <span className="hidden md:inline">Add Contact</span>
                    </button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search contacts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-field pl-10"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-hidden px-4 md:px-8 pb-4 md:pb-8">
                <div className="card h-full flex flex-col">
                    <div className="flex-1 min-h-0 overflow-auto">
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
