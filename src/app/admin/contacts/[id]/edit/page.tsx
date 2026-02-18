"use client";

import { useEffect, useState } from "react";
import ContactEditor from "@/components/contacts/ContactEditor";
import { useContacts } from "@/hooks/useContacts";
import { useParams } from "next/navigation";
import { parseHawaiiDate } from "@/lib/hawaiiDate";

const EditContactPage = () => {
    const params = useParams();
    const id = params?.id as string;
    const { fetchContact } = useContacts();
    const [contactData, setContactData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadContact = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const contact = await fetchContact(id);
                if (contact) {
                    // Convert database contact to form format matching ContactEditor expectations
                    // Ideally this conversion logic should be shared, but for now we replicate it or rely on ContactEditor to handle it
                    // However, ContactEditor expects specific structure. Let's map it here.

                    // Helper to ensure array format
                    const toArray = (val: any) => Array.isArray(val) ? val : (val ? [val] : []);

                    // Helper for housing type split
                    const toHousingType = (val: any) => typeof val === 'string' ? val.split(',') : (val || []);

                    const convertedData = {
                        // Database ID
                        id: contact.id,
                        status: contact.status || "Active",
                        leadClassification: contact.care_level || "connected",
                        contactName: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Contact',
                        contactPhone: contact.phone || "",
                        contactEmail: contact.email || "",
                        residentFirstName: contact.first_name,
                        residentLastName: contact.last_name,
                        resident_full_name: contact.resident_full_name || `${contact.first_name} ${contact.last_name}`,
                        residentFullName: contact.resident_full_name || `${contact.first_name} ${contact.last_name}`,
                        residentAge: contact.date_of_birth ? (() => {
                            const birthDate = parseHawaiiDate(contact.date_of_birth);
                            return birthDate ? new Date().getFullYear() - birthDate.getFullYear() : "";
                        })() : "",
                        date_of_birth: contact.date_of_birth || "",
                        housingType: toHousingType((contact as any).housing_type),
                        careNeeds: toArray(contact.personal_care_assistance),
                        medicalConditions: toArray(contact.health_conditions),
                        mobilityLevel: toArray(contact.mobility_level),
                        medicationManagement: toArray(contact.medication_management),
                        chestXray: (contact as any).chest_xray || false,
                        summary: contact.additional_notes || "",
                        // Contact form fields
                        secondaryContactName: contact.secondary_contact_name || "",
                        secondaryContactEmail: contact.secondary_contact_email || "",
                        secondaryContactPhone: contact.secondary_contact_phone || "",
                        enableSecondaryContact: contact.enable_secondary_contact || false,
                        lookingFor: contact.looking_for || "",
                        referralDate: contact.referral_date || "",
                        referralName: contact.referral_name || "",
                        referralPhone: contact.referral_phone || "",
                        signatureName: contact.signature_name || "",
                        signatureDate: contact.signature_date || "",
                        signatureData: (contact as any).signature_data || "",
                        waiverText: contact.waiver_text || "",
                        // Resident form fields
                        street_address: contact.street_address || "",
                        city: contact.city || "",
                        state: contact.state || "",
                        zip_code: contact.zip_code || "",
                        ethnicity: contact.ethnicity || "",
                        gender: contact.gender || "",
                        height_feet: contact.height_feet || "",
                        height_inches: contact.height_inches || "",
                        weight: contact.weight || "",
                        preferred_island: (contact as any).preferred_island || "Oahu",
                        preferred_neighborhood: (contact as any).preferred_neighborhood || "",
                        minimum_budget: contact.minimum_budget || "",
                        maximum_budget: contact.maximum_budget || "",
                        pcp_name: contact.pcp_name || "",
                        pcp_email: contact.pcp_email || "",
                        pcp_phone: contact.pcp_phone || "",
                        diagnoses: contact.diagnoses || "",
                        primary_insurance: contact.primary_insurance || "",
                        secondary_insurance: contact.secondary_insurance || "",
                        diet_restrictions: contact.diet_restrictions || "",
                        supplements: contact.supplements || "",
                        dentition: contact.dentition || "",
                        vision: contact.vision || "",
                        roomType: contact.room_type || [],
                        bathroomType: contact.bathroom_type || [],
                        showerType: contact.shower_type || [],
                        timeToMove: contact.time_to_move || "",
                        interests: contact.interests || [],
                        // Checklist fields
                        actualMoveDate: contact.actual_move_date || "",
                        referralLocation: (contact as any).referral_location || "",
                        referralLocationAddress: (contact as any).referral_location_address || "",
                        referralMonthlyRate: (contact as any).referral_monthly_rate || "",
                        referralFeePercentage: (contact as any).referral_fee_percentage || "",
                        referralTax: (contact as any).referral_tax || "",
                        covidTest: contact.covid_test || false,
                        covidTestDate: contact.covid_test_date || "",
                        covidTestResult: contact.covid_test_result || "",
                        covidVaccinationDetails: contact.covid_vaccination_details || "",
                        tbClearance: contact.tb_clearance || false,
                        tbClearanceField1: contact.tb_clearance_field1 || "",
                        tbClearanceField2: contact.tb_clearance_field2 || "",
                        tbClearanceField3: contact.tb_clearance_field3 || "",
                        chestXrayDate: (contact as any).chest_xray_date || "",
                        chestXrayResult: (contact as any).chest_xray_result || "",
                        admissionHp: contact.admission_hp || false,
                        careHomeForms: contact.care_home_forms || false,
                        polst: contact.polst || false,
                        marTar: contact.mar_tar || false,
                        adPoa: contact.ad_poa || false,
                        adPoaName: contact.ad_poa_name || "",
                        adPoaPhone: contact.ad_poa_phone || "",
                        adPoaEmail: contact.ad_poa_email || "",
                        adPoaAddress: contact.ad_poa_address || "",
                        adInfo: contact.ad_info || "",
                        poaHc: contact.poa_hc || "",
                        poaFinancial: contact.poa_financial || "",
                        poaComments: contact.poa_comments || "",
                        emailFaxRecords: contact.email_fax_records || false,
                        recordsDate: contact.records_date || "",
                        cmaName: contact.cma_name || "",
                        cmaPhone: contact.cma_phone || "",
                        cmaEmail: contact.cma_email || "",
                        careProviderName: contact.care_provider_name || "",
                        careProviderPhone: contact.care_provider_phone || "",
                        careProviderEmail: contact.care_provider_email || "",
                        // Invoice tracking fields
                        invoiceSent: contact.invoice_sent || false,
                        invoiceSentDate: contact.invoice_sent_date || "",
                        invoiceReceived: contact.invoice_received || false,
                        invoiceReceivedDate: contact.invoice_received_date || "",
                        // Toggle position fields
                        covidTestTogglePosition: (contact as any).covid_test_toggle_position || false,
                        tbClearanceTogglePosition: (contact as any).tb_clearance_toggle_position || false,
                        chestXrayTogglePosition: (contact as any).chest_xray_toggle_position || false,
                        admissionHpTogglePosition: (contact as any).admission_hp_toggle_position || false,
                        careHomeFormsTogglePosition: (contact as any).care_home_forms_toggle_position || false,
                        polstTogglePosition: (contact as any).polst_toggle_position || false,
                        marTarTogglePosition: (contact as any).mar_tar_toggle_position || false,
                        adPoaTogglePosition: (contact as any).ad_poa_toggle_position || false,
                        emailFaxRecordsTogglePosition: (contact as any).email_fax_records_toggle_position || false,
                        invoiceSentTogglePosition: (contact as any).invoice_sent_toggle_position || false,
                        invoiceReceivedTogglePosition: (contact as any).invoice_received_toggle_position || false,
                        // Additional notes fields
                        housingAdditionalNotes: (contact as any).housing_additional_notes || "",
                        careAdditionalNotes: (contact as any).care_additional_notes || "",
                        // Database metadata - only keep essential fields
                        created_at: contact.created_at,
                        updated_at: contact.updated_at
                    };

                    setContactData(convertedData);
                }
            } catch (error) {
                console.error("Error loading contact:", error);
            } finally {
                setLoading(false);
            }
        };

        loadContact();
    }, [id, fetchContact]);

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    if (!contactData) {
        return <div>Contact not found</div>;
    }

    return (
        <ContactEditor contactId={id} initialData={contactData} />
    );
};

export default EditContactPage;
