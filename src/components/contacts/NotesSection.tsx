import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Minus, Calendar, Trash2, Edit2, Check, X, Download } from "lucide-react";
import { useNotes } from "@/hooks/useNotes";
import { useNoteEdits } from "@/hooks/useNoteEdits";
import { format } from "date-fns";
import ContactEditsSection from "./ContactEditsSection";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface NotesSectionProps {
  contactId: string;
  readOnly?: boolean;
}

const NotesSection = ({ contactId, readOnly = false }: NotesSectionProps) => {
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editsLoaded, setEditsLoaded] = useState(false);
  const [editsLoading, setEditsLoading] = useState(false);
  const { notes, loading, addNote, updateNote, deleteNote } = useNotes(contactId);

  const handleEditsTabClick = () => {
    if (!editsLoaded) {
      setEditsLoading(true);
      // Simulate loading delay for better UX
      setTimeout(() => {
        setEditsLoaded(true);
        setEditsLoading(false);
      }, 500);
    }
  };

  const handleAddNote = async () => {
    if (newNote.trim()) {
      const success = await addNote(newNote);
      if (success) {
        setNewNote("");
      }
    }
  };

  const handleEditNote = (noteId: string, content: string) => {
    setEditingNoteId(noteId);
    setEditContent(content);
  };

  const handleSaveEdit = async (noteId: string) => {
    if (editingNoteId && editContent.trim()) {
      const success = await updateNote(editingNoteId, editContent);
      if (success) {
        setEditingNoteId(null);
        setEditContent("");
        // Force refresh of the specific note
        window.dispatchEvent(new CustomEvent('note-updated', { detail: { noteId } }));
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditContent("");
  };

  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      await deleteNote(noteId);
    }
  };

  const handleDownloadNotes = () => {
    if (notes.length === 0) {
      alert("No notes to download");
      return;
    }

    const notesContent = notes.map(note => {
      const date = formatDate(note.created_at);
      const time = formatTime(note.created_at);
      const edited = note.updated_at !== note.created_at ? " (edited)" : "";
      return `Date: ${date} at ${time}${edited}\n${note.content}\n${'='.repeat(50)}`;
    }).join('\n\n');

    const blob = new Blob([notesContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contact-notes-${contactId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (date: string) => {
    if (!date) return "";
    try {
      const fullDate = format(new Date(date), "MMMM do, yyyy");
      // Get the first 3 letters of the month
      const parts = fullDate.split(' ');
      if (parts[0]) {
        parts[0] = parts[0].substring(0, 3);
      }
      return parts.join(' ');
    } catch {
      return date;
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="notes" className="space-y-6 pb-[400px]">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="notes">Notes</TabsTrigger>
        <TabsTrigger value="edits" onClick={handleEditsTabClick}>Edits</TabsTrigger>
      </TabsList>

      <TabsContent value="notes" className="space-y-6">
        {/* Add New Note */}
        {!readOnly && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add New Note
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadNotes}
                  disabled={notes.length === 0}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download Notes</span>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-note" className="text-zinc-400">Note Content</Label>
                <Textarea
                  id="new-note"
                  placeholder="Enter your note here..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[200px] bg-black/30 border-transparent text-white placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 focus:ring-0 focus:border-white/10 transition-colors resize-none"
                />
              </div>
              <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Note
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Existing Notes */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Notes History</h3>
          {notes.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-6">
                <p className="text-muted-foreground italic text-center">No notes added yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-0 divide-y-2 divide-white/10">
              {notes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  editingNoteId={editingNoteId}
                  editContent={editContent}
                  readOnly={readOnly}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  onEdit={handleEditNote}
                  onSave={() => handleSaveEdit(note.id)}
                  onCancel={handleCancelEdit}
                  onDelete={handleDeleteNote}
                  onEditContentChange={setEditContent}
                />
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="edits" className="space-y-6">
        {editsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading contact edits...</p>
          </div>
        ) : editsLoaded ? (
          <ContactEditsSection contactId={contactId} />
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Click to load contact edits</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

interface NoteItemProps {
  note: any;
  editingNoteId: string | null;
  editContent: string;
  readOnly: boolean;
  formatDate: (date: string) => string;
  formatTime: (date: string) => string;
  onEdit: (noteId: string, content: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (noteId: string) => void;
  onEditContentChange: (content: string) => void;
}

const NoteItem = ({
  note,
  editingNoteId,
  editContent,
  readOnly,
  formatDate,
  formatTime,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onEditContentChange
}: NoteItemProps) => {
  const { edits, refetch } = useNoteEdits(note.id);
  const [expandedEdits, setExpandedEdits] = useState<Set<string>>(new Set());
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Focus textarea and move cursor to end when editing starts
  useEffect(() => {
    if (editingNoteId === note.id && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      // Move cursor to end
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      // Scroll the textarea into view on mobile/tablet only (not desktop)
      const isMobileOrTablet = window.innerWidth < 1024;
      if (isMobileOrTablet) {
        setTimeout(() => {
          const textareaRect = textarea.getBoundingClientRect();
          const headerHeight = 260; // Increased offset to prevent field from going behind header
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const targetScroll = scrollTop + textareaRect.top - headerHeight;

          window.scrollTo({ top: targetScroll, behavior: 'smooth' });
        }, 100);
      }
    }
  }, [editingNoteId, note.id]);

  // Listen for note updates to refresh edits
  useEffect(() => {
    const handleNoteUpdate = (e: CustomEvent) => {
      if (e.detail?.noteId === note.id) {
        refetch();
      }
    };
    window.addEventListener('note-updated', handleNoteUpdate as EventListener);
    return () => window.removeEventListener('note-updated', handleNoteUpdate as EventListener);
  }, [note.id, refetch]);

  const toggleEdit = (editId: string) => {
    setExpandedEdits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(editId)) {
        newSet.delete(editId);
      } else {
        newSet.add(editId);
      }
      return newSet;
    });
  };

  // Sort edits chronologically (ascending by edited_at)
  const sortedEdits = [...edits].sort((a, b) =>
    new Date(a.edited_at).getTime() - new Date(b.edited_at).getTime()
  );

  return (
    <div className="py-4 first:pt-0">
      {editingNoteId === note.id ? (
        <div className="space-y-2">
          <Textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => onEditContentChange(e.target.value)}
            className="min-h-[200px] bg-black/30 border-transparent text-white placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 focus:ring-0 focus:border-white/10 transition-colors resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={onSave}>
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* First row: timestamp and buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(note.created_at)} at {formatTime(note.created_at)}</span>
            </div>
            {!readOnly && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={() => onEdit(note.id, note.content)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  className="bg-red-500 hover:bg-red-600 text-white"
                  onClick={() => onDelete(note.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Content area - full width */}
          <div className="space-y-4">
            {/* Original note content */}
            {sortedEdits.length > 0 && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {sortedEdits[0].content}
              </p>
            )}

            {/* Each edit shows the new content after that edit */}
            {sortedEdits.length > 0 && (
              <div className="space-y-4 pl-4">
                {sortedEdits.map((edit, index) => {
                  const contentAfterEdit = index < sortedEdits.length - 1
                    ? sortedEdits[index + 1].content
                    : note.content;
                  const isLastEdit = index === sortedEdits.length - 1;
                  const isExpanded = expandedEdits.has(edit.id);

                  return (
                    <div key={edit.id}>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        {!isLastEdit && (
                          <button
                            onClick={() => toggleEdit(edit.id)}
                            className="hover:text-foreground transition-colors"
                            aria-label={isExpanded ? "Collapse edit" : "Expand edit"}
                          >
                            {isExpanded ? (
                              <Minus className="h-4 w-4" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        <Calendar className="h-4 w-4" />
                        <span className="italic">Edit: {formatDate(edit.edited_at)} at {formatTime(edit.edited_at)}</span>
                      </div>
                      {(isLastEdit || isExpanded) && (
                        <div className="overflow-hidden animate-accordion-down">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                            {contentAfterEdit}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* If no edits exist, show current content */}
            {sortedEdits.length === 0 && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesSection;
