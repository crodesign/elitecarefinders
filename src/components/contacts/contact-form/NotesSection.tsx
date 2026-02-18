"use client";

import NotesSection from "@/components/contacts/NotesSection";
import { Button } from "@/components/ui/button";

interface NotesSectionProps {
  formData?: any;
  handleChange?: (data: any) => void;
  setFormData?: (data: any) => void;
  contactId?: string;
  readOnly?: boolean;
  onNext?: () => void;
}

const ContactFormNotesSection = ({ contactId, formData, readOnly = false, onNext }: NotesSectionProps) => {
  const id = contactId || formData?.id;

  if (!id) {
    return (
      <div className="p-4 text-center text-zinc-400 border border-white/10 rounded-md bg-white/5">
        <p>Please save the contact to add or view notes.</p>
        {onNext && (
          <div className="flex justify-end mt-4">
            <Button onClick={onNext}>Next Step</Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <NotesSection contactId={id} readOnly={readOnly} />
      {onNext && (
        <div className="flex justify-end mt-4">
          <Button onClick={onNext}>Next Step</Button>
        </div>
      )}
    </div>
  );
};

export default ContactFormNotesSection;
