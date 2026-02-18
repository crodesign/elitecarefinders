"use client";

import { useContacts, Contact } from "@/hooks/useContacts";
import { buildContactEditUrl } from "@/lib/slugUtils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, MoreHorizontal, ArrowUpDown, FileText, CheckCircle, Clock, XCircle, DollarSign, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { parseHawaiiDate } from "@/lib/hawaiiDate";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

export default function InvoicesPage() {
    const { fetchContacts } = useContacts();
    const { user } = useAuth();
    const { isInvoiceManager, isAdmin } = useUserRole();
    const router = useRouter();

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'created_at', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const loadContacts = async () => {
            if (!user) return;
            try {
                setLoading(true);
                const data = await fetchContacts();
                setContacts(data);
            } catch (error) {
                console.error("Error loading contacts:", error);
            } finally {
                setLoading(false);
            }
        };

        loadContacts();
    }, [user, fetchContacts]);

    // Invoice specific filtering logic
    const filteredContacts = useMemo(() => {
        let result = [...contacts];

        // Filter to only show contacts that have invoice activity or are relevant
        // For invoice managers, show all won/closed contacts or those with invoice flags
        result = result.filter(contact => {
            const isWonOrClosed = contact.care_level === 'won' || contact.care_level === 'closed';
            const hasInvoiceActivity = contact.invoice_sent || contact.invoice_received;
            return isWonOrClosed || hasInvoiceActivity;
        });

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter((contact) =>
                `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(query) ||
                contact.resident_full_name?.toLowerCase().includes(query) ||
                contact.email?.toLowerCase().includes(query)
            );
        }

        if (statusFilter !== "all") {
            if (statusFilter === 'sent') {
                result = result.filter(c => c.invoice_sent && !c.invoice_received);
            } else if (statusFilter === 'paid') {
                result = result.filter(c => c.invoice_received);
            } else if (statusFilter === 'pending') {
                result = result.filter(c => !c.invoice_sent && !c.invoice_received);
            }
        }

        if (sortConfig) {
            result.sort((a: any, b: any) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return result;
    }, [contacts, searchQuery, statusFilter, sortConfig]);

    const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
    const paginatedContacts = filteredContacts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ArrowUpDown className="ml-2 h-4 w-4" />;
        }
        return sortConfig.direction === 'asc' ?
            <ArrowUpDown className="ml-2 h-4 w-4 text-primary" /> :
            <ArrowUpDown className="ml-2 h-4 w-4 text-primary" />;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "-";
        try {
            const date = parseHawaiiDate(dateString);
            return date ? format(date, "MMM d, yyyy") : "-";
        } catch {
            return dateString;
        }
    };

    const formatCurrency = (amount?: number) => {
        if (amount === undefined || amount === null) return "-";
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-light tracking-tight">Invoices</h1>
                    <p className="text-muted-foreground mt-1">Manage client invoices and payments</p>
                </div>
                {/* Add Invoice button if needed, though usually triggered from contact */}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search invoices..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2 w-full sm:w-auto">
                                <Filter className="h-4 w-4" />
                                Filter Status
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                                All Invoices
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setStatusFilter("pending")}>
                                Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setStatusFilter("sent")}>
                                Sent (Unpaid)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setStatusFilter("paid")}>
                                Paid
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px] cursor-pointer" onClick={() => requestSort('resident_full_name')}>
                                Resident / Contact {getSortIcon('resident_full_name')}
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => requestSort('actual_move_date')}>
                                Move Date {getSortIcon('actual_move_date')}
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => requestSort('referral_monthly_rate')}>
                                Rate {getSortIcon('referral_monthly_rate')}
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => requestSort('referral_fee_percentage')}>
                                Fee % {getSortIcon('referral_fee_percentage')}
                            </TableHead>
                            <TableHead className="cursor-pointer text-right">
                                Estimated Invoice
                            </TableHead>
                            <TableHead className="cursor-pointer text-center">
                                Status
                            </TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedContacts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No invoices found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedContacts.map((contact) => {
                                // Calculate estimated invoice amount
                                const rate = contact.referral_monthly_rate || 0;
                                const fee = contact.referral_fee_percentage || 0;
                                const tax = contact.referral_tax || 0; // Tax rate e.g. 4.712
                                const subtotal = rate * (fee / 100);
                                const total = subtotal + (subtotal * (tax / 100));

                                let invoiceStatus = 'pending';
                                if (contact.invoice_received) invoiceStatus = 'paid';
                                else if (contact.invoice_sent) invoiceStatus = 'sent';

                                return (
                                    <TableRow key={contact.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{contact.resident_full_name || contact.first_name + ' ' + contact.last_name}</span>
                                                {contact.resident_full_name && contact.resident_full_name !== (contact.first_name + ' ' + contact.last_name) && (
                                                    <span className="text-xs text-muted-foreground">{contact.first_name} {contact.last_name}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                                {formatDate(contact.actual_move_date)}
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatCurrency(contact.referral_monthly_rate)}</TableCell>
                                        <TableCell>{contact.referral_fee_percentage ? `${contact.referral_fee_percentage}%` : '-'}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(total)}</TableCell>
                                        <TableCell className="text-center">
                                            {invoiceStatus === 'paid' && (
                                                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                                    <CheckCircle className="h-3 w-3 mr-1" /> Paid
                                                </Badge>
                                            )}
                                            {invoiceStatus === 'sent' && (
                                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                                                    <FileText className="h-3 w-3 mr-1" /> Sent
                                                </Badge>
                                            )}
                                            {invoiceStatus === 'pending' && (
                                                <Badge variant="outline" className="text-muted-foreground">
                                                    <Clock className="h-3 w-3 mr-1" /> Pending
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => router.push(buildContactEditUrl(contact.id, contact.resident_full_name || `${contact.first_name} ${contact.last_name}`, { tab: 'checklist', from: 'invoices' }))}>
                                                        <FileText className="mr-2 h-4 w-4" />
                                                        Manage Invoice
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <PaginationItem key={i}>
                                <PaginationLink
                                    isActive={currentPage === i + 1}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className="cursor-pointer"
                                >
                                    {i + 1}
                                </PaginationLink>
                            </PaginationItem>
                        ))}
                        <PaginationItem>
                            <PaginationNext
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    );
}
