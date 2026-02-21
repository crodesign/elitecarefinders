"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, LogOut, Users, Files } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useContacts } from "@/hooks/useContacts";
import { useAuth } from "@/contexts/AuthContext";
import { useAutoSave } from "@/hooks/useAutoSave";
import { buildContactEditUrl } from "@/lib/slugUtils";
import { SaveStatusIndicator } from "./SaveStatusIndicator";
import { useUserRole } from "@/hooks/useUserRole";
import ContactProgressBar from "./ContactProgressBar";
import ContactInfoSection from "./contact-form/ContactInfoSection";
import ResidentInfoSection from "./contact-form/ResidentInfoSection";
import HousingPreferencesSection from "./contact-form/HousingPreferencesSection";
import CombinedCareSection from "./contact-form/CombinedCareSection";
import ChecklistSection from "./contact-form/ChecklistSection";
import NotesSection from "./contact-form/NotesSection";
import { parseHawaiiDate } from "@/lib/hawaiiDate";
import Link from "next/link";

interface ContactEditorProps {
    contactId?: string;
    initialData?: any;
}

const ContactEditor = ({ contactId, initialData }: ContactEditorProps) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { createContact, updateContact, deleteContact } = useContacts();
    const { signOut } = useAuth();
    const { isInvoiceOnly } = useUserRole();

    const isNew = !contactId;
    const fromPage = searchParams.get('from');

    // Check if invoice manager is accessing without proper context
    useEffect(() => {
        if (isInvoiceOnly && fromPage !== 'invoices') {
            router.push('/admin/invoices');
            return;
        }
    }, [isInvoiceOnly, fromPage, router]);

    // Special mode for invoice editing - only checklist tab and referral fields
    const isInvoiceEditMode = fromPage === 'invoices';

    const activeTabParam = searchParams.get('tab') || (isNew ? "contact-info" : "notes");
    const [activeTab, setActiveTab] = useState(isInvoiceEditMode ? "checklist" : activeTabParam);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<any>(initialData || (isNew ? { status: "Active" } : {}));
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Initialize form data from initialData if provided
    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    // Scroll to top when tab changes (skip for notes tab which uses fixed layout)
    useEffect(() => {
        if (activeTab !== 'notes') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [activeTab]);

    // Enhanced getAvailableTabs function with next tab logic
    const getAvailableTabs = () => {
        // New contacts: Notes is last. Editing contacts: Notes is first.
        const baseTabs = isNew
            ? ["contact-info", "resident-info", "housing", "care", "notes"]
            : ["notes", "contact-info", "resident-info", "housing", "care"];
        if ((formData as any)?.leadClassification === "won" || ((formData as any)?.leadClassification === "closed" && (formData as any)?.previouslyWon)) {
            baseTabs.push("checklist");
        }
        return baseTabs;
    };

    const getNextTab = (currentTab: string) => {
        const availableTabs = getAvailableTabs();
        const currentIndex = availableTabs.indexOf(currentTab);
        return currentIndex < availableTabs.length - 1 ? availableTabs[currentIndex + 1] : null;
    };

    const getPreviousTab = (currentTab: string) => {
        const availableTabs = getAvailableTabs();
        const currentIndex = availableTabs.indexOf(currentTab);
        return currentIndex > 0 ? availableTabs[currentIndex - 1] : null;
    };

    const handleNext = () => {
        const nextTab = getNextTab(activeTab);
        if (nextTab) {
            setActiveTab(nextTab);
        }
    };

    const handlePrevious = () => {
        const previousTab = getPreviousTab(activeTab);
        if (previousTab) {
            setActiveTab(previousTab);
        }
    };

    // Check if contact can be edited - allow editing even for disabled contacts in edit mode
    const canEdit = isNew || true;

    // Convert form data to contact format for database
    const convertFormToContact = useCallback((data: any) => {
        console.log('Converting form data to contact:', data);
        // Helper function to format dates properly
        const formatDate = (dateValue: any) => {
            if (!dateValue || dateValue === '') return null;
            if (typeof dateValue === 'string' && dateValue.trim() === '') return null;
            return dateValue;
        };

        // Helper function to format numeric values properly
        const formatNumeric = (numericValue: any) => {
            if (!numericValue || numericValue === '') return null;
            if (typeof numericValue === 'string' && numericValue.trim() === '') return null;
            const parsed = parseFloat(numericValue);
            return isNaN(parsed) ? null : parsed;
        };

        // Parse contactName into first and last name
        const parseContactName = (fullName: string) => {
            if (!fullName) return { first: '', last: '' };
            const parts = fullName.trim().split(' ');
            if (parts.length === 1) return { first: parts[0], last: '' };
            return { first: parts[0], last: parts.slice(1).join(' ') };
        };

        // Safety check for contactName
        const contactName = data.contactName || '';
        const parsedName = parseContactName(contactName);

        const contactData = {
            status: data.status,
            first_name: parsedName.first || data.residentFirstName || data.first_name || '',
            last_name: parsedName.last || data.residentLastName || data.last_name || '',
            resident_full_name: data.resident_full_name,
            phone: data.contactPhone,
            email: data.contactEmail,
            date_of_birth: formatDate(data.date_of_birth),
            care_level: data.leadClassification,
            dietary_needs: Array.isArray(data.careNeeds) ? data.careNeeds : (data.careNeeds ? [data.careNeeds] : []),
            medication_management: Array.isArray(data.medicationManagement) ? data.medicationManagement : (data.medicationManagement ? [data.medicationManagement] : []),
            personal_care_assistance: Array.isArray(data.careNeeds) ? data.careNeeds : (data.careNeeds ? [data.careNeeds] : []),
            health_conditions: Array.isArray(data.medicalConditions) ? data.medicalConditions : (data.medicalConditions ? [data.medicalConditions] : []),
            mobility_level: Array.isArray(data.mobilityLevel) ? data.mobilityLevel : (data.mobilityLevel ? [data.mobilityLevel] : []),
            housing_type: Array.isArray(data.housingType) ? data.housingType.join(',') : data.housingType,
            mental_health: Array.isArray(data.mentalHealth) ? data.mentalHealth : (data.mentalHealth ? [data.mentalHealth] : []),
            chest_xray: data.chestXray,
            emergency_contact_name: data.emergencyContactName,
            emergency_contact_phone: data.emergencyContactPhone,
            emergency_contact_relationship: data.emergencyContactRelationship,
            additional_notes: data.summary,
            // Contact form specific fields
            secondary_contact_name: data.secondaryContactName,
            secondary_contact_email: data.secondaryContactEmail,
            secondary_contact_phone: data.secondaryContactPhone,
            enable_secondary_contact: data.enableSecondaryContact,
            looking_for: data.lookingFor,
            referral_date: formatDate(data.referralDate),
            referral_name: data.referralName,
            referral_phone: data.referralPhone,
            referral_location: data.referralLocation,
            referral_location_address: data.referralLocationAddress,
            referral_monthly_rate: formatNumeric(data.referralMonthlyRate),
            referral_fee_percentage: formatNumeric(data.referralFeePercentage),
            referral_tax: formatNumeric(data.referralTax),
            signature_name: data.signatureName,
            signature_date: formatDate(data.signatureDate),
            signature_data: data.signatureData,
            waiver_text: data.waiverText,
            waiver_agreed: data.waiverAgreed,
            // Resident info
            street_address: data.street_address,
            city: data.city,
            state: data.state,
            zip_code: data.zip_code,
            ethnicity: data.ethnicity,
            gender: data.gender,
            height_feet: formatNumeric(data.height_feet),
            height_inches: formatNumeric(data.height_inches),
            weight: formatNumeric(data.weight),
            preferred_island: data.preferred_island,
            preferred_neighborhood: data.preferred_neighborhood,
            minimum_budget: formatNumeric(data.minimum_budget),
            maximum_budget: formatNumeric(data.maximum_budget),
            pcp_name: data.pcp_name,
            pcp_email: data.pcp_email,
            pcp_phone: data.pcp_phone,
            primary_insurance: data.primary_insurance,
            secondary_insurance: data.secondary_insurance,
            diet_restrictions: data.diet_restrictions,
            supplements: data.supplements,
            diagnoses: data.diagnoses,
            dentition: data.dentition,
            vision: data.vision,
            room_type: data.roomType,
            bathroom_type: data.bathroomType,
            shower_type: data.showerType,
            time_to_move: data.timeToMove,
            interests: data.interests,
            // Checklist fields
            actual_move_date: formatDate(data.actualMoveDate),
            covid_test: data.covidTest,
            covid_test_date: formatDate(data.covidTestDate),
            covid_test_result: data.covidTestResult,
            covid_vaccination_details: data.covidVaccinationDetails,
            tb_clearance: data.tbClearance,
            tb_clearance_field1: data.tbClearanceField1,
            tb_clearance_field2: data.tbClearanceField2,
            tb_clearance_field3: data.tbClearanceField3,
            chest_xray_date: formatDate(data.chestXrayDate),
            chest_xray_result: data.chestXrayResult,
            admission_hp: data.admissionHp,
            care_home_forms: data.careHomeForms,
            polst: data.polst,
            mar_tar: data.marTar,
            ad_poa: data.adPoa,
            ad_poa_name: data.adPoaName,
            ad_poa_phone: data.adPoaPhone,
            ad_poa_email: data.adPoaEmail,
            ad_poa_address: data.adPoaAddress,
            ad_info: data.adInfo,
            poa_hc: data.poaHc,
            poa_financial: data.poaFinancial,
            poa_comments: data.poaComments,
            email_fax_records: data.emailFaxRecords,
            records_date: formatDate(data.recordsDate),
            cma_name: data.cmaName,
            cma_phone: data.cmaPhone,
            cma_email: data.cmaEmail,
            care_provider_name: data.careProviderName,
            care_provider_phone: data.careProviderPhone,
            care_provider_email: data.careProviderEmail,
            // Invoice tracking fields
            invoice_sent: data.invoiceSent,
            invoice_sent_date: formatDate(data.invoiceSentDate),
            invoice_received: data.invoiceReceived,
            invoice_received_date: formatDate(data.invoiceReceivedDate),
            // Toggle position fields - mapping directly if present
            covid_test_toggle_position: data.covidTestTogglePosition,
            tb_clearance_toggle_position: data.tbClearanceTogglePosition,
            chest_xray_toggle_position: data.chestXrayTogglePosition,
            admission_hp_toggle_position: data.admissionHpTogglePosition,
            care_home_forms_toggle_position: data.careHomeFormsTogglePosition,
            polst_toggle_position: data.polstTogglePosition,
            mar_tar_toggle_position: data.marTarTogglePosition,
            ad_poa_toggle_position: data.adPoaTogglePosition,
            email_fax_records_toggle_position: data.emailFaxRecordsTogglePosition,
            invoice_sent_toggle_position: data.invoiceSentTogglePosition,
            invoice_received_toggle_position: data.invoiceReceivedTogglePosition,
            // Additional notes fields
            housing_additional_notes: data.housingAdditionalNotes,
            care_additional_notes: data.careAdditionalNotes,
        };

        return contactData;
    }, []);

    // Auto-save functionality
    const handleAutoSave = useCallback(async (data: any) => {
        console.log('handleAutoSave called, isNew:', isNew, 'loading:', loading);

        // Skip auto-save during loading or if no data
        if (loading || !data) {
            return;
        }

        try {
            if (isNew) {
                // For new contacts, we need to create first
                console.log('Creating new contact');
                const savedContact = await createContact(convertFormToContact(data));

                // Update URL to edit mode after creation
                const residentName = data.residentFullName || data.resident_full_name || data.contactName;
                router.replace(buildContactEditUrl(savedContact.id, residentName, {
                    ...(fromPage ? { from: fromPage } : {}),
                    tab: activeTab,
                }));
                return savedContact;
            } else {
                // Update existing contact
                if (!contactId) return; // Should not happen if isNew is false
                console.log('Updating existing contact:', contactId);
                const result = await updateContact(contactId, convertFormToContact(data));
                console.log('Update successful');
                return result;
            }
        } catch (error) {
            console.error('Auto-save failed:', error);
            throw error;
        }
    }, [isNew, createContact, updateContact, contactId, router, activeTab, convertFormToContact, fromPage, loading]);

    const autoSave = useAutoSave({
        debounceMs: 2000,
        onSave: handleAutoSave,
        onError: (error) => {
            toast({
                title: "Auto-save failed",
                description: "Your changes couldn't be saved automatically. Please try the manual save button.",
                variant: "destructive",
            });
        },
    });

    // Enhanced setFormData that triggers auto-save
    const handleFormDataChange = useCallback((newData: any) => {
        // Don't trigger auto-save during initial loading
        if (loading) {
            setFormData(typeof newData === 'function' ? (prevData: any) => newData(prevData) : newData);
            return;
        }

        setFormData((prevData: any) => {
            const updatedData = typeof newData === 'function' ? newData(prevData) : newData;

            // Only trigger auto-save if data actually changed and we have minimum required fields
            const hasChanged = JSON.stringify(prevData) !== JSON.stringify(updatedData);
            const hasMinimumFields = !!(updatedData.contactName && updatedData.contactName.trim() &&
                (updatedData.contactPhone || updatedData.contactEmail));
            const shouldSave = hasChanged && (!isNew || hasMinimumFields);

            if (shouldSave) {
                setHasUnsavedChanges(true);
                // Use setTimeout to prevent blocking the state update
                setTimeout(() => {
                    if (!loading) {
                        autoSave.save(updatedData);
                    }
                }, 100);
            }

            return updatedData;
        });
    }, [autoSave, loading, isNew]);

    // Prevent navigation if there are unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges && autoSave.status !== 'saved') {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges, autoSave.status]);

    const handleSave = async () => {
        try {
            // Force immediate save
            await autoSave.saveNow();
            setHasUnsavedChanges(false);

            toast({
                title: "Contact saved successfully",
                description: "All changes have been saved.",
            });
        } catch (error) {
            console.error('Error saving contact:', error);
            toast({
                title: "Error saving contact",
                description: "There was an error saving the contact. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async () => {
        if (!contactId) return;

        try {
            await deleteContact(contactId);

            toast({
                title: "Contact Deleted",
                description: "Contact has been deleted successfully.",
                variant: "destructive",
            });

            router.push('/admin/contacts');
        } catch (error) {
            console.error('Error deleting contact:', error);
            toast({
                title: "Error",
                description: "Failed to delete contact. Please try again.",
                variant: "destructive",
            });
        }
    };

    // Helper to go back based on context
    const goBack = () => {
        if (fromPage === 'invoices') {
            router.push('/admin/invoices');
        } else {
            router.push('/admin/contacts');
        }
    };


    return (
        <div className={`bg-background w-full ${activeTab === "notes" ? "h-full flex flex-col overflow-hidden" : "min-h-screen"}`}>
            {/* Sticky navigation - both mobile and desktop. In notes mode, we use flex-none instead of sticky to prevent scroll issues */}
            <div className={`${activeTab === "notes" ? "flex-none" : "sticky top-0 z-50"} bg-background w-full pt-2.5`}>
                <div className="w-full">
                    {/* Mobile Layout */}
                    <div className="md:hidden">
                        <div className="flex justify-between items-center px-2.5 mb-4">
                            <Button variant="outline" size="sm" onClick={goBack}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <Link href="/admin/contacts" className="flex-1 flex justify-center">
                                <span className="font-bold text-lg">Elite CareFinders</span>
                            </Link>
                            {/* SignOut Removed as it's handled by AdminLayout/Sidebar */}
                        </div>

                        {/* Mobile Tab Navigation - hidden in invoice edit mode */}
                        <div className={`flex flex-col gap-3 ${isInvoiceEditMode ? 'border-b-2 border-[rgb(221,221,221)] pb-4' : ''}`}>
                            {/* Title row with icon and save button */}
                            <div className="flex items-center justify-between px-2.5 gap-3">
                                <div className="flex flex-col flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        {isInvoiceEditMode ? <Files className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                                        <h1 className="text-xl font-normal truncate">
                                            {isInvoiceEditMode ? (formData as any)?.contactName || 'Contact' : (isNew ? 'New Contact' : `${(formData as any)?.contactName || 'Contact'}`)}
                                        </h1>
                                    </div>
                                    {/* Resident Name under contact name at 80% font size */}
                                    {!isNew && (formData as any)?.residentFullName && (formData as any)?.residentFullName !== (formData as any)?.contactName && (
                                        <div className="ml-6 text-base">
                                            <span className="font-normal text-muted-foreground">({(formData as any)?.residentFullName})</span>
                                        </div>
                                    )}
                                </div>

                                {/* Save Button with vertical layout to match desktop */}
                                <Button
                                    variant={hasUnsavedChanges ? "default" : "outline"}
                                    onClick={handleSave}
                                    className="flex flex-col items-center gap-1 h-auto py-2 px-2 shrink-0 min-w-[80px]"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <Save className="h-4 w-4" />
                                        <span className="text-sm">{hasUnsavedChanges ? "Save" : "Saved"}</span>
                                    </div>
                                    <SaveStatusIndicator
                                        status={autoSave.status}
                                        lastSaved={autoSave.lastSaved}
                                        queuedCount={autoSave.queuedCount}
                                        onRetry={autoSave.saveNow}
                                        className="scale-75"
                                    />
                                </Button>
                            </div>

                            {/* Mobile Tab Navigation - hidden in invoice edit mode */}
                            {!isInvoiceEditMode && (
                                <div className="w-full m-0 p-2.5 bg-muted">
                                    <div className="grid grid-cols-3 gap-1">
                                        {/* Edit mode: Notes first */}
                                        {!isNew && (
                                            <button
                                                onClick={() => setActiveTab("notes")}
                                                className={`px-4 py-1.5 text-sm font-medium rounded-lg border-2 transition-colors text-center ${activeTab === "notes"
                                                    ? 'bg-primary text-primary-foreground border-primary'
                                                    : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                                                    }`}
                                            >
                                                Notes
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setActiveTab("contact-info")}
                                            className={`px-4 py-1.5 text-sm font-medium rounded-lg border-2 transition-colors text-center ${activeTab === "contact-info"
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                                                }`}
                                        >
                                            Contact
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("resident-info")}
                                            className={`px-4 py-1.5 text-sm font-medium rounded-lg border-2 transition-colors text-center ${activeTab === "resident-info"
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                                                }`}
                                        >
                                            Resident
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("housing")}
                                            className={`px-4 py-1.5 text-sm font-medium rounded-lg border-2 transition-colors text-center ${activeTab === "housing"
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                                                }`}
                                        >
                                            Housing
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("care")}
                                            className={`px-4 py-1.5 text-sm font-medium rounded-lg border-2 transition-colors text-center ${activeTab === "care"
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                                                }`}
                                        >
                                            Care
                                        </button>
                                        {((formData as any)?.leadClassification === "won" || ((formData as any)?.leadClassification === "closed" && (formData as any)?.previouslyWon)) && (
                                            <button
                                                onClick={() => setActiveTab("checklist")}
                                                className={`px-4 py-1.5 text-sm font-medium rounded-lg border-2 transition-colors text-center ${activeTab === "checklist"
                                                    ? 'bg-primary text-primary-foreground border-primary'
                                                    : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                                                    }`}
                                            >
                                                Checklist
                                            </button>
                                        )}
                                        {/* New contact mode: Notes last */}
                                        {isNew && (
                                            <button
                                                onClick={() => setActiveTab("notes")}
                                                className={`px-4 py-1.5 text-sm font-medium rounded-lg border-2 transition-colors text-center ${activeTab === "notes"
                                                    ? 'bg-primary text-primary-foreground border-primary'
                                                    : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                                                    }`}
                                            >
                                                Notes
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Progress Bar - Mobile */}
                            {!isInvoiceEditMode && (
                                <ContactProgressBar currentProgress={formData.leadClassification || 'new'} className="md:hidden" />
                            )}
                        </div>
                    </div>

                    {/* Desktop/Tablet Layout */}
                    <div className="hidden md:block">
                        <div className="flex justify-between items-center px-2 mb-2">
                            <Button variant="outline" size="sm" onClick={goBack}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            {/* Center title removed for desktop as it's redundant with sidebar/header */}
                            {/* SignOut Removed */}
                        </div>

                        <div className={`flex items-center justify-between px-2 pt-0 pb-2 ${isInvoiceEditMode ? 'border-b-2 border-[rgb(221,221,221)]' : ''}`}>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-3">
                                        {isInvoiceEditMode ? <Files className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                                        <h1 className="text-3xl font-light">
                                            {isInvoiceEditMode ? (formData as any)?.contactName || 'Contact' : (isNew ? 'New Contact' : `${(formData as any)?.contactName || 'Contact'}`)}
                                        </h1>
                                    </div>
                                    {/* Resident Name under contact name at 80% font size */}
                                    {!isNew && (formData as any)?.residentFullName && (formData as any)?.residentFullName !== (formData as any)?.contactName && (
                                        <div className="ml-10 text-xl font-light text-muted-foreground">
                                            ({(formData as any)?.residentFullName})
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Save Button */}
                            <div className="flex items-center gap-4">
                                <Button
                                    variant={hasUnsavedChanges ? "default" : "outline"}
                                    onClick={handleSave}
                                    className="flex items-center gap-2 min-w-[140px]"
                                >
                                    <Save className="h-4 w-4" />
                                    <div className="flex flex-col items-start">
                                        <span className="text-sm font-medium">{hasUnsavedChanges ? "Save Changes" : "Saved"}</span>
                                        <SaveStatusIndicator
                                            status={autoSave.status}
                                            lastSaved={autoSave.lastSaved}
                                            queuedCount={autoSave.queuedCount}
                                            onRetry={autoSave.saveNow}
                                            className="p-0 border-0 bg-transparent h-auto text-[10px]"
                                        />
                                    </div>
                                </Button>
                            </div>
                        </div>

                        {/* Desktop Tab Navigation - hidden in invoice edit mode */}
                        {!isInvoiceEditMode && (
                            <div className="flex items-center justify-between pl-4 pr-6 border-b-[6px]" style={{ borderColor: 'var(--surface-tab-border)' }}>
                                <div className="flex items-start overflow-visible gap-1 pt-2 px-2">
                                    {([
                                        ...(!isNew ? [{ id: 'notes', label: 'Notes' }] : []),
                                        { id: 'contact-info', label: 'Contact Info' },
                                        { id: 'resident-info', label: 'Resident Info' },
                                        { id: 'housing', label: 'Housing Preferences' },
                                        { id: 'care', label: 'Care Needs' },
                                        ...((((formData as any)?.leadClassification === 'won') || (((formData as any)?.leadClassification === 'closed') && (formData as any)?.previouslyWon)) ? [{ id: 'checklist', label: 'Checklist' }] : []),
                                        ...(isNew ? [{ id: 'notes', label: 'Notes' }] : []),
                                    ] as { id: string; label: string }[]).map((tab) => {
                                        const isActive = activeTab === tab.id;
                                        const tabColor = 'var(--surface-tab)';
                                        return (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setActiveTab(tab.id)}
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
                                                {isActive && (
                                                    <span className="absolute bottom-0 left-[-8px] w-2 h-2 pointer-events-none">
                                                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M8 0 L8 8 L0 8 A 8 8 0 0 0 8 0 Z" fill={tabColor} />
                                                        </svg>
                                                    </span>
                                                )}
                                                {tab.label}
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
                            </div>
                        )}

                        {/* Progress Bar - Desktop */}
                        {!isInvoiceEditMode && (
                            <div className="w-full px-2 mb-4">
                                <ContactProgressBar currentProgress={formData.leadClassification || 'new'} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className={`w-full ${activeTab === "notes" ? "flex-1 min-h-0 overflow-hidden flex flex-col" : "py-2 pb-20"}`}>
                <div className={activeTab === "notes" ? "flex-1 min-h-0 flex flex-col" : "space-y-6"}>
                    {activeTab === "notes" && !isInvoiceEditMode && (
                        <NotesSection
                            formData={formData}
                            handleChange={handleFormDataChange}
                            onNext={handleNext}
                        />
                    )}

                    {activeTab === "contact-info" && !isInvoiceEditMode && (
                        <ContactInfoSection
                            formData={formData}
                            handleChange={handleFormDataChange}
                            onNext={handleNext}
                            onPrevious={handlePrevious}
                        />
                    )}

                    {activeTab === "resident-info" && !isInvoiceEditMode && (
                        <ResidentInfoSection
                            formData={formData}
                            handleChange={handleFormDataChange}
                            onNext={handleNext}
                            onPrevious={handlePrevious}
                        />
                    )}

                    {activeTab === "housing" && !isInvoiceEditMode && (
                        <HousingPreferencesSection
                            formData={formData}
                            setFormData={setFormData}
                            handleChange={handleFormDataChange}
                            onNext={handleNext}
                            onPrevious={handlePrevious}
                        />
                    )}

                    {activeTab === "care" && !isInvoiceEditMode && (
                        <CombinedCareSection
                            formData={formData}
                            setFormData={setFormData}
                            handleChange={handleFormDataChange}
                            onNext={handleNext}
                            onPrevious={handlePrevious}
                        />
                    )}

                    {activeTab === "checklist" && (
                        <ChecklistSection
                            formData={formData}
                            handleChange={handleFormDataChange}
                            onPrevious={handlePrevious}
                            // Pass contact ID for direct saves if needed
                            contactId={contactId}
                        />
                    )}

                    {/* Delete Contact Section */}
                    {!isNew && !isInvoiceEditMode && (
                        <div className="pt-10 border-t mt-10">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
                                    <p className="text-sm text-muted-foreground">Deleting a contact is permanent and cannot be undone.</p>
                                </div>
                                <Button variant="destructive" onClick={handleDelete}>
                                    Delete Contact
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactEditor;
