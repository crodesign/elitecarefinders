import { supabase } from '@/lib/supabase';

export interface PublicContact {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  resident_full_name?: string;
  date_of_birth?: string;
  care_level?: string;
  status?: string;
  dietary_needs?: string[];
  medication_management?: string[];
  personal_care_assistance?: string[];
  health_conditions?: string[];
  mobility_level?: string[];
  housing_type?: string;
  mental_health?: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  additional_notes?: string;
  secondary_contact_name?: string;
  secondary_contact_email?: string;
  secondary_contact_phone?: string;
  enable_secondary_contact?: boolean;
  looking_for?: string;
  referral_date?: string;
  referral_name?: string;
  referral_phone?: string;
  signature_name?: string;
  signature_date?: string;
  signature_data?: string;
  waiver_text?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  ethnicity?: string;
  gender?: string;
  height_feet?: number;
  height_inches?: number;
  weight?: number;
  preferred_island?: string;
  preferred_neighborhood?: string;
  minimum_budget?: number;
  maximum_budget?: number;
  pcp_name?: string;
  pcp_email?: string;
  pcp_phone?: string;
  primary_insurance?: string;
  secondary_insurance?: string;
  diet_restrictions?: string;
  supplements?: string;
  diagnoses?: string;
  dentition?: string;
  vision?: string;
  room_type?: string[];
  bathroom_type?: string[];
  shower_type?: string[];
  time_to_move?: string;
  interests?: string[];
}

export function usePublicContacts() {
  const createPublicContact = async (contactData: PublicContact): Promise<any> => {
    // Use null user_id for public submissions to avoid foreign key constraint
    const publicContactData = {
      ...contactData,
      user_id: null,
      status: contactData.status || 'Active',
      care_level: contactData.care_level || 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('Creating public contact with data:', publicContactData);

    const { data, error } = await supabase
      .from('contacts')
      .insert([publicContactData])
      .select()
      .single();

    if (error) {
      console.error('Error creating public contact:', error);
      throw error;
    }

    console.log('Public contact created successfully:', data);
    return data;
  };

  const updatePublicContact = async (contactId: string, contactData: PublicContact): Promise<any> => {
    const publicContactData = {
      ...contactData,
      updated_at: new Date().toISOString(),
    };

    console.log('Updating public contact with ID:', contactId, 'data:', publicContactData);

    const { data, error } = await supabase
      .from('contacts')
      .update(publicContactData)
      .eq('id', contactId)
      .select()
      .single();

    if (error) {
      console.error('Error updating public contact:', error);
      throw error;
    }

    console.log('Public contact updated successfully:', data);
    return data;
  };

  return {
    createContact: createPublicContact,
    updateContact: updatePublicContact,
  };
}