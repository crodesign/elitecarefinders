import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HeartPulse, Thermometer, Footprints, Brain, Pill, StickyNote } from "lucide-react";

interface CombinedCareSectionProps {
  formData?: any;
  setFormData?: (data: any) => void;
  handleChange?: (data: any) => void;
  readOnly?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
}

const CombinedCareSection = ({ formData, setFormData, handleChange, readOnly = false }: CombinedCareSectionProps) => {
  const updateField = (field: string, value: any) => {
    const updater = (prev: any) => ({ ...prev, [field]: value });
    if (setFormData) setFormData(updater);
    if (handleChange) handleChange(updater);
  };

  const updateArrayField = (field: string, item: string, checked: boolean) => {
    const updater = (prev: any) => {
      const currentArray = prev[field] || [];
      const newArray = checked
        ? [...currentArray, item]
        : currentArray.filter((i: string) => i !== item);
      return { ...prev, [field]: newArray };
    };
    if (setFormData) setFormData(updater);
    if (handleChange) handleChange(updater);
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Column 1: Care Needs + Medical Conditions */}
      <div className="space-y-6">
        <div className="bg-surface-input rounded-lg p-3 space-y-3">
          <label className="text-sm font-medium text-content-secondary flex items-center gap-2"><HeartPulse className="h-4 w-4 text-accent" />Care Needs</label>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {[
              "No Care", "Memory Care", "Complete personal care", "Feeding Assistance",
              "Light Housekeeping", "Meal Preparation", "Medication Management",
              "Mobility Assistance", "Personal Hygiene Assistance", "Bathing Assistance",
              "Dressing Assistance", "Soft Foods"
            ].map((option) => (
              <div key={option} className="w-full flex items-center justify-between p-3 rounded-lg border bg-surface-hover border-transparent transition-all hover:bg-white/15">
                <span className="text-sm font-medium text-content-secondary">{option}</span>
                <Checkbox
                  id={`cn-${option.toLowerCase().replace(/\s+/g, '-')}`}
                  checked={formData?.careNeeds?.includes(option) || false}
                  onCheckedChange={(checked) => updateArrayField('careNeeds', option, !!checked)}
                  disabled={readOnly}
                  className="border-ui-border data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-input rounded-lg p-3 space-y-3">
          <label className="text-sm font-medium text-content-secondary flex items-center gap-2"><Thermometer className="h-4 w-4 text-accent" />Medical Conditions</label>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {[
              "Blood Sugar Monitoring", "Sliding Scale Injections", "Insulin Injections",
              "Low Sugar Diet", "Diabetes", "Soft Pureed Diet", "Hypertension",
              "Heart Condition", "Stroke", "Arthritis", "Cancer", "Kidney Disease"
            ].map((option) => (
              <div key={option} className="w-full flex items-center justify-between p-3 rounded-lg border bg-surface-hover border-transparent transition-all hover:bg-white/15">
                <span className="text-sm font-medium text-content-secondary">{option}</span>
                <Checkbox
                  id={`mc-${option.toLowerCase().replace(/\s+/g, '-')}`}
                  checked={formData?.medicalConditions?.includes(option) || false}
                  onCheckedChange={(checked) => updateArrayField('medicalConditions', option, !!checked)}
                  disabled={readOnly}
                  className="border-ui-border data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Column 2: Level of Mobility + Mental Health */}
      <div className="space-y-6">
        <div className="bg-surface-input rounded-lg p-3 space-y-3">
          <label className="text-sm font-medium text-content-secondary flex items-center gap-2"><Footprints className="h-4 w-4 text-accent" />Level of Mobility</label>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {[
              "Hoyer Lift", "Non Ambulatory", "Wheelchair", "Cane",
              "1-Person Transfer", "Walker", "2-Person Transfer", "Independent"
            ].map((option) => (
              <div key={option} className="w-full flex items-center justify-between p-3 rounded-lg border bg-surface-hover border-transparent transition-all hover:bg-white/15">
                <span className="text-sm font-medium text-content-secondary">{option}</span>
                <Checkbox
                  id={`mob-${option.toLowerCase().replace(/\s+/g, '-')}`}
                  checked={formData?.mobilityLevel?.includes(option) || false}
                  onCheckedChange={(checked) => updateArrayField('mobilityLevel', option, !!checked)}
                  disabled={readOnly}
                  className="border-ui-border data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-input rounded-lg p-3 space-y-3">
          <label className="text-sm font-medium text-content-secondary flex items-center gap-2"><Brain className="h-4 w-4 text-accent" />Mental Health</label>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {[
              "Memory Issues", "Hallucinations", "Wandering", "Aggressiveness towards Others",
              "Withdrawal from Activities", "Inappropriate Behaviors", "None", "Dementia",
              "Mild Cognitive Impairment (MCI)", "Alzheimer's", "Sundowning", "Combativeness",
              "Doesn't Sleep Through Night"
            ].map((option) => (
              <div key={option} className="w-full flex items-center justify-between p-3 rounded-lg border bg-surface-hover border-transparent transition-all hover:bg-white/15">
                <span className="text-sm font-medium text-content-secondary">{option}</span>
                <Checkbox
                  id={`mh-${option.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  checked={formData?.mentalHealth?.includes(option) || false}
                  onCheckedChange={(checked) => updateArrayField('mentalHealth', option, !!checked)}
                  disabled={readOnly}
                  className="border-ui-border data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Column 3: Medication Management */}
      <div className="space-y-6">
        <div className="bg-surface-input rounded-lg p-3 space-y-3">
          <label className="text-sm font-medium text-content-secondary flex items-center gap-2"><Pill className="h-4 w-4 text-accent" />Medication Management</label>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {[
              "Independent", "Reminders Only", "Setup Assistance", "Full Assistance",
              "Pill Crushing", "Injection Assistance", "24/7 Supervision", "Bubble Pack Management"
            ].map((option) => (
              <div key={option} className="w-full flex items-center justify-between p-3 rounded-lg border bg-surface-hover border-transparent transition-all hover:bg-white/15">
                <span className="text-sm font-medium text-content-secondary">{option}</span>
                <Checkbox
                  id={`med-${option.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  checked={formData?.medicationManagement?.includes(option) || false}
                  onCheckedChange={(checked) => updateArrayField('medicationManagement', option, !!checked)}
                  disabled={readOnly}
                  className="border-ui-border data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Column 4: Additional Notes */}
      <div className="space-y-6">
        <div className="bg-surface-input rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-medium text-content-primary flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-accent" />
            Additional Notes
          </h3>
          <textarea
            id="care-additional-notes"
            placeholder="Any additional care needs or medical information..."
            value={formData?.careAdditionalNotes || ''}
            onChange={(e) => updateField('careAdditionalNotes', e.target.value)}
            disabled={readOnly}
            className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors form-input placeholder-content-muted min-h-[100px] resize-y"
          />
        </div>
      </div>
    </div>
  );
};

export default CombinedCareSection;

