import { Contact } from "@/hooks/useContacts";
import { parseHawaiiDate } from "@/lib/hawaiiDate";

/**
 * Ensures a value is an array, splitting comma-separated strings if necessary.
 */
function ensureArray(val: any): string[] {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val.trim() !== '') return val.split(',').map(s => s.trim());
    return [];
}

/**
 * Converts form data from the ContactForm UI into the exact `Contact` interface
 * structure expected by Supabase.
 */
export function convertFormToContact(data: any): Partial<Contact> {
    const parsedName = parseContactName(data.contactName || '');

    // Arrays needing comma-separated string joins for the DB
    const housingType = Array.isArray(data.housingType) ? data.housingType.join(',') : (data.housingType || undefined);
    const timeToMove = Array.isArray(data.timeToMove) ? data.timeToMove.join(',') : (data.timeToMove || undefined);

    // Arrays stored as native string[] in Postgres
    const roomType = ensureArray(data.roomType);
    const bathroomType = ensureArray(data.bathroomType);
    const showerType = ensureArray(data.showerType);
    const careNeeds = ensureArray(data.careNeeds);
    const dietaryNeeds = ensureArray(data.dietaryNeeds || data.diet_restrictions);
    const mobilityLevel = ensureArray(data.mobilityLevel);
    const medicalConditions = ensureArray(data.medicalConditions || data.health_conditions);
    const medicationManagement = ensureArray(data.medicationManagement);
    const interests = ensureArray(data.interests);
    const preferredIsland = ensureArray(data.preferredIsland || data.preferred_island);

    // Number conversion
    const minimumBudget = data.minimumBudget ? parseInt(data.minimumBudget.toString().replace(/,/g, ''), 10) : undefined;
    const maximumBudget = data.maximumBudget ? parseInt(data.maximumBudget.toString().replace(/,/g, ''), 10) : undefined;
    const weight = data.weight ? parseInt(data.weight.toString(), 10) : undefined;
    const heightFeet = data.heightFeet ? parseInt(data.heightFeet.toString(), 10) : undefined;
    const heightInches = data.heightInches ? parseInt(data.heightInches.toString(), 10) : undefined;
    const referralFeePercentage = data.referralFeePercentage ? parseFloat(data.referralFeePercentage.toString()) : undefined;
    const referralMonthlyRate = data.referralMonthlyRate ? parseFloat(data.referralMonthlyRate.toString()) : undefined;

    return {
        slug: data.slug || undefined,
        first_name: parsedName.first || data.residentFirstName || data.first_name || '',
        last_name: parsedName.last || data.residentLastName || data.last_name || '',
        resident_full_name: data.resident_full_name || data.residentFullName || '',
        phone: data.contactPhone || data.phone || '',
        email: data.contactEmail || data.email || '',
        status: data.status || 'Active',
        care_level: data.leadClassification || data.care_level || 'new',

        // Form mapping
        date_of_birth: data.date_of_birth || undefined,
        gender: data.gender || undefined,
        ethnicity: data.ethnicity || undefined,
        street_address: data.street_address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        zip_code: data.zip_code || undefined,

        // Arrays (text)
        housing_type: housingType as any,
        time_to_move: timeToMove as any,

        // Arrays (varchar[])
        room_type: roomType.length ? roomType : undefined,
        bathroom_type: bathroomType.length ? bathroomType : undefined,
        shower_type: showerType.length ? showerType : undefined,
        personal_care_assistance: careNeeds.length ? careNeeds : undefined,
        health_conditions: medicalConditions.length ? medicalConditions : undefined,
        mobility_level: mobilityLevel.length ? mobilityLevel : undefined,
        medication_management: medicationManagement.length ? medicationManagement : undefined,
        diet_restrictions: dietaryNeeds.length ? dietaryNeeds.join(', ') : undefined, // DB expects text here usually, or map to form
        interests: interests.length ? interests : undefined,

        preferred_island: preferredIsland.length ? preferredIsland.join(', ') : undefined,
        preferred_neighborhood: data.preferredNeighborhood || data.preferred_neighborhood || undefined,

        // Numbers
        minimum_budget: isNaN(minimumBudget as number) ? undefined : minimumBudget,
        maximum_budget: isNaN(maximumBudget as number) ? undefined : maximumBudget,
        weight: isNaN(weight as number) ? undefined : weight,
        height_feet: isNaN(heightFeet as number) ? undefined : heightFeet,
        height_inches: isNaN(heightInches as number) ? undefined : heightInches,
        referral_fee_percentage: isNaN(referralFeePercentage as number) ? undefined : referralFeePercentage,
        referral_monthly_rate: isNaN(referralMonthlyRate as number) ? undefined : referralMonthlyRate,

        // Relationships
        secondary_contact_name: data.secondaryContactName || undefined,
        secondary_contact_phone: data.secondaryContactPhone || undefined,
        secondary_contact_email: data.secondaryContactEmail || undefined,
        enable_secondary_contact: typeof data.enableSecondaryContact === 'boolean' ? data.enableSecondaryContact : undefined,

        emergency_contact_name: data.emergencyContactName || undefined,
        emergency_contact_phone: data.emergencyContactPhone || undefined,
        emergency_contact_relationship: data.emergencyContactRelationship || undefined,

        pcp_name: data.pcp_name || undefined,
        pcp_phone: data.pcp_phone || undefined,
        pcp_email: data.pcp_email || undefined,

        cma_name: data.cma_name || undefined,
        cma_phone: data.cma_phone || undefined,
        cma_email: data.cma_email || undefined,

        care_provider_name: data.care_provider_name || undefined,
        care_provider_phone: data.care_provider_phone || undefined,
        care_provider_email: data.care_provider_email || undefined,

        ad_poa_name: data.adPoaName || data.ad_poa_name || undefined,
        ad_poa_phone: data.adPoaPhone || data.ad_poa_phone || undefined,
        ad_poa_email: data.adPoaEmail || data.ad_poa_email || undefined,
        ad_poa_address: data.adPoaAddress || data.ad_poa_address || undefined,

        // Referral/Intake
        referral_name: data.referralName || undefined,
        referral_phone: data.referralPhone || undefined,
        referral_date: data.referralDate || undefined,
        referral_location: data.referralLocation || undefined,
        referral_location_address: data.referralLocationAddress || undefined,
        referral_tax: data.referralTax || undefined,
        actual_move_date: data.actualMoveDate || data.actual_move_date || undefined,
        looking_for: data.lookingFor || undefined,

        // Medical / Assessment
        diagnoses: data.diagnoses || undefined,
        primary_insurance: data.primary_insurance || undefined,
        secondary_insurance: data.secondary_insurance || undefined,
        supplements: data.supplements || undefined,
        dentition: data.dentition || undefined,
        vision: data.vision || undefined,

        covid_test: typeof data.covidTest === 'boolean' ? data.covidTest : undefined,
        covid_test_date: data.covidTestDate || undefined,
        covid_test_result: data.covidTestResult || undefined,
        covid_vaccination_details: data.covidVaccinationDetails || undefined,

        tb_clearance: typeof data.tbClearance === 'boolean' ? data.tbClearance : undefined,
        tb_clearance_field1: data.tbClearanceField1 || undefined,
        tb_clearance_field2: data.tbClearanceField2 || undefined,
        tb_clearance_field3: data.tbClearanceField3 || undefined,

        chest_xray: typeof data.chestXray === 'boolean' ? data.chestXray : undefined,
        chest_xray_date: data.chestXrayDate || undefined,
        chest_xray_result: data.chestXrayResult || undefined,

        // Booleans
        admission_hp: typeof data.admissionHp === 'boolean' ? data.admissionHp : undefined,
        care_home_forms: typeof data.careHomeForms === 'boolean' ? data.careHomeForms : undefined,
        polst: typeof data.polst === 'boolean' ? data.polst : undefined,
        mar_tar: typeof data.marTar === 'boolean' ? data.marTar : undefined,
        ad_poa: typeof data.adPoa === 'boolean' ? data.adPoa : undefined,
        email_fax_records: typeof data.emailFaxRecords === 'boolean' ? data.emailFaxRecords : undefined,

        // Waiver
        waiver_agreed: typeof data.waiverAgreed === 'boolean' ? data.waiverAgreed : undefined,
        signature_name: data.signatureName || undefined,
        signature_date: data.signatureDate || undefined,
        signature_data: data.signatureData || undefined,
        waiver_text: data.waiverText || undefined,

        // Invoice logic
        invoice_sent: typeof data.invoiceSent === 'boolean' ? data.invoiceSent : undefined,
        invoice_sent_date: data.invoiceSentDate || undefined,
        invoice_received: typeof data.invoiceReceived === 'boolean' ? data.invoiceReceived : undefined,
        invoice_received_date: data.invoiceReceivedDate || undefined,

        // Notes
        additional_notes: data.summary || undefined,
        housing_additional_notes: data.housingAdditionalNotes || undefined,
        care_additional_notes: data.careAdditionalNotes || undefined,
        ad_info: data.adInfo || undefined,
        poa_hc: data.poaHc || undefined,
        poa_financial: data.poaFinancial || undefined,
        poa_comments: data.poaComments || undefined,
    };
}

/**
 * Parses "First Last" into { first: "First", last: "Last" }
 */
export function parseContactName(fullName: string): { first: string, last: string } {
    if (!fullName || typeof fullName !== 'string') {
        return { first: '', last: '' };
    }
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
        return { first: parts[0], last: '' };
    }
    return {
        first: parts[0],
        last: parts.slice(1).join(' ')
    };
}
