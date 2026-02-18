import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';
import { getCurrentHawaiiDate } from '@/lib/hawaiiDate';

export interface ContactEditsEntry {
  id: string;
  contact_id: string;
  user_id: string;
  change_date: string;
  changes_summary: string;
  created_at: string;
  updated_at: string;
}

export function useContactEdits(contactId: string) {
  const [edits, setEdits] = useState<ContactEditsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchEdits = useCallback(async () => {
    if (!user || !contactId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contact_history')
        .select('*')
        .eq('contact_id', contactId)
        .order('change_date', { ascending: false });

      if (error) {
        console.error('Error fetching history:', error);
        throw error;
      }

      setEdits(data || []);
    } catch (err) {
      console.error('Error loading edits:', err);
      toast({
        title: "Error",
        description: "Failed to load contact edits. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, contactId, toast]);

  const addEditsEntry = async (changesSummary: string): Promise<ContactEditsEntry | null> => {
    if (!user || !contactId || !changesSummary.trim()) return null;

    // Don't record empty changes or generic messages
    if (!changesSummary || changesSummary.trim() === '' ||
      changesSummary.includes('Contact information updated')) {
      return null;
    }

    try {
      const today = getCurrentHawaiiDate(); // Get date in YYYY-MM-DD format in Hawaii timezone

      // Check if there's already an entry for today
      const { data: existingEntry, error: fetchError } = await supabase
        .from('contact_history')
        .select('*')
        .eq('contact_id', contactId)
        .eq('change_date', today)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingEntry) {
        // Merge HTML lists by combining list items
        const existingSummary = existingEntry.changes_summary;
        let updatedSummary;

        if (existingSummary.includes('<ul>') && changesSummary.includes('<ul>')) {
          // Both are HTML lists, merge the list items
          const existingItems = existingSummary.replace('<ul>', '').replace('</ul>', '');
          const newItems = changesSummary.replace('<ul>', '').replace('</ul>', '');
          updatedSummary = `<ul>${existingItems}${newItems}</ul>`;
        } else if (existingSummary.includes('<ul>')) {
          // Existing is HTML list, append new item
          updatedSummary = existingSummary.replace('</ul>', `<li>${changesSummary}</li></ul>`);
        } else if (changesSummary.includes('<ul>')) {
          // New is HTML list, convert existing to list item and merge
          updatedSummary = changesSummary.replace('</ul>', `<li>${existingSummary}</li></ul>`);
        } else {
          // Neither is HTML list, create new list
          updatedSummary = `<ul><li>${existingSummary}</li><li>${changesSummary}</li></ul>`;
        }

        const { data, error } = await supabase
          .from('contact_history')
          .update({ changes_summary: updatedSummary })
          .eq('id', existingEntry.id)
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setEdits(prev => prev.map(entry =>
          entry.id === existingEntry.id ? data : entry
        ));

        return data;
      } else {
        // Create new entry for today with HTML list format
        const { data, error } = await supabase
          .from('contact_history')
          .insert({
            contact_id: contactId,
            user_id: user.id,
            change_date: today,
            changes_summary: changesSummary.includes('<ul>') ? changesSummary : `<ul><li>${changesSummary.trim()}</li></ul>`,
          })
          .select()
          .single();

        if (error) throw error;

        // Add to local state
        setEdits(prev => [data, ...prev]);

        return data;
      }
    } catch (err) {
      console.error('Error adding edits entry:', err);
      toast({
        title: "Error",
        description: "Failed to add edits entry. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteEdit = async (editId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('contact_history')
        .delete()
        .eq('id', editId);

      if (error) throw error;

      // Remove from local state
      setEdits(prev => prev.filter(edit => edit.id !== editId));

      toast({
        title: "Success",
        description: "Contact edit deleted successfully.",
      });

      return true;
    } catch (err) {
      console.error('Error deleting edit:', err);
      toast({
        title: "Error",
        description: "Failed to delete contact edit. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    if (contactId) {
      fetchEdits();
    }
  }, [contactId, user, fetchEdits]);

  return {
    edits,
    loading,
    addEditsEntry,
    deleteEdit,
    refetch: fetchEdits,
  };
}