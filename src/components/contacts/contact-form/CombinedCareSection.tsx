import { HeartPulse, Thermometer, Footprints, Brain, Pill, StickyNote, Check, X } from "lucide-react";

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

  const toggleArrayItem = (field: string, item: string) => {
    if (readOnly) return;
    const updater = (prev: any) => {
      const arr: string[] = prev[field] || [];
      const next = arr.includes(item) ? arr.filter((i: string) => i !== item) : [...arr, item];
      return { ...prev, [field]: next };
    };
    if (setFormData) setFormData(updater);
    if (handleChange) handleChange(updater);
  };

  const CheckRow = ({ field, option }: { field: string; option: string }) => {
    const isSelected = (formData?.[field] || []).includes(option);
    return (
      <button
        type="button"
        onClick={() => toggleArrayItem(field, option)}
        disabled={readOnly}
        className={`w-full flex items-center justify-between p-[3px] rounded-lg text-left transition-all ${
          isSelected
            ? "bg-surface-input text-content-primary"
            : "bg-surface-input hover:bg-surface-hover text-content-secondary"
        }`}
      >
        <span className="text-sm font-medium">{option}</span>
        <div
          className={`w-4 h-4 rounded flex items-center justify-center ${isSelected ? "border border-emerald-500 bg-emerald-500 text-white" : ""}`}
          style={!isSelected ? { backgroundColor: 'var(--radio-indicator)' } : undefined}
        >
          {isSelected ? <Check className="h-3 w-3 text-white" /> : <X className="h-3 w-3 text-content-muted" />}
        </div>
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Column 1: Care Needs + Medical Conditions */}
      <div className="space-y-[10px]">
        <div className="bg-surface-input rounded-lg p-[5px] space-y-2">
          <label className="text-sm font-medium text-content-secondary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
            <HeartPulse className="h-4 w-4 text-accent" />Care Needs
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {[
              "No Care", "Memory Care", "Complete personal care", "Feeding Assistance",
              "Light Housekeeping", "Meal Preparation", "Medication Management",
              "Mobility Assistance", "Personal Hygiene Assistance", "Bathing Assistance",
              "Dressing Assistance", "Soft Foods"
            ].map((option) => (
              <CheckRow key={option} field="careNeeds" option={option} />
            ))}
          </div>
        </div>

        <div className="bg-surface-input rounded-lg p-[5px] space-y-2">
          <label className="text-sm font-medium text-content-secondary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
            <Thermometer className="h-4 w-4 text-accent" />Medical Conditions
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {[
              "Blood Sugar Monitoring", "Sliding Scale Injections", "Insulin Injections",
              "Low Sugar Diet", "Diabetes", "Soft Pureed Diet", "Hypertension",
              "Heart Condition", "Stroke", "Arthritis", "Cancer", "Kidney Disease"
            ].map((option) => (
              <CheckRow key={option} field="medicalConditions" option={option} />
            ))}
          </div>
        </div>
      </div>

      {/* Column 2: Level of Mobility + Mental Health */}
      <div className="space-y-[10px]">
        <div className="bg-surface-input rounded-lg p-[5px] space-y-2">
          <label className="text-sm font-medium text-content-secondary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
            <Footprints className="h-4 w-4 text-accent" />Level of Mobility
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {[
              "Hoyer Lift", "Non Ambulatory", "Wheelchair", "Cane",
              "1-Person Transfer", "Walker", "2-Person Transfer", "Independent"
            ].map((option) => (
              <CheckRow key={option} field="mobilityLevel" option={option} />
            ))}
          </div>
        </div>

        <div className="bg-surface-input rounded-lg p-[5px] space-y-2">
          <label className="text-sm font-medium text-content-secondary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
            <Brain className="h-4 w-4 text-accent" />Mental Health
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {[
              "Memory Issues", "Hallucinations", "Wandering", "Aggressiveness towards Others",
              "Withdrawal from Activities", "Inappropriate Behaviors", "None", "Dementia",
              "Mild Cognitive Impairment (MCI)", "Alzheimer's", "Sundowning", "Combativeness",
              "Doesn't Sleep Through Night"
            ].map((option) => (
              <CheckRow key={option} field="mentalHealth" option={option} />
            ))}
          </div>
        </div>
      </div>

      {/* Column 3: Medication Management */}
      <div className="space-y-[10px]">
        <div className="bg-surface-input rounded-lg p-[5px] space-y-2">
          <label className="text-sm font-medium text-content-secondary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
            <Pill className="h-4 w-4 text-accent" />Medication Management
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {[
              "Independent", "Reminders Only", "Setup Assistance", "Full Assistance",
              "Pill Crushing", "Injection Assistance", "24/7 Supervision", "Bubble Pack Management"
            ].map((option) => (
              <CheckRow key={option} field="medicationManagement" option={option} />
            ))}
          </div>
        </div>
      </div>

      {/* Column 4: Additional Notes */}
      <div className="space-y-[10px]">
        <div className="bg-surface-input rounded-lg p-[5px] space-y-2">
          <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
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
