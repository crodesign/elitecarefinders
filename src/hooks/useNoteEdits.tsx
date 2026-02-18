import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface NoteEdit {
  id: string;
  note_id: string;
  content: string;
  edited_by: string;
  edited_at: string;
}

export const useNoteEdits = (noteId: string) => {
  const [edits, setEdits] = useState<NoteEdit[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEdits = async () => {
    if (!noteId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("note_edits")
        .select("*")
        .eq("note_id", noteId)
        .order("edited_at", { ascending: false });

      if (error) throw error;
      setEdits(data || []);
    } catch (error) {
      console.error("Error fetching note edits:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEdits();
  }, [noteId]);

  return { edits, loading, refetch: fetchEdits };
};
