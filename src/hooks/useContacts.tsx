import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { generateChangeDescription } from './useContactChangeTracking';
import { getCurrentHawaiiDate } from '@/lib/hawaiiDate';

export interface Contact {
  id: string;
  user_id: string;
  status?: string;
  first_name: string;
  last_name: string;
  resident_full_name?: string;
  phone?: string;
  email?: string;
  date_of_birth?: string;
  manual_age?: number;
  care_level?: string;
  dietary_needs?: string[];
  medication_management?: string[];
  personal_care_assistance?: string[];
  health_conditions?: string[];
  mobility_level?: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  additional_notes?: string;
  // Contact form fields
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
  waiver_agreed?: boolean;
  // Resident form fields
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
  housing_type?: string[];
  room_type?: string[];
  bathroom_type?: string[];
  shower_type?: string[];
  time_to_move?: string;
  interests?: string[];
  // Checklist fields
  actual_move_date?: string;
  covid_test?: boolean;
  covid_test_date?: string;
  covid_test_result?: string;
  covid_vaccination_details?: string;
  tb_clearance?: boolean;
  tb_clearance_field1?: string;
  tb_clearance_field2?: string;
  tb_clearance_field3?: string;
  admission_hp?: boolean;
  care_home_forms?: boolean;
  polst?: boolean;
  mar_tar?: boolean;
  ad_poa?: boolean;
  ad_poa_name?: string;
  ad_poa_phone?: string;
  ad_poa_email?: string;
  ad_poa_address?: string;
  ad_info?: string;
  poa_hc?: string;
  poa_financial?: string;
  poa_comments?: string;
  email_fax_records?: boolean;
  records_date?: string;
  cma_name?: string;
  cma_phone?: string;
  cma_email?: string;
  care_provider_name?: string;
  care_provider_phone?: string;
  care_provider_email?: string;
  // Referral information fields
  referral_location?: string;
  referral_location_address?: string;
  referral_monthly_rate?: number;
  referral_fee_percentage?: number;
  referral_tax?: number;
  // Invoice fields
  invoice_sent?: boolean;
  invoice_sent_date?: string;
  invoice_received?: boolean;
  invoice_received_date?: string;
  created_at: string;
  updated_at: string;
}

export function useContacts() {
  const { user } = useAuth();

  const fetchContacts = useCallback(async (): Promise<Contact[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }

    return data || [];
  }, [user]);

  const fetchContact = useCallback(async (id: string): Promise<Contact | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching contact:', error);
      throw error;
    }

    return data;
  }, [user]);

  const createContact = useCallback(async (contactData: Omit<Contact, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Contact> => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        ...contactData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contact:', error);
      throw error;
    }

    return data;
  }, [user]);

  const updateContact = useCallback(async (id: string, contactData: Partial<Omit<Contact, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Contact> => {
    if (!user) throw new Error('User not authenticated');

    // Get the current contact before updating for change tracking
    // Note: We use the internal fetch functions not the memoized ones to ensure fresh data if needed, 
    // but here we can just query directly or use the one we have.
    // However, to keep it simple and consistent with previous logic:
    const { data: oldContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('contacts')
      .update(contactData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contact:', error);
      throw error;
    }

    // Track changes in history if there were actual changes
    if (oldContact && data) {
      try {
        const changeDescription = generateChangeDescription(oldContact, data);
        console.log('Change description generated:', changeDescription);

        // Only add history entry if there are meaningful changes
        if (changeDescription && changeDescription.trim()) {
          // Add history entry
          const today = getCurrentHawaiiDate();

          // Check if there's already an entry for today
          const { data: existingEntry } = await supabase
            .from('contact_history')
            .select('*')
            .eq('contact_id', id)
            .eq('change_date', today)
            .single();

          if (existingEntry) {
            // Merge HTML lists by combining list items
            const existingSummary = existingEntry.changes_summary;
            let updatedSummary;

            if (existingSummary.includes('<ul>') && changeDescription.includes('<ul>')) {
              // Both are HTML lists, merge the list items
              const existingItems = existingSummary.replace('<ul>', '').replace('</ul>', '');
              const newItems = changeDescription.replace('<ul>', '').replace('</ul>', '');
              updatedSummary = `<ul>${existingItems}${newItems}</ul>`;
            } else if (existingSummary.includes('<ul>')) {
              // Existing is HTML list, append new item
              updatedSummary = existingSummary.replace('</ul>', `<li>${changeDescription}</li></ul>`);
            } else {
              // Create new HTML list
              updatedSummary = changeDescription;
            }

            await supabase
              .from('contact_history')
              .update({ changes_summary: updatedSummary })
              .eq('id', existingEntry.id);
          } else {
            // Create new entry for today
            await supabase
              .from('contact_history')
              .insert({
                contact_id: id,
                user_id: user.id,
                change_date: today,
                changes_summary: changeDescription,
              });
          }
        }
      } catch (historyError) {
        // Don't fail the update if history tracking fails
        console.warn('Failed to track contact history:', historyError);
      }
    }

    return data;
  }, [user]);

  const deleteContact = useCallback(async (id: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  }, [user]);

  return {
    fetchContacts,
    fetchContact,
    createContact,
    updateContact,
    deleteContact,
  };
}