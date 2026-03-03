import { useState, useRef } from "react";
import { Phone, Mail, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, CalendarIcon, X, UserCheck, Compass, Stethoscope, ShieldCheck, Activity, Info, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatDateForHawaii, parseHawaiiDate } from "@/lib/hawaiiDate";
import { SimpleSelect } from "../../admin/SimpleSelect";

interface ResidentInfoSectionProps {
  formData?: any;
  setFormData?: (data: any) => void;
  handleChange?: (data: any) => void;
  readOnly?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
}

const ResidentInfoSection = ({ formData, setFormData, handleChange: handleChangeProp, readOnly = false }: ResidentInfoSectionProps) => {
  const onChange = handleChangeProp ?? setFormData;
  const [pcpEmailError, setPcpEmailError] = useState<string | null>(null);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarCloseRef = useRef<HTMLButtonElement>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(
    formData?.date_of_birth ? (parseHawaiiDate(formData.date_of_birth) || new Date()) : new Date()
  );

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => (currentYear - i).toString());

  const updateField = (field: string, value: any) => {
    if (onChange) {
      onChange((prev: any) => ({ ...prev, [field]: value }));
    }
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 0) return '';
    if (numbers.length <= 3) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  const calculateAge = (birthDate: Date | undefined) => {
    if (!birthDate) return "";
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const stateOptions = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
    "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
    "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
    "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
    "Wisconsin", "Wyoming"
  ];

  const ethnicityOptions = [
    "African American", "American Indian or Alaska Native", "Chinese", "Filipino",
    "Japanese", "Korean", "Native Hawaiian", "Other Pacific Islander", "Vietnamese", "White"
  ];

  const genderOptions = ["Not Specified", "Male", "Female", "Other"];

  const islandOptions = ["Oahu", "Big Island", "Kauai", "Maui"];

  const neighborhoodMap: Record<string, string[]> = {
    "Oahu": ["Aiea", "Ala Moana", "Diamond Head", "Downtown", "Ewa Beach", "Hawaii Kai", "Honolulu", "Kailua", "Kaneohe", "Kapolei", "Mililani", "Pearl City", "Waikiki", "Wahiawa", "Waipahu"],
    "Big Island": ["Hilo", "Kailua-Kona", "Kona", "Pahoa", "Waimea"],
    "Kauai": ["Hanalei", "Kapaa", "Lihue", "Poipu", "Princeville"],
    "Maui": ["Hana", "Kahului", "Kihei", "Lahaina", "Makawao", "Paia", "Wailea"],
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
      {/* Column 1: Resident Info */}
      <div className="space-y-[10px]">
        {/* Resident Info container */}
        <div className="bg-surface-input rounded-lg p-[5px] space-y-2">
          <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
            <User className="h-4 w-4 text-accent" />
            Resident Info
          </h3>

          {/* Full Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
              <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Full Name</label>
              <input
                type="text"
                value={formData?.resident_full_name || ""}
                onChange={(e) => updateField('resident_full_name', e.target.value)}
                className="form-input text-sm text-left w-48 h-8 rounded-md px-3"
                placeholder="Enter full name"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2 pt-1">
            <h4 className="text-sm font-medium text-content-secondary">Address</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
                <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Street</label>
                <input
                  type="text"
                  value={formData?.street_address || ""}
                  onChange={(e) => updateField('street_address', e.target.value)}
                  className="form-input text-sm text-left w-48 h-8 rounded-md px-3"
                  placeholder="Street address"
                />
              </div>
              <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
                <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">City</label>
                <input
                  type="text"
                  value={formData?.city || ""}
                  onChange={(e) => updateField('city', e.target.value)}
                  className="form-input text-sm text-left w-48 h-8 rounded-md px-3"
                  placeholder="City"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all flex-1">
                  <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">State</label>
                  <SimpleSelect
                    value={formData?.state || ""}
                    onChange={(val) => updateField('state', val)}
                    options={stateOptions}
                    placeholder="State"
                    className="w-32 text-sm text-left"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
                  <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Zip</label>
                  <input
                    type="text"
                    value={formData?.zip_code || ""}
                    onChange={(e) => updateField('zip_code', e.target.value)}
                    className="form-input text-sm text-left w-20 h-8 rounded-md px-3"
                    placeholder="Zip"
                  />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Resident Details container */}
        <div className="bg-surface-input rounded-lg p-[5px] space-y-2">
          <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
            <UserCheck className="h-4 w-4 text-accent" />
            Resident Details
          </h3>

          {/* Date of Birth */}
          <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
            <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Date of Birth</label>
            <Popover onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={readOnly}
                  className={cn(
                    "form-input w-full flex items-center justify-start text-left font-normal px-3 py-1.5 text-sm h-8",
                    formData?.date_of_birth ? "text-content-primary" : "text-content-muted"
                  )}
                >
                  <span className="flex items-center flex-1">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData?.date_of_birth
                      ? (parseHawaiiDate(formData.date_of_birth)
                        ? format(parseHawaiiDate(formData.date_of_birth)!, "MMM d, yyyy")
                        : "Invalid date")
                      : "Pick a date"}
                  </span>
                  {formData?.date_of_birth && parseHawaiiDate(formData.date_of_birth) && (
                    <span className="text-sm text-content-muted">
                      Age: {calculateAge(parseHawaiiDate(formData.date_of_birth) || undefined)}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 bg-surface-secondary border-ui-border text-content-primary z-[200] [&_.rdp-caption_dropdowns]:!hidden [&_.rdp-caption_label]:!hidden [&_.rdp-nav]:!hidden [&_.rdp-dropdown]:!hidden [&_.rdp-head_cell]:text-content-muted"
                align="start"
              >
                <PopoverClose ref={calendarCloseRef} className="hidden" />
                {/* Custom header: close button + month/year nav */}
                <div className="p-3 pb-1 space-y-2">
                  {/* Close button */}
                  <div className="flex justify-end">
                    <PopoverClose asChild>
                      <button
                        type="button"
                        className="p-1 rounded-md hover:bg-surface-hover text-content-muted hover:text-content-primary transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </PopoverClose>
                  </div>
                  {/* Month/Year navigation row */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const prev = new Date(calendarMonth);
                        prev.setMonth(prev.getMonth() - 1);
                        setCalendarMonth(prev);
                      }}
                      className="h-7 w-7 rounded-md inline-flex items-center justify-center transition-colors hover:bg-surface-hover text-content-primary"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex gap-1.5 flex-1 justify-center">
                      <SimpleSelect
                        value={monthNames[calendarMonth.getMonth()]}
                        onChange={(val: string) => {
                          const idx = monthNames.indexOf(val);
                          if (idx >= 0) {
                            const updated = new Date(calendarMonth);
                            updated.setMonth(idx);
                            setCalendarMonth(updated);
                          }
                        }}
                        options={monthNames}
                        placeholder="Month"
                        className="w-[110px]"
                        textSize="text-xs"
                      />
                      <SimpleSelect
                        value={calendarMonth.getFullYear().toString()}
                        onChange={(val: string) => {
                          const updated = new Date(calendarMonth);
                          updated.setFullYear(parseInt(val));
                          setCalendarMonth(updated);
                        }}
                        options={yearOptions}
                        placeholder="Year"
                        className="w-[70px]"
                        textSize="text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Date(calendarMonth);
                        next.setMonth(next.getMonth() + 1);
                        setCalendarMonth(next);
                      }}
                      className="h-7 w-7 rounded-md inline-flex items-center justify-center transition-colors hover:bg-surface-hover text-content-primary"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {/* Calendar grid with hidden built-in caption/nav */}
                <Calendar
                  mode="single"
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  selected={formData?.date_of_birth ? (parseHawaiiDate(formData.date_of_birth) || undefined) : undefined}
                  onSelect={(date) => {
                    updateField('date_of_birth', date ? formatDateForHawaii(date) : null);
                    if (date) calendarCloseRef.current?.click();
                  }}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  className="p-3 pt-0 pointer-events-auto"
                  classNames={{
                    caption: "!hidden",
                    caption_label: "!hidden",
                    caption_dropdowns: "!hidden",
                    dropdown_month: "!hidden",
                    dropdown_year: "!hidden",
                    nav: "!hidden",
                    day_selected: "bg-accent text-white hover:bg-accent focus:bg-accent focus:text-white",
                    day_today: "bg-surface-hover text-white",
                    day_outside: "text-content-muted opacity-50",
                    day_disabled: "text-content-secondary opacity-50",
                    day: cn("h-9 w-9 p-0 font-normal text-content-secondary aria-selected:opacity-100 hover:bg-surface-hover hover:text-content-primary rounded-md transition-colors"),
                    head_cell: "text-content-muted rounded-md w-9 font-normal text-[0.8rem] text-center",
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Gender */}
          <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
            <span className="font-medium text-sm text-content-secondary pl-[5px]">Gender</span>
            <SimpleSelect
              value={formData?.gender || ""}
              onChange={(val) => updateField('gender', val)}
              options={genderOptions}
              placeholder="Select..."
              className="w-36 text-sm text-left"
            />
          </div>

          {/* Ethnicity */}
          <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
            <span className="font-medium text-sm text-content-secondary pl-[5px]">Ethnicity</span>
            <SimpleSelect
              value={formData?.ethnicity || ""}
              onChange={(val) => updateField('ethnicity', val)}
              options={ethnicityOptions}
              placeholder="Select..."
              className="w-44 text-sm text-left"
            />
          </div>

          {/* Height & Weight */}
          <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-medium text-content-secondary pl-[5px]">Height</label>
              <div className="relative w-14">
                <input
                  type="number"
                  min="0"
                  max="8"
                  value={formData?.height_feet || ""}
                  onChange={(e) => updateField('height_feet', parseInt(e.target.value) || 0)}
                  className="form-input w-full px-2 pr-6 py-1 text-sm text-left [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-content-muted">ft</span>
              </div>
              <div className="relative w-14">
                <input
                  type="number"
                  min="0"
                  max="11"
                  value={formData?.height_inches || ""}
                  onChange={(e) => updateField('height_inches', parseInt(e.target.value) || 0)}
                  className="form-input w-full px-2 pr-6 py-1 text-sm text-left [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-content-muted">in</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-medium text-content-secondary">Weight</label>
              <div className="relative w-20">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={formData?.weight || ""}
                  onChange={(e) => updateField('weight', parseFloat(e.target.value) || 0)}
                  className="form-input w-full px-2 pl-3 pr-8 py-1 text-sm text-left [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-content-muted">lbs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Column 2: Preferred Location + Primary Care Physician */}
      <div className="space-y-[10px]">
        {/* Preferred Location container */}
        <div className="bg-surface-input rounded-lg p-[5px] space-y-2">
          <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
            <Compass className="h-4 w-4 text-accent" />
            Preferred Location
          </h3>
          {/* Island - Inline dropdown */}
          <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
            <span className="font-medium text-sm text-content-secondary pl-[5px]">Island</span>
            <SimpleSelect
              value={formData?.preferred_island || ""}
              onChange={(val) => {
                updateField('preferred_island', val);
                updateField('preferred_neighborhood', "");
              }}
              options={islandOptions}
              placeholder="Select..."
              className="w-36 text-sm text-left"
            />
          </div>

          {/* Neighborhood - Inline dropdown */}
          <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
            <span className="font-medium text-sm text-content-secondary pl-[5px]">Neighborhood</span>
            <SimpleSelect
              value={formData?.preferred_neighborhood || ""}
              onChange={(val) => updateField('preferred_neighborhood', val)}
              options={neighborhoodMap[formData?.preferred_island || "Oahu"] || []}
              placeholder="Select..."
              className="w-36 text-sm text-left"
            />
          </div>

          {/* Min Budget - Currency field */}
          <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
            <label className="text-sm font-medium text-content-secondary pl-[5px]">Min Budget</label>
            <div className="relative w-32">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${formData?.minimum_budget ? "text-content-secondary" : "text-content-muted"}`}>$</span>
              <input
                type="number"
                step="100"
                min="0"
                value={formData?.minimum_budget || ""}
                onChange={(e) => updateField('minimum_budget', parseFloat(e.target.value) || 0)}
                className="form-input w-full px-2 pl-6 pr-8 py-1 text-sm text-left [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const current = parseFloat(formData?.minimum_budget) || 0;
                    updateField('minimum_budget', current + 100);
                  }}
                  className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"
                >
                  <ChevronUp className="h-2 w-2" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const current = parseFloat(formData?.minimum_budget) || 0;
                    updateField('minimum_budget', Math.max(0, current - 100));
                  }}
                  className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"
                >
                  <ChevronDown className="h-2 w-2" />
                </button>
              </div>
            </div>
          </div>

          {/* Max Budget - Currency field */}
          <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
            <label className="text-sm font-medium text-content-secondary pl-[5px]">Max Budget</label>
            <div className="relative w-32">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${formData?.maximum_budget ? "text-content-secondary" : "text-content-muted"}`}>$</span>
              <input
                type="number"
                step="100"
                min="0"
                value={formData?.maximum_budget || ""}
                onChange={(e) => updateField('maximum_budget', parseFloat(e.target.value) || 0)}
                className="form-input w-full px-2 pl-6 pr-8 py-1 text-sm text-left [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const current = parseFloat(formData?.maximum_budget) || 0;
                    updateField('maximum_budget', current + 100);
                  }}
                  className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"
                >
                  <ChevronUp className="h-2 w-2" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const current = parseFloat(formData?.maximum_budget) || 0;
                    updateField('maximum_budget', Math.max(0, current - 100));
                  }}
                  className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"
                >
                  <ChevronDown className="h-2 w-2" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Care Physician container */}
        <div className="bg-surface-input rounded-lg p-[5px] space-y-2">
          <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
            <Stethoscope className="h-4 w-4 text-accent" />
            Primary Care Physician
          </h3>

          <div className="space-y-2">
            {/* PCP Name */}
            <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
              <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Name</label>
              <input
                type="text"
                value={formData?.pcp_name || ""}
                onChange={(e) => updateField('pcp_name', e.target.value)}
                className="form-input text-sm text-left w-48 h-8 rounded-md px-3"
                placeholder="Physician name"
              />
            </div>

            {/* PCP Phone */}
            <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
              <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Phone</label>
              <input
                type="tel"
                value={formData?.pcp_phone || ""}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  updateField('pcp_phone', formatted);
                }}
                className="form-input text-sm text-left w-48 h-8 rounded-md px-3"
                placeholder="(123) 456-7890"
              />
            </div>

            {/* PCP Email */}
            <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
              <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Email</label>
              <div className="flex flex-col items-end">
                <input
                  type="email"
                  value={formData?.pcp_email || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateField('pcp_email', val);
                    if (val && (!val.includes('@') || val.indexOf('.', val.indexOf('@')) === -1)) {
                      setPcpEmailError("Invalid email format");
                    } else {
                      setPcpEmailError(null);
                    }
                  }}
                  className={`form-input text-sm text-left w-48 h-8 rounded-md px-3 ${pcpEmailError ? 'border-red-500/50' : ''}`}
                  placeholder="name@example.com"
                />
                {pcpEmailError && (
                  <span className="text-[10px] text-red-400 font-medium mt-1">Invalid format</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Column 3: Insurance + Diagnoses */}
      <div className="space-y-[10px]">
        {/* Insurance Information container */}
        <div className="bg-surface-input rounded-lg p-[5px] space-y-2">
          <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
            <ShieldCheck className="h-4 w-4 text-accent" />
            Insurance Information
          </h3>

          <div className="space-y-2">
            {/* Primary Insurance */}
            <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
              <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Primary</label>
              <input
                type="text"
                value={formData?.primary_insurance || ""}
                onChange={(e) => updateField('primary_insurance', e.target.value)}
                className="form-input text-sm text-left w-48 h-8 rounded-md px-3"
                placeholder="Primary insurance"
              />
            </div>

            {/* Secondary Insurance */}
            <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
              <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Secondary</label>
              <input
                type="text"
                value={formData?.secondary_insurance || ""}
                onChange={(e) => updateField('secondary_insurance', e.target.value)}
                className="form-input text-sm text-left w-48 h-8 rounded-md px-3"
                placeholder="Secondary insurance"
              />
            </div>
          </div>
        </div>

        {/* Diagnoses container */}
        <div className="bg-surface-input rounded-lg p-[5px] space-y-2">
          <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
            <Activity className="h-4 w-4 text-accent" />
            Diagnoses
          </h3>

          <div className="space-y-1">
            <textarea
              value={formData?.diagnoses || ""}
              onChange={(e) => updateField('diagnoses', e.target.value)}
              className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors form-input placeholder-content-muted min-h-[100px] resize-y"
              placeholder="Medical diagnoses and relevant health conditions..."
              disabled={readOnly}
            />
          </div>
        </div>
      </div>

      {/* Column 4: Additional Information */}
      <div className="space-y-[10px]">
        {/* Additional Information container */}
        <div className="bg-surface-input rounded-lg p-[5px] space-y-2">
          <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
            <Info className="h-4 w-4 text-accent" />
            Additional Information
          </h3>

          {/* Diet Restrictions */}
          <div className="space-y-1">
            <textarea
              value={formData?.diet_restrictions || ""}
              onChange={(e) => updateField('diet_restrictions', e.target.value)}
              className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors form-input placeholder-content-muted min-h-[100px] resize-y"
              placeholder="Diet Restrictions/Preferences"
            />
          </div>

          {/* Supplements */}
          <div className="space-y-1">
            <textarea
              value={formData?.supplements || ""}
              onChange={(e) => updateField('supplements', e.target.value)}
              className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors form-input placeholder-content-muted min-h-[100px] resize-y"
              placeholder="Supplements"
            />
          </div>

          {/* Dentition */}
          <div className="space-y-1">
            <input
              type="text"
              value={formData?.dentition || ""}
              onChange={(e) => updateField('dentition', e.target.value)}
              className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors form-input placeholder-content-muted"
              placeholder="Dentition"
            />
          </div>

          {/* Vision */}
          <div className="space-y-1">
            <input
              type="text"
              value={formData?.vision || ""}
              onChange={(e) => updateField('vision', e.target.value)}
              className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors form-input placeholder-content-muted"
              placeholder="Vision"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResidentInfoSection;






