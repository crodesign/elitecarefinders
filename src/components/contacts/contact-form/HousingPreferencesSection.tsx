import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarClock, Home, BedDouble, Bath, ShowerHead, Heart, StickyNote } from "lucide-react";

interface HousingPreferencesSectionProps {
  formData?: any;
  setFormData?: (data: any) => void;
  readOnly?: boolean;
}

const HousingPreferencesSection = ({ formData, setFormData, readOnly = false }: HousingPreferencesSectionProps) => {
  const updateField = (field: string, value: any) => {
    if (setFormData) {
      setFormData((prev: any) => ({ ...prev, [field]: value }));
    }
  };

  const updateArrayField = (field: string, item: string, checked: boolean) => {
    if (setFormData) {
      setFormData((prev: any) => {
        const currentArray = prev[field] || [];
        const newArray = checked
          ? [...currentArray, item]
          : currentArray.filter((i: string) => i !== item);
        return { ...prev, [field]: newArray };
      });
    }
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
      {/* Column 1: Move-in Dates + Housing Type */}
      <div className="space-y-6">
        {/* Move-in Dates */}
        <div className="bg-white/5 rounded-lg p-3 space-y-4">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            Projected Move-in Date
          </h3>
          <div className="space-y-2">
            <Select value={formData?.timeToMove || ""} onValueChange={(value) => updateField('timeToMove', value)}>
              <SelectTrigger className="bg-white/10 border-transparent text-white placeholder-zinc-500 hover:bg-white/15 focus:ring-0">
                <SelectValue placeholder="1-3 months" />
              </SelectTrigger>
              <SelectContent className="bg-[#0b1115] border-white/10 text-white">
                <SelectItem value="immediate">Immediately</SelectItem>
                <SelectItem value="1-3-months">1-3 months</SelectItem>
                <SelectItem value="3-6-months">3-6 months</SelectItem>
                <SelectItem value="3-plus-months">3+ months</SelectItem>
                <SelectItem value="6-plus-months">6+ months</SelectItem>
                <SelectItem value="not-sure">Not sure</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Housing Type */}
        <div className="bg-white/5 rounded-lg p-3 space-y-4">
          <label className="text-sm font-medium text-white/80 flex items-center gap-2"><Home className="h-4 w-4 text-primary" />Housing Type</label>

          {/* Care Homes & Adult Foster Homes */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-300 block">Care Homes & Adult Foster Homes</span>
            {[
              "Adult Foster Homes", "Adult Residential Care Homes",
              "Expanded - Adult Residential Care Homes"
            ].map((option) => (
              <div key={option} className="w-full flex items-center justify-between p-3 rounded-lg border bg-white/10 border-transparent transition-all hover:bg-white/15">
                <span className="text-sm font-medium text-zinc-400">{option}</span>
                <Checkbox
                  id={`ht-${option.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  checked={formData?.housingType?.includes(option) || false}
                  onCheckedChange={(checked) => {
                    const currentTypes = formData?.housingType || [];
                    const newTypes = checked
                      ? [...currentTypes, option]
                      : currentTypes.filter((type: string) => type !== option);
                    updateField('housingType', newTypes);
                  }}
                  disabled={readOnly}
                  className="border-zinc-600 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                />
              </div>
            ))}
          </div>

          {/* Senior Living Communities */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-300 block">Senior Living Communities</span>
            {[
              "Assisted Living", "Independent Living",
              "Skilled Nursing Facility", "Intermediate Care Facility"
            ].map((option) => (
              <div key={option} className="w-full flex items-center justify-between p-3 rounded-lg border bg-white/10 border-transparent transition-all hover:bg-white/15">
                <span className="text-sm font-medium text-zinc-400">{option}</span>
                <Checkbox
                  id={`ht-${option.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  checked={formData?.housingType?.includes(option) || false}
                  onCheckedChange={(checked) => {
                    const currentTypes = formData?.housingType || [];
                    const newTypes = checked
                      ? [...currentTypes, option]
                      : currentTypes.filter((type: string) => type !== option);
                    updateField('housingType', newTypes);
                  }}
                  disabled={readOnly}
                  className="border-zinc-600 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                />
              </div>
            ))}
          </div>

          {/* Memory Care */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-300 block">Memory Care</span>
            {[
              "Memory Care"
            ].map((option) => (
              <div key={option} className="w-full flex items-center justify-between p-3 rounded-lg border bg-white/10 border-transparent transition-all hover:bg-white/15">
                <span className="text-sm font-medium text-zinc-400">{option}</span>
                <Checkbox
                  id={`ht-${option.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  checked={formData?.housingType?.includes(option) || false}
                  onCheckedChange={(checked) => {
                    const currentTypes = formData?.housingType || [];
                    const newTypes = checked
                      ? [...currentTypes, option]
                      : currentTypes.filter((type: string) => type !== option);
                    updateField('housingType', newTypes);
                  }}
                  disabled={readOnly}
                  className="border-zinc-600 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Column 2: Room Type + Bathroom Type */}
      <div className="space-y-6">
        <div className="bg-white/5 rounded-lg p-3 space-y-3">
          <label className="text-sm font-medium text-white/80 flex items-center gap-2"><BedDouble className="h-4 w-4 text-primary" />Room Type</label>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {[
              "Shared Suite", "Private Suite", "Studio",
              "1 Bedroom", "2 Bedroom", "Other"
            ].map((option) => (
              <div key={option} className="w-full flex items-center justify-between p-3 rounded-lg border bg-white/10 border-transparent transition-all hover:bg-white/15">
                <span className="text-sm font-medium text-zinc-400">{option}</span>
                <Checkbox
                  id={`rt-${option.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  checked={formData?.roomType?.includes(option) || false}
                  onCheckedChange={(checked) => {
                    const currentTypes = formData?.roomType || [];
                    const newTypes = checked
                      ? [...currentTypes, option]
                      : currentTypes.filter((type: string) => type !== option);
                    updateField('roomType', newTypes);
                  }}
                  disabled={readOnly}
                  className="border-zinc-600 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-3 space-y-3">
          <label className="text-sm font-medium text-white/80 flex items-center gap-2"><Bath className="h-4 w-4 text-primary" />Bathroom Type</label>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {[
              "Private full bath", "Private Half Bath", "Full Shared",
              "Half Shared", "Separate Full Bath", "Separate Half Bath", "Jack & Jill"
            ].map((option) => (
              <div key={option} className="w-full flex items-center justify-between p-3 rounded-lg border bg-white/10 border-transparent transition-all hover:bg-white/15">
                <span className="text-sm font-medium text-zinc-400">{option}</span>
                <Checkbox
                  id={`bt-${option.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  checked={formData?.bathroomType?.includes(option) || false}
                  onCheckedChange={(checked) => {
                    const currentTypes = formData?.bathroomType || [];
                    const newTypes = checked
                      ? [...currentTypes, option]
                      : currentTypes.filter((type: string) => type !== option);
                    updateField('bathroomType', newTypes);
                  }}
                  disabled={readOnly}
                  className="border-zinc-600 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Column 3: Shower Type + Interests */}
      <div className="space-y-6">
        <div className="bg-white/5 rounded-lg p-3 space-y-3">
          <label className="text-sm font-medium text-white/80 flex items-center gap-2"><ShowerHead className="h-4 w-4 text-primary" />Shower Type</label>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {[
              "Step-In Shower", "Wheel-in Shower", "Bathtub"
            ].map((option) => (
              <div key={option} className="w-full flex items-center justify-between p-3 rounded-lg border bg-white/10 border-transparent transition-all hover:bg-white/15">
                <span className="text-sm font-medium text-zinc-400">{option}</span>
                <Checkbox
                  id={`st-${option.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  checked={formData?.showerType?.includes(option) || false}
                  onCheckedChange={(checked) => {
                    const currentTypes = formData?.showerType || [];
                    const newTypes = checked
                      ? [...currentTypes, option]
                      : currentTypes.filter((type: string) => type !== option);
                    updateField('showerType', newTypes);
                  }}
                  disabled={readOnly}
                  className="border-zinc-600 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-3 space-y-3">
          <label className="text-sm font-medium text-white/80 flex items-center gap-2"><Heart className="h-4 w-4 text-primary" />Interests</label>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {[
              "Talking to Family and Friends", "Spiritual/Faith Based Activity",
              "Walk or Physical Activity", "Being Outdoors",
              "A Good Meal", "TV, Movies or Music"
            ].map((option) => (
              <div key={option} className="w-full flex items-center justify-between p-3 rounded-lg border bg-white/10 border-transparent transition-all hover:bg-white/15">
                <span className="text-sm font-medium text-zinc-400">{option}</span>
                <Checkbox
                  id={`int-${option.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  checked={formData?.interests?.includes(option) || false}
                  onCheckedChange={(checked) => updateArrayField('interests', option, !!checked)}
                  disabled={readOnly}
                  className="border-zinc-600 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Column 4: Additional Notes */}
      <div className="space-y-6">
        <div className="bg-white/5 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-primary" />
            Additional Notes
          </h3>
          <textarea
            id="housing-additional-notes"
            placeholder="Any additional housing preferences or requirements..."
            value={formData?.housingAdditionalNotes || ''}
            onChange={(e) => updateField('housingAdditionalNotes', e.target.value)}
            disabled={readOnly}
            className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors bg-white/10 text-white placeholder-zinc-400 hover:bg-white/15 focus:bg-white/15 min-h-[100px] resize-y"
          />
        </div>
      </div>
    </div>
  );
};

export default HousingPreferencesSection;