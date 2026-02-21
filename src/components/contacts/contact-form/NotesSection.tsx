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
      <div className="p-4 text-center text-content-muted border border-white/10 rounded-md bg-white/5">
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
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <NotesSection contactId={id} readOnly={readOnly} />
      </div>
      {onNext && (
        <div className="flex-none flex justify-end mt-4 pt-2 border-t border-white/10">
          <Button onClick={onNext}>Next Step</Button>
        </div>
      )}
    </div>
  );
};

export default ContactFormNotesSection;
