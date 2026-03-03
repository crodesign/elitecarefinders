"use client";

import { useContacts, Contact } from "@/hooks/useContacts";
import { useAuth } from "@/contexts/AuthContext";
import { DataTable, type ColumnDef } from "@/components/admin/DataTable";
import { Pagination } from "@/components/admin/Pagination";
import { InvoicePanel } from "@/components/admin/InvoicePanel";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
    Search, FileText, CheckCircle, Clock, DollarSign, Calendar,
    ArrowUpAZ, ArrowDownAZ, Pencil, X, ChevronDown, Check, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { parseHawaiiDate } from "@/lib/hawaiiDate";
import { usePersistedPageSize } from "@/hooks/usePersistedPageSize";

type InvoiceStatus = 'pending' | 'sent' | 'paid';

const STATUS_OPTIONS: { value: InvoiceStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All Invoices' },
    { value: 'pending', label: 'Pending' },
    { value: 'sent', label: 'Sent (Unpaid)' },
    { value: 'paid', label: 'Paid' },
];

const STATUS_PILLS: Record<InvoiceStatus, { bg: string; icon: React.FC<{ className?: string }>; label: string }> = {
    paid: { bg: 'bg-green-500', icon: CheckCircle, label: 'Paid' },
    sent: { bg: 'bg-blue-500', icon: FileText, label: 'Sent' },
    pending: { bg: 'bg-zinc-400', icon: Clock, label: 'Pending' },
};

function timeAgo(dateStr?: string) {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 5) return `${weeks}w ago`;
    return `${months}mo ago`;
}

function formatDate(dateString?: string) {
    if (!dateString) return '—';
    try {
        const date = parseHawaiiDate(dateString);
        return date ? format(date, 'MMM d, yyyy') : '—';
    } catch {
        return dateString;
    }
}

function formatCurrency(amount?: number) {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function getInvoiceStatus(contact: Contact): InvoiceStatus {
    if (contact.invoice_received) return 'paid';
    if (contact.invoice_sent) return 'sent';
    return 'pending';
}

export default function InvoicesPage() {
    const { fetchContacts } = useContacts();
    const { user } = useAuth();

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
    const [statusFilterOpen, setStatusFilterOpen] = useState(false);
    const [sortAsc, setSortAsc] = useState(false);
    const [sortByRecent, setSortByRecent] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = usePersistedPageSize();

    // Panel state
    const [panelContact, setPanelContact] = useState<Contact | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    const statusFilterRef = useRef<HTMLDivElement>(null);

    // Close status dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (statusFilterRef.current && !statusFilterRef.current.contains(e.target as Node))
                setStatusFilterOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const loadContacts = useCallback(async () => {
        try {
            const data = await fetchContacts();
            setContacts(data);
        } catch (err) {
            console.error('Error loading contacts for invoices:', err);
        } finally {
            setIsLoading(false);
        }
    }, [fetchContacts]);

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);
        loadContacts();
    }, [user, loadContacts]);

    const filteredContacts = useMemo(() => {
        // Base: only contacts with invoice activity (won/closed or invoice flags)
        let result = contacts.filter(c =>
            c.care_level === 'won' || c.care_level === 'closed' ||
            c.invoice_sent || c.invoice_received
        );

        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c =>
                `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
                c.resident_full_name?.toLowerCase().includes(q) ||
                c.email?.toLowerCase().includes(q)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter(c => getInvoiceStatus(c) === statusFilter);
        }

        // Sort
        if (sortByRecent) {
            result.sort((a, b) =>
                new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
            );
        } else {
            const nameOf = (c: Contact) =>
                (c.resident_full_name || `${c.first_name} ${c.last_name}`).toLowerCase();
            result.sort((a, b) =>
                sortAsc ? nameOf(a).localeCompare(nameOf(b)) : nameOf(b).localeCompare(nameOf(a))
            );
        }

        return result;
    }, [contacts, searchQuery, statusFilter, sortByRecent, sortAsc]);

    const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
    const paginatedData = filteredContacts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Column definitions
    const columns: ColumnDef<Contact>[] = [
        {
            key: 'resident',
            header: (
                <button
                    type="button"
                    onClick={() => { setSortByRecent(false); setSortAsc(prev => sortByRecent ? true : !prev); }}
                    className="flex items-center gap-1 uppercase tracking-wider text-xs font-semibold text-content-secondary hover:text-content-primary transition-colors"
                >
                    Resident / Contact
                    {!sortByRecent
                        ? (sortAsc ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />)
                        : <ArrowUpAZ className="h-3.5 w-3.5 opacity-30" />}
                </button>
            ),
            headerLabel: 'Resident / Contact',
            render: (contact) => (
                <button
                    onClick={() => { setPanelContact(contact); setIsPanelOpen(true); }}
                    className="flex flex-col items-start hover:opacity-80 transition-opacity text-left"
                >
                    <span className="font-medium text-content-primary hover:text-accent transition-colors">
                        {contact.resident_full_name || `${contact.first_name} ${contact.last_name}`}
                    </span>
                    {contact.resident_full_name && (
                        <span className="text-xs text-content-muted">
                            Contact: {contact.first_name} {contact.last_name}
                        </span>
                    )}
                </button>
            ),
        },
        {
            key: 'invoice_status',
            header: (
                <div className="relative flex items-center gap-1" ref={statusFilterRef}>
                    <button
                        type="button"
                        onClick={() => setStatusFilterOpen(o => !o)}
                        className={`flex items-center gap-1 uppercase tracking-wider text-xs font-semibold transition-colors ${statusFilter !== 'all' ? 'text-accent' : 'text-content-secondary hover:text-content-primary'}`}
                    >
                        Status
                        <ChevronDown className={`h-3 w-3 transition-transform ${statusFilterOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {statusFilter !== 'all' && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setStatusFilter('all'); }}
                            className="flex items-center justify-center h-3.5 w-3.5 rounded bg-accent hover:bg-accent-light transition-colors"
                        >
                            <X className="h-2 w-2 text-white" />
                        </button>
                    )}
                    {statusFilterOpen && (
                        <div className="dropdown-menu absolute left-0 top-full mt-1 w-40 z-50 p-1">
                            {STATUS_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => { setStatusFilter(opt.value); setStatusFilterOpen(false); setCurrentPage(1); }}
                                    className={`dropdown-item w-full rounded text-xs ${statusFilter === opt.value ? 'active' : ''}`}
                                >
                                    <span className="flex-1">{opt.label}</span>
                                    {statusFilter === opt.value && (
                                        <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center">
                                            <Check className="h-2.5 w-2.5 text-white" />
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ),
            headerLabel: 'Status',
            render: (contact) => {
                const status = getInvoiceStatus(contact);
                const { bg, icon: Icon, label } = STATUS_PILLS[status];
                return (
                    <span className={`inline-flex items-center gap-1.5 ${bg} rounded-full px-2.5 py-1 text-xs font-medium text-white`}>
                        <Icon className="h-3 w-3" />
                        {label}
                    </span>
                );
            },
        },
        {
            key: 'move_date',
            header: 'Move Date',
            render: (contact) => (
                <div className="flex items-center gap-1.5 text-sm text-content-secondary">
                    <Calendar className="h-3.5 w-3.5 text-content-muted" />
                    {formatDate(contact.actual_move_date)}
                </div>
            ),
        },
        {
            key: 'invoice_amount',
            header: 'Est. Invoice',
            render: (contact) => {
                const rate = contact.referral_monthly_rate || 0;
                const fee = contact.referral_fee_percentage || 0;
                const tax = contact.referral_tax || 0;
                const subtotal = rate * (fee / 100);
                const total = subtotal + subtotal * (tax / 100);
                return (
                    <div className="flex items-center gap-1.5 text-sm font-medium text-content-primary">
                        <DollarSign className="h-3.5 w-3.5 text-content-muted" />
                        {total > 0 ? formatCurrency(total) : <span className="text-content-muted font-normal">—</span>}
                    </div>
                );
            },
        },
        {
            key: 'modified',
            header: 'Modified',
            render: (contact) => (
                <span className="text-xs text-content-muted">{timeAgo(contact.updated_at)}</span>
            ),
        },
    ];

    const renderActions = (contact: Contact) => (
        <button
            className="btn-ghost"
            title="Manage Invoice"
            onClick={() => { setPanelContact(contact); setIsPanelOpen(true); }}
        >
            <Pencil className="h-4 w-4" />
        </button>
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
                        <h1 className="text-xl md:text-2xl font-bold text-content-primary">Invoices</h1>
                        <p className="text-xs md:text-sm text-content-secondary mt-1">Manage client invoices and payments</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative w-56">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-muted" />
                        <input
                            type="text"
                            placeholder="Search invoices..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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

                    {/* Sort A-Z / Z-A */}
                    <button
                        type="button"
                        onClick={() => { setSortByRecent(false); setSortAsc(prev => sortByRecent ? true : !prev); }}
                        title={sortByRecent ? 'Sort A–Z' : (sortAsc ? 'Sort Z–A' : 'Sort A–Z')}
                        className={`p-1.5 rounded-lg transition-colors ${!sortByRecent
                            ? 'bg-accent text-white'
                            : 'text-content-secondary hover:bg-surface-hover hover:text-content-primary'}`}
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
                            ? 'bg-accent text-white'
                            : 'text-content-secondary hover:bg-surface-hover hover:text-content-primary'}`}
                    >
                        <Clock className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-hidden px-4 md:px-8 pb-4 md:pb-8">
                <div className="bg-surface-card rounded-xl h-full flex flex-col overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-auto">
                        <DataTable
                            columns={columns}
                            data={paginatedData}
                            keyField="id"
                            actions={renderActions}
                            primaryColumn="resident"
                            emptyMessage="No invoices found."
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

            <InvoicePanel
                contact={panelContact}
                isOpen={isPanelOpen}
                onClose={() => { setIsPanelOpen(false); setPanelContact(null); }}
                onSaved={loadContacts}
            />
        </div>
    );
}
