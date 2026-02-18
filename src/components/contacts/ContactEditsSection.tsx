import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Trash2 } from "lucide-react";
import { useContactEdits } from "@/hooks/useContactEdits";
import { format } from "date-fns";

interface ContactEditsSectionProps {
  contactId: string;
}

const ContactEditsSection = ({ contactId }: ContactEditsSectionProps) => {
  const { edits, loading, deleteEdit } = useContactEdits(contactId);

  const handleDeleteEdit = async (editId: string) => {
    if (window.confirm("Are you sure you want to delete this edit entry?")) {
      await deleteEdit(editId);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return "";
    try {
      return format(new Date(date), "MMMM do, yyyy");
    } catch {
      return date;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Edit History</h3>
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading edits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Edit History</h3>
        <Button
          size="sm"
          className="bg-red-500 hover:bg-red-600 text-white"
          onClick={() => {
            if (edits.length > 0 && window.confirm("Are you sure you want to delete all edit entries?")) {
              // Delete all edits
              edits.forEach(edit => deleteEdit(edit.id));
            }
          }}
          disabled={edits.length === 0}
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden md:ml-2 md:inline">Delete Edit History</span>
        </Button>
      </div>
      {edits.length === 0 ? (
        <Card className="bg-muted">
          <CardContent className="pt-6">
            <p className="text-muted-foreground italic text-center text-sm">No edits recorded yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {edits.map((entry) => (
            <Card key={entry.id} className="bg-muted">
              <CardContent className="pt-4">
                <div className="flex flex-col md:flex-row md:items-start gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0 flex-shrink-0 md:min-w-fit">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">{formatDate(entry.change_date)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div 
                      className="text-sm text-foreground leading-relaxed [&>ul]:list-disc [&>ul]:pl-6 [&>li]:mb-1"
                      dangerouslySetInnerHTML={{ __html: entry.changes_summary }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactEditsSection;