"use client";

import { useState, useEffect, useRef } from "react";
import { SlidePanel } from "@/components/admin/SlidePanel";
import { useContacts, Contact } from "@/hooks/useContacts";
import { useNotification } from "@/contexts/NotificationContext";
import ChecklistSection from "@/components/contacts/contact-form/ChecklistSection";
import { Loader2, Save } from "lucide-react";

interface InvoicePanelProps {
    contact: Contact | null;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

/** Map a Contact (snake_case DB fields) → formData (camelCase for ChecklistSection) */
function contactToFormData(contact: Contact): Record<string, any> {
    return {
        careProviderName: (contact as any).care_provider_name ?? "",
        careProviderPhone: (contact as any).care_provider_phone ?? "",
        careProviderEmail: (contact as any).care_provider_email ?? "",
        referralLocation: (contact as any).referral_location ?? "",
        referralLocationAddress: (contact as any).referral_location_address ?? "",
        referralMonthlyRate: (contact as any).referral_monthly_rate ?? "",
        referralFeePercentage: (contact as any).referral_fee_percentage ?? "",
        referralTax: (contact as any).referral_tax ?? 4.712,
        invoiceSent: contact.invoice_sent ?? false,
        invoiceSentDate: (contact as any).invoice_sent_date ?? null,
        invoiceSentTogglePosition: (contact as any).invoice_sent_toggle_position ?? false,
        invoiceReceived: contact.invoice_received ?? false,
        invoiceReceivedDate: (contact as any).invoice_received_date ?? null,
        invoiceReceivedTogglePosition: (contact as any).invoice_received_toggle_position ?? false,
    };
}

/** Map formData back → partial Contact (snake_case) for update */
function formDataToContact(data: Record<string, any>): Partial<Contact> {
    const nullIfEmpty = (v: any) => (v === "" || v == null) ? null : v;
    const numOrNull = (v: any) => {
        const n = parseFloat(v);
        return isNaN(n) ? null : n;
    };
    return {
        care_provider_name: nullIfEmpty(data.careProviderName),
        care_provider_phone: nullIfEmpty(data.careProviderPhone),
        care_provider_email: nullIfEmpty(data.careProviderEmail),
        referral_location: nullIfEmpty(data.referralLocation),
        referral_location_address: nullIfEmpty(data.referralLocationAddress),
        referral_monthly_rate: numOrNull(data.referralMonthlyRate),
        referral_fee_percentage: numOrNull(data.referralFeePercentage),
        referral_tax: numOrNull(data.referralTax),
        invoice_sent: data.invoiceSent ?? false,
        invoice_sent_date: nullIfEmpty(data.invoiceSentDate),
        invoice_sent_toggle_position: data.invoiceSentTogglePosition ?? false,
        invoice_received: data.invoiceReceived ?? false,
        invoice_received_date: nullIfEmpty(data.invoiceReceivedDate),
        invoice_received_toggle_position: data.invoiceReceivedTogglePosition ?? false,
    } as any;
}

export function InvoicePanel({ contact, isOpen, onClose, onSaved }: InvoicePanelProps) {
    const { updateContact } = useContacts();
    const { showNotification } = useNotification();

    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isSaving, setIsSaving] = useState(false);
    const originalRef = useRef<string>("");

    // Populate formData & snapshot original whenever contact/panel opens
    useEffect(() => {
        if (contact && isOpen) {
            const data = contactToFormData(contact);
            setFormData(data);
            originalRef.current = JSON.stringify(data);
        }
    }, [contact, isOpen]);

    const isDirty = JSON.stringify(formData) !== originalRef.current;

    const handleSave = async () => {
        if (!contact || !isDirty) return;
        setIsSaving(true);
        try {
            await updateContact(contact.id, formDataToContact(formData));
            showNotification("Invoice Updated", contact.resident_full_name || `${contact.first_name} ${contact.last_name}`);
            originalRef.current = JSON.stringify(formData);
            onSaved();
            onClose();
        } catch (err) {
            console.error("Failed to save invoice:", err);
            showNotification("Error", "Failed to save invoice changes");
        } finally {
            setIsSaving(false);
        }
    };

    const displayName = contact
        ? contact.resident_full_name || `${contact.first_name} ${contact.last_name}`
        : "";

    const saveButton = (
        <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isDirty || !contact}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-accent hover:bg-accent-light text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
            {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
                <Save className="h-3.5 w-3.5" />
            )}
            Save
        </button>
    );

    return (
        <SlidePanel
            isOpen={isOpen}
            onClose={onClose}
            title={displayName || "Invoice"}
            subtitle={contact ? `${contact.first_name} ${contact.last_name}` : ""}
            width={640}
            actions={saveButton}
            contentClassName="flex-1 overflow-y-auto p-6"
        >
            {contact ? (
                <ChecklistSection
                    formData={formData}
                    setFormData={setFormData}
                    readOnly={false}
                    invoiceEditMode={true}
                />
            ) : (
                <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
            )}
        </SlidePanel>
    );
}
