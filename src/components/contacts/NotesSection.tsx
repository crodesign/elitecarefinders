import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Minus, Calendar, Trash2, Edit2, Check, X, Download, Mic, MicOff } from "lucide-react";
import { HeartLoader } from "@/components/ui/HeartLoader";
import { useNotes } from "@/hooks/useNotes";
import { useNoteEdits } from "@/hooks/useNoteEdits";
import { format } from "date-fns";
import { ContactDocumentsGallery } from "./ContactDocumentsGallery";


interface NotesSectionProps {
  contactId: string;
  readOnly?: boolean;
}

const NotesSection = ({ contactId, readOnly = false }: NotesSectionProps) => {
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const { notes, loading, addNote, updateNote, deleteNote } = useNotes(contactId);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  function buildRecognition(SR: any) {
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (e: any) => {
      let interim = "";
      let finalChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalChunk += t;
        else interim += t;
      }
      if (finalChunk) {
        setNewNote(prev => {
          const sep = prev && !prev.endsWith(" ") ? " " : "";
          return prev + sep + finalChunk.trim();
        });
        setInterimText("");
      } else {
        setInterimText(interim);
      }
    };

    recognition.onerror = () => {
      shouldRestartRef.current = false;
      setIsListening(false);
      setInterimText("");
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        // Auto-restart so Chrome treats each segment as a complete utterance,
        // which triggers its punctuation model properly.
        const next = buildRecognition(SR);
        recognitionRef.current = next;
        next.start();
      } else {
        setIsListening(false);
        setInterimText("");
      }
    };

    return recognition;
  }

  function startListening() {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition is not supported in this browser. Use Chrome or Edge.");
      return;
    }
    shouldRestartRef.current = true;
    const recognition = buildRecognition(SR);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  function stopListening() {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimText("");
  }



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
        <div className="flex justify-center">
          <HeartLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Column 1: Documents Gallery + Add New Note */}
        <div className="flex flex-col gap-4 min-h-0">
          <div className="bg-surface-input rounded-lg p-[5px] flex-1 min-h-0 overflow-y-auto" style={{ border: '2px solid var(--form-border)', backgroundColor: 'var(--form-bg)' }}>
            <ContactDocumentsGallery contactId={contactId} readOnly={readOnly} />
          </div>
          {!readOnly && (
            <Card className="bg-surface-input border-transparent">
              <CardHeader className="p-[5px] pl-[15px]">
                <CardTitle className="flex items-center justify-between text-content-primary">
                  <div className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add New Note
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadNotes}
                    disabled={notes.length === 0}
                    className="p-1.5 rounded-lg bg-white dark:bg-black text-content-secondary hover:bg-accent hover:text-white transition-colors disabled:opacity-30"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-[5px] space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between pl-[10px]">
                    <Label htmlFor="new-note" className="text-content-muted">Note Content</Label>
                    <button
                      type="button"
                      onClick={isListening ? stopListening : startListening}
                      title={isListening ? "Stop recording" : "Start voice input"}
                      className={`p-1.5 rounded-lg transition-colors ${isListening ? "bg-red-500 text-white animate-pulse" : "bg-white dark:bg-black text-content-secondary hover:bg-accent hover:text-white"}`}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  </div>
                  <textarea
                    id="new-note"
                    placeholder="Enter your note here..."
                    value={isListening && interimText ? newNote + (newNote && !newNote.endsWith(" ") ? " " : "") + interimText : newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors bg-surface-input text-content-primary placeholder:text-content-muted hover:bg-surface-hover focus:bg-surface-hover min-h-[200px] resize-y"
                  />
                </div>
                <Button onClick={handleAddNote} disabled={!newNote.trim()} className="bg-accent hover:bg-accent-light text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Note
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Column 2: Notes History — fixed header, scrollable body only */}
        <div className="flex flex-col min-h-0 border-2 rounded-md" style={{ borderColor: 'var(--surface-input)' }}>
          <h3 className="flex-none text-lg font-semibold text-content-primary py-3 px-6 bg-surface-input rounded-t-md" style={{ borderBottom: '2px solid var(--form-border)' }}>Notes History</h3>
          <div className="flex-1 min-h-0 overflow-y-auto pt-4 pb-4">
            {notes.length === 0 ? (
              <div className="px-6 py-4">
                <p className="text-muted-foreground italic text-center">No notes added yet</p>
              </div>
            ) : (
              <div className="divide-y-2 divide-ui-border px-6">
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
        </div>
      </div>
    </div>
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
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => onEditContentChange(e.target.value)}
            className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors bg-surface-input text-content-primary placeholder:text-content-muted hover:bg-surface-hover focus:bg-surface-hover min-h-[200px] resize-y"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={onSave} className="bg-accent hover:bg-accent-light text-white">
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
        <div className="space-y-2">
          {/* First row: timestamp and buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-content-muted">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(note.created_at)} at {formatTime(note.created_at)}</span>
            </div>
            {!readOnly && (
              <div className="flex gap-1">
                <button
                  className="btn-ghost"
                  onClick={() => onEdit(note.id, note.content)}
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  className="btn-danger"
                  onClick={() => onDelete(note.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Content area - full width */}
          <div className="space-y-4">
            {/* Original note content */}
            {sortedEdits.length > 0 && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-content-primary">
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
                      <div className="flex items-center gap-2 text-sm text-content-muted mb-2">
                        {!isLastEdit && (
                          <button
                            onClick={() => toggleEdit(edit.id)}
                            className="text-content-muted hover:text-content-primary transition-colors"
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
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-content-primary">
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
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-content-primary">{note.content}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesSection;
