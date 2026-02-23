"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidePanel } from "@/components/admin/SlidePanel";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { Contact } from "@/hooks/useContacts";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import {
    User,
    FileText,
    Home,
    Heart,
    CheckSquare,
    Save,
    Users,
} from "lucide-react";
import ContactInfoSection from "@/components/contacts/contact-form/ContactInfoSection";
import ResidentInfoSection from "@/components/contacts/contact-form/ResidentInfoSection";
import HousingPreferencesSection from "@/components/contacts/contact-form/HousingPreferencesSection";
import CombinedCareSection from "@/components/contacts/contact-form/CombinedCareSection";
import ChecklistSection from "@/components/contacts/contact-form/ChecklistSection";
import NotesSection from "@/components/contacts/contact-form/NotesSection";
import { parseHawaiiDate } from "@/lib/hawaiiDate";
import { convertFormToContact } from "@/lib/contactMapping";

interface ContactFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Contact>) => Promise<void>;
    contact?: Contact | null;
}

type TabId = "contact-info" | "resident-info" | "housing" | "care-needs" | "checklist" | "notes";

export function ContactForm({ isOpen, onClose, onSave, contact }: ContactFormProps) {
    const { isDirty, setIsDirty, registerSaveHandler } = useUnsavedChanges();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const [activeTab, setActiveTab] = useState<TabId>(contact ? "notes" : "contact-info");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCloseWarning, setShowCloseWarning] = useState(false);

    // Using any for form data to match the loose typing of the sub-components
    const [formData, setFormData] = useState<any>({});
    // Snapshot of the saved data — used to detect if user has reverted all changes
    const originalDataRef = useRef<any>({});

    // Sync activeTab with URL
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ["contact-info", "resident-info", "housing", "care-needs", "checklist", "notes"].includes(tab)) {
            setActiveTab(tab as TabId);
        }
    }, [searchParams]);

    const handleTabChange = (id: TabId) => {
        setActiveTab(id);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', id);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    // Reset active tab when contact changes (edit vs new), only if no URL parameter specifies it
    useEffect(() => {
        if (!searchParams.get('tab')) {
            setActiveTab(contact ? "notes" : "contact-info");
        }
    }, [contact?.id, searchParams]);

    // Initialize form data from contact
    useEffect(() => {
        if (contact) {
            // Helper to ensure array from potentially string DB values (comma separated)
            const ensureArray = (val: any): string[] => {
                if (!val) return [];
                if (Array.isArray(val)) return val;
                if (typeof val === 'string') return val.split(',').map((s: string) => s.trim()).filter(Boolean);
                return [];
            };

            // Reverse mapping: Contact -> Form Data
            const mappedData = {
                ...contact, // Spread all existing snake_case fields first

                // Then specifically map the camelCase variants needed by form components
                contactName: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
                residentFullName: contact.resident_full_name || '',
                contactPhone: contact.phone || '',
                contactEmail: contact.email || '',
                residentFirstName: contact.first_name, // Fallback if resident name logic is complex
                residentLastName: contact.last_name,

                // Map fields that might be arrays in form but strings in DB or vice versa
                housingType: ensureArray(contact.housing_type),
                roomType: ensureArray(contact.room_type),
                bathroomType: ensureArray(contact.bathroom_type),
                showerType: ensureArray(contact.shower_type),
                interests: ensureArray(contact.interests),

                careNeeds: [
                    ...ensureArray(contact.dietary_needs),
                    ...ensureArray(contact.personal_care_assistance)
                ],
                medicationManagement: ensureArray(contact.medication_management),
                medicalConditions: ensureArray(contact.health_conditions),
                mobilityLevel: ensureArray(contact.mobility_level),

                leadClassification: contact.care_level,
                summary: contact.additional_notes,

                // Ensure dates are strings if needed (components seem to handle string/Date mix, but let's be safe)
                // specific fields mappings
                secondaryContactName: contact.secondary_contact_name,
                secondaryContactEmail: contact.secondary_contact_email,
                secondaryContactPhone: contact.secondary_contact_phone,
                enableSecondaryContact: contact.enable_secondary_contact,
                lookingFor: contact.looking_for,
                referralDate: contact.referral_date,
                referralName: contact.referral_name,
                referralPhone: contact.referral_phone,
                referralLocation: contact.referral_location,
                referralLocationAddress: contact.referral_location_address, // Note: DB column might be referral_location_address
                referralMonthlyRate: contact.referral_monthly_rate,
                referralFeePercentage: contact.referral_fee_percentage,
                referralTax: contact.referral_tax,
                signatureName: contact.signature_name,
                signatureDate: contact.signature_date,
                signatureData: contact.signature_data,
                waiverText: contact.waiver_text,
                waiverAgreed: contact.waiver_agreed,

                // Resident info matches snake_case generally in components?
                // Actually ResidentInfoSection uses ...formData, so it expects same keys as DB or mapped ones?
                // Checking ResidentInfoSection: uses formData.street_address, formData.city etc. (snake_case)
                // But also formData.residentFirstName (camelCase)

                // Checklist fields are mostly direct match (snake_case or camelCase depending on component)
                // ChecklistSection uses camelCase: formData?.referralLocation
            };
            setFormData(mappedData);
            originalDataRef.current = mappedData;
            setIsDirty(false); // Reset dirty on fresh load
        } else {
            const emptyData = { status: "Active" };
            setFormData(emptyData);
            originalDataRef.current = emptyData;
            setIsDirty(false);
        }
    }, [contact, isOpen]);

    // Track dirty state via useEffect — avoids illegal setState-during-render
    useEffect(() => {
        const isUnchanged = JSON.stringify(formData) === JSON.stringify(originalDataRef.current);
        setIsDirty(!isUnchanged);
    }, [formData, setIsDirty]);

    const handleFormDataChange = (newData: any) => {
        setFormData((prevData: any) =>
            typeof newData === 'function' ? newData(prevData) : newData
        );
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = convertFormToContact(formData);
            await onSave(payload);
            // Update the snapshot so subsequent edits compare against the newly saved state
            originalDataRef.current = formData;
            setIsDirty(false);
        } catch (error) {
            console.error("Failed to save contact", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseInternal = () => {
        if (isDirty) {
            setShowCloseWarning(true);
        } else {
            onClose();
        }
    };

    const handleDiscardChanges = () => {
        setShowCloseWarning(false);
        setIsDirty(false);
        onClose();
    };

    // Notes first when editing an existing contact, last when creating new
    const isNew = !contact;
    const baseTabs = isNew
        ? [
            { id: "contact-info", label: "Contact Info", icon: Users },
            { id: "resident-info", label: "Resident Info", icon: User },
            { id: "housing", label: "Housing", icon: Home },
            { id: "care-needs", label: "Care Needs", icon: Heart },
            { id: "notes", label: "Notes", icon: FileText },
        ]
        : [
            { id: "notes", label: "Notes", icon: FileText },
            { id: "contact-info", label: "Contact Info", icon: Users },
            { id: "resident-info", label: "Resident Info", icon: User },
            { id: "housing", label: "Housing", icon: Home },
            { id: "care-needs", label: "Care Needs", icon: Heart },
        ];

    const tabs = [...baseTabs];

    // Add Checklist tab if status warrants it (after Care, before Notes in new mode; after Care in edit mode)
    if (contact && (contact.status === 'Won' || contact.status === 'Closed' || formData.leadClassification === 'won')) {
        tabs.push({ id: "checklist", label: "Checklist", icon: CheckSquare });
    }

    return (
        <>
            <SlidePanel
                isOpen={isOpen}
                onClose={handleCloseInternal}
                title={contact ? "Edit Contact" : "New Contact"}
                subtitle={contact ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                        {(contact.resident_full_name && contact.resident_full_name !== (contact.first_name + " " + contact.last_name).trim()) ? (
                            <>
                                <span className="font-medium text-content-primary">{contact.resident_full_name}</span>
                                <span className="text-content-muted text-xs">•</span>
                                <span className="font-normal text-content-muted">{[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unknown"}</span>
                            </>
                        ) : (
                            <span className="font-medium text-content-primary">{[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unknown Resident"}</span>
                        )}
                    </div>
                ) : "Add a new lead or contact"}
                fullScreen
                contentClassName={activeTab === "notes" ? "flex-1 overflow-hidden flex flex-col p-6" : "flex-1 overflow-y-auto p-6"}
                headerChildren={
                    <div className="flex flex-col w-full">
                        {/* Top Row: Tabs + Save Button */}
                        <div className="flex items-center justify-between pl-4 pr-6">
                            {/* Tabs Container */}
                            <div className="flex items-start overflow-visible gap-1 pt-2 px-2">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    // Tab color uses the theme-aware surface-tab variable
                                    const tabColor = 'var(--surface-tab)';

                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => handleTabChange(tab.id as TabId)}
                                            className={`
                                                relative flex items-center gap-2 px-4 text-sm font-medium
                                                whitespace-nowrap
                                                transition-colors duration-150 select-none
                                                ${isActive
                                                    ? 'pt-[10px] pb-[11px] text-content-primary z-10 rounded-tl-lg rounded-tr-lg'
                                                    : 'pt-2 pb-2 bg-transparent text-content-muted hover:text-content-secondary hover:bg-surface-input rounded-lg'
                                                }
                                            `}
                                            style={isActive ? { backgroundColor: tabColor } : undefined}
                                        >
                                            {/* Left concave corner notch (active only) */}
                                            {isActive && (
                                                <span className="absolute bottom-0 left-[-8px] w-2 h-2 pointer-events-none">
                                                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M8 0 L8 8 L0 8 A 8 8 0 0 0 8 0 Z" fill={tabColor} />
                                                    </svg>
                                                </span>
                                            )}
                                            <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-accent' : ''}`} />
                                            {tab.label}
                                            {/* Right concave corner notch (active only) */}
                                            {isActive && (
                                                <span className="absolute bottom-0 right-[-8px] w-2 h-2 pointer-events-none">
                                                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M0 0 L0 8 L8 8 A 8 8 0 0 1 0 0 Z" fill={tabColor} />
                                                    </svg>
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Save Button Container */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="submit"
                                    form="contact-form"
                                    disabled={!isDirty || isSubmitting}
                                    className="ml-4 mr-2 md:mr-0 p-[5px] md:w-auto md:h-auto md:px-6 md:py-1.5 flex items-center justify-center text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-black/20"
                                >
                                    {isSubmitting ? "Saving..." : (
                                        <>
                                            <span className="hidden md:inline">{contact ? "Update Contact" : "Create Contact"}</span>
                                            <Save className="h-7 w-7 md:hidden" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Progress Bar Strip (Bottom Row) */}
                        <div className="w-full h-[32px] flex items-center justify-center relative" style={{ backgroundColor: 'var(--surface-tab)' }}>
                            <div className="inline-flex items-center gap-6 rounded-full px-4 py-1 shadow-sm" style={{ backgroundColor: 'var(--surface-secondary)' }}>
                                {[
                                    { value: "new", label: "New", colorVar: "--lead-new" },
                                    { value: "prospects", label: "Prospect", colorVar: "--lead-prospects" },
                                    { value: "connected", label: "Connected", colorVar: "--lead-connected" },
                                    { value: "won", label: "Won", colorVar: "--lead-won" },
                                    { value: "closed", label: "Closed", colorVar: "--lead-closed" }
                                ].map((status) => {
                                    const isActive = (formData.leadClassification || "new") === status.value;
                                    return (
                                        <div key={status.value} className="flex items-center gap-1.5 relative">
                                            <div
                                                className={`rounded-full border-2 transition-all duration-300 ${isActive ? 'w-4 h-4 shadow-lg scale-110' : 'w-2.5 h-2.5'}`}
                                                style={{ backgroundColor: `hsl(var(${status.colorVar}))`, borderColor: 'var(--surface-secondary)' }}
                                            />
                                            {isActive && (
                                                <span className="text-xs font-medium text-content-primary whitespace-nowrap">
                                                    {status.label}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                }
            >
                <form id="contact-form" onSubmit={handleSave} className={activeTab === "notes" ? "flex-1 min-h-0 flex flex-col" : "flex flex-col"}>
                    <div className={activeTab === "notes" ? "flex-1 min-h-0 flex flex-col" : ""}>
                        {activeTab === "contact-info" && (
                            <ContactInfoSection
                                formData={formData}
                                setFormData={handleFormDataChange}
                            />
                        )}

                        {activeTab === "resident-info" && (
                            <ResidentInfoSection
                                formData={formData}
                                setFormData={handleFormDataChange}
                            />
                        )}

                        {activeTab === "housing" && (
                            <HousingPreferencesSection
                                formData={formData}
                                setFormData={handleFormDataChange}
                            />
                        )}

                        {activeTab === "care-needs" && (
                            <CombinedCareSection
                                formData={formData}
                                setFormData={handleFormDataChange}
                            />
                        )}

                        {activeTab === "checklist" && (
                            <ChecklistSection
                                formData={formData}
                                setFormData={handleFormDataChange}
                            />
                        )}

                        {activeTab === "notes" && (
                            <NotesSection
                                contactId={contact?.id}
                                formData={formData}
                            // NotesSection wrapper takes formData to get ID if contactId not passed?
                            // Logic: const id = contactId || formData?.id;
                            // So passing contactId is safer.
                            />
                        )}
                    </div>
                </form>
            </SlidePanel >

            <ConfirmationModal
                isOpen={showCloseWarning}
                onClose={() => setShowCloseWarning(false)}
                onConfirm={handleDiscardChanges}
                title="Unsaved Changes"
                message="You have unsaved changes. Are you sure you want to close?"
                confirmLabel="Discard Changes"
                cancelLabel="Keep Editing"
                isDangerous={true}
            />
        </>
    );
}
