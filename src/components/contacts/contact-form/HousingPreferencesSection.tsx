import { Textarea } from "@/components/ui/textarea";
import { CalendarClock, Home, BedDouble, Bath, ShowerHead, Heart, StickyNote, Check, X } from "lucide-react";
import { SimpleSelect } from "../../admin/SimpleSelect";

interface HousingPreferencesSectionProps {
  formData?: any;
  setFormData?: (data: any) => void;
  handleChange?: (data: any) => void;
  readOnly?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
}

const HousingPreferencesSection = ({ formData, setFormData, handleChange, readOnly = false }: HousingPreferencesSectionProps) => {
  const updateField = (field: string, value: any) => {
    const updater = (prev: any) => ({ ...prev, [field]: value });
    // Always update UI state directly for instant feedback
    if (setFormData) setFormData(updater);
    // Also notify auto-save wrapper (if both provided, it fires after direct update)
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

  // Reusable clickable checkbox row matching HomeFieldCategory multi pattern
  const CheckRow = ({ field, option }: { field: string; option: string }) => {
    const isSelected = (formData?.[field] || []).includes(option);
    return (
      <button
        type="button"
        onClick={() => toggleArrayItem(field, option)}
        disabled={readOnly}
        className={`w-full flex items-center justify-between p-3 rounded-lg border border-transparent transition-all ${isSelected ? "bg-surface-hover" : "bg-surface-hover hover:bg-black/20"
          }`}
      >
        <span className={`text-sm font-medium ${isSelected ? "text-content-primary" : "text-content-secondary"}`}>{option}</span>
        <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${isSelected ? "border border-accent bg-accent" : "bg-surface-secondary"
          }`}>
          {isSelected ? <Check className="h-3 w-3 text-white" /> : <X className="h-3 w-3 text-content-muted" />}
        </div>
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
      {/* Column 1: Move-in Dates + Housing Type */}
      <div className="space-y-[10px]">
        {/* Move-in Timeframe */}
        <div className="bg-surface-hover rounded-lg">
          <div className="flex items-center justify-between gap-2 p-[5px]">
            <span className="font-medium text-sm text-content-secondary whitespace-nowrap flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-accent" />
              Move-in Date
            </span>
            <SimpleSelect
              value={formData?.timeToMove || ""}
              onChange={(val) => updateField('timeToMove', val)}
              options={["Immediately", "1-3 months", "3-6 months", "3+ months", "6+ months", "Not sure"]}
              placeholder="Select..."
              className="w-40 text-sm text-left"
            />
          </div>
        </div>

        {/* Housing Type */}
        <div className="bg-surface-hover rounded-lg p-[5px] space-y-2">
          <label className="text-sm font-medium text-content-secondary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
            <Home className="h-4 w-4 text-accent" />Housing Type
          </label>

          <div className="space-y-2">
            <span className="text-xs font-medium text-content-muted block px-1">Care Homes & Adult Foster Homes</span>
            <div className="space-y-2">
              {["Adult Foster Homes", "Adult Residential Care Homes", "Expanded - Adult Residential Care Homes"].map(opt => (
                <CheckRow key={opt} field="housingType" option={opt} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium text-content-muted block px-1">Senior Living Communities</span>
            <div className="space-y-2">
              {["Assisted Living", "Independent Living", "Skilled Nursing Facility", "Intermediate Care Facility"].map(opt => (
                <CheckRow key={opt} field="housingType" option={opt} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium text-content-muted block px-1">Memory Care</span>
            <div className="space-y-2">
              {["Memory Care"].map(opt => (
                <CheckRow key={opt} field="housingType" option={opt} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Column 2: Room Type + Bathroom Type */}
      <div className="space-y-[10px]">
        <div className="bg-surface-hover rounded-lg p-[5px] space-y-2">
          <label className="text-sm font-medium text-content-secondary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
            <BedDouble className="h-4 w-4 text-accent" />Room Type
          </label>
          <div className="space-y-2">
            {["Shared Suite", "Private Suite", "Studio", "1 Bedroom", "2 Bedroom", "Other"].map(opt => (
              <CheckRow key={opt} field="roomType" option={opt} />
            ))}
          </div>
        </div>

        <div className="bg-surface-hover rounded-lg p-[5px] space-y-2">
          <label className="text-sm font-medium text-content-secondary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
            <Bath className="h-4 w-4 text-accent" />Bathroom Type
          </label>
          <div className="space-y-2">
            {["Private full bath", "Private Half Bath", "Full Shared", "Half Shared", "Separate Full Bath", "Separate Half Bath", "Jack & Jill"].map(opt => (
              <CheckRow key={opt} field="bathroomType" option={opt} />
            ))}
          </div>
        </div>
      </div>

      {/* Column 3: Shower Type + Interests */}
      <div className="space-y-[10px]">
        <div className="bg-surface-hover rounded-lg p-[5px] space-y-2">
          <label className="text-sm font-medium text-content-secondary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
            <ShowerHead className="h-4 w-4 text-accent" />Shower Type
          </label>
          <div className="space-y-2">
            {["Step-In Shower", "Wheel-in Shower", "Bathtub"].map(opt => (
              <CheckRow key={opt} field="showerType" option={opt} />
            ))}
          </div>
        </div>

        <div className="bg-surface-hover rounded-lg p-[5px] space-y-2">
          <label className="text-sm font-medium text-content-secondary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
            <Heart className="h-4 w-4 text-accent" />Interests
          </label>
          <div className="space-y-2">
            {[
              "Talking to Family and Friends", "Spiritual/Faith Based Activity",
              "Walk or Physical Activity", "Being Outdoors",
              "A Good Meal", "TV, Movies or Music"
            ].map(opt => (
              <CheckRow key={opt} field="interests" option={opt} />
            ))}
          </div>
        </div>
      </div>

      {/* Column 4: Additional Notes */}
      <div className="space-y-[10px]">
        <div className="bg-surface-hover rounded-lg p-[5px] space-y-2">
          <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
            <StickyNote className="h-4 w-4 text-accent" />
            Additional Notes
          </h3>
          <textarea
            id="housing-additional-notes"
            placeholder="Any additional housing preferences or requirements..."
            value={formData?.housingAdditionalNotes || ''}
            onChange={(e) => updateField('housingAdditionalNotes', e.target.value)}
            disabled={readOnly}
            className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors form-input placeholder-content-muted min-h-[100px] resize-y"
          />
        </div>
      </div>
    </div>
  );
};

export default HousingPreferencesSection;
