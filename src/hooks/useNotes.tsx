import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';

export interface Note {
  id: string;
  contact_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function useNotes(contactId: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const fetchNotes = async () => {
    if (!user || !contactId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notes:', error);
        throw error;
      }

      setNotes(data || []);
    } catch (err) {
      console.error('Error loading notes:', err);
      toast({
        title: "Error",
        description: "Failed to load notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user || !contactId) {
      setLoading(false);
      return;
    }

    fetchNotes();
  }, [contactId, user, authLoading]);

  const addNote = async (content: string): Promise<Note | null> => {
    if (!user || !contactId || !content.trim()) return null;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          contact_id: contactId,
          user_id: user.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating note:', error);
        throw error;
      }

      setNotes((prev) => [data, ...prev]);


      return data;
    } catch (err) {
      console.error('Error adding note:', err);
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateNote = async (noteId: string, content: string): Promise<Note | null> => {
    if (!user || !content.trim()) return null;

    try {
      const { data, error } = await supabase
        .from('notes')
        .update({ content: content.trim() })
        .eq('id', noteId)
        .select()
        .single();

      if (error) {
        console.error('Error updating note:', error);
        throw error;
      }

      setNotes((prev) => prev.map(note =>
        note.id === noteId ? data : note
      ));

      toast({
        title: "Success",
        description: "Note updated successfully.",
      });

      return data;
    } catch (err) {
      console.error('Error updating note:', err);
      toast({
        title: "Error",
        description: "Failed to update note. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteNote = async (noteId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) {
        console.error('Error deleting note:', error);
        throw error;
      }

      setNotes((prev) => prev.filter(note => note.id !== noteId));
      toast({
        title: "Success",
        description: "Note deleted successfully.",
      });

      return true;
    } catch (err) {
      console.error('Error deleting note:', err);
      toast({
        title: "Error",
        description: "Failed to delete note. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };



  return {
    notes,
    loading,
    addNote,
    updateNote,
    deleteNote,
    refetch: fetchNotes,
  };
}