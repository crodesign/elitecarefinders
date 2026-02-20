import { useState } from "react";
import { Phone, Mail, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, CalendarIcon, X, UserCheck, Compass, Stethoscope, ShieldCheck, Activity, Info, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatDateForHawaii, parseHawaiiDate } from "@/lib/hawaiiDate";
import { SimpleSelect } from "../../admin/SimpleSelect";

interface ResidentInfoSectionProps {
  formData?: any;
  setFormData?: (data: any) => void;
  readOnly?: boolean;
}

const ResidentInfoSection = ({ formData, setFormData, readOnly = false }: ResidentInfoSectionProps) => {
  const [pcpEmailError, setPcpEmailError] = useState<string | null>(null);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(
    formData?.date_of_birth ? (parseHawaiiDate(formData.date_of_birth) || new Date()) : new Date()
  );

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => (currentYear - i).toString());

  const updateField = (field: string, value: any) => {
    if (setFormData) {
      setFormData((prev: any) => ({ ...prev, [field]: value }));
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
      <div className="space-y-3">
        {/* Resident Info container */}
        <div className="bg-white/5 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-white flex items-center gap-2 pb-1">
            <User className="h-4 w-4 text-primary" />
            Resident Info
          </h3>

          {/* Full Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
              <label className="text-sm font-medium text-white/80 whitespace-nowrap">Full Name</label>
              <input
                type="text"
                value={formData?.resident_full_name || ""}
                onChange={(e) => updateField('resident_full_name', e.target.value)}
                className="bg-black/30 border-transparent text-white text-sm text-left placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 focus:outline-none transition-colors w-48 h-8 rounded-md px-3"
                placeholder="Enter full name"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2 pt-1">
            <h4 className="text-sm font-medium text-white/80">Address</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
                <label className="text-sm font-medium text-white/80 whitespace-nowrap">Street</label>
                <input
                  type="text"
                  value={formData?.street_address || ""}
                  onChange={(e) => updateField('street_address', e.target.value)}
                  className="bg-black/30 border-transparent text-white text-sm text-left placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 focus:outline-none transition-colors w-48 h-8 rounded-md px-3"
                  placeholder="Street address"
                />
              </div>
              <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
                <label className="text-sm font-medium text-white/80 whitespace-nowrap">City</label>
                <input
                  type="text"
                  value={formData?.city || ""}
                  onChange={(e) => updateField('city', e.target.value)}
                  className="bg-black/30 border-transparent text-white text-sm text-left placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 focus:outline-none transition-colors w-48 h-8 rounded-md px-3"
                  placeholder="City"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all flex-1">
                  <label className="text-sm font-medium text-white/80 whitespace-nowrap">State</label>
                  <input
                    type="text"
                    list="states-list-resident"
                    value={formData?.state || ""}
                    onChange={(e) => {
                      updateField('state', e.target.value);
                    }}
                    className="bg-black/30 border-transparent text-white text-sm text-left placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 focus:outline-none transition-colors w-32 h-8 rounded-md px-3"
                    placeholder="State"
                  />
                  <datalist id="states-list-resident">
                    {stateOptions.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
                  <label className="text-sm font-medium text-white/80 whitespace-nowrap">Zip</label>
                  <input
                    type="text"
                    value={formData?.zip_code || ""}
                    onChange={(e) => updateField('zip_code', e.target.value)}
                    className="bg-black/30 border-transparent text-white text-sm text-left placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 focus:outline-none transition-colors w-20 h-8 rounded-md px-3"
                    placeholder="Zip"
                  />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Resident Details container */}
        <div className="bg-white/5 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-white flex items-center gap-2 pb-1">
            <UserCheck className="h-4 w-4 text-primary" />
            Resident Details
          </h3>

          {/* Date of Birth */}
          <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
            <label className="text-sm font-medium text-white/80 whitespace-nowrap">Date of Birth</label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-between text-left font-normal rounded-md px-3 py-1.5 text-sm bg-black/30 border-transparent hover:bg-black/50 hover:text-white",
                    formData?.date_of_birth ? "text-white" : "text-zinc-500"
                  )}
                >
                  <span className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData?.date_of_birth
                      ? (parseHawaiiDate(formData.date_of_birth)
                        ? format(parseHawaiiDate(formData.date_of_birth)!, "MMM d, yyyy")
                        : "Invalid date")
                      : "Pick a date"}
                  </span>
                  {formData?.date_of_birth && parseHawaiiDate(formData.date_of_birth) && (
                    <span className="text-sm text-zinc-400">
                      Age: {calculateAge(parseHawaiiDate(formData.date_of_birth) || undefined)}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 bg-zinc-900 border-white/10 text-white [&_.rdp-caption_dropdowns]:!hidden [&_.rdp-caption_label]:!hidden [&_.rdp-nav]:!hidden [&_.rdp-dropdown]:!hidden [&_.rdp-head_cell]:text-zinc-500"
                align="start"
              >
                {/* Custom header: close button + month/year nav */}
                <div className="p-3 pb-1 space-y-2">
                  {/* Close button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setCalendarOpen(false)}
                      className="p-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
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
                      className="h-7 w-7 rounded-md inline-flex items-center justify-center transition-colors hover:bg-white/10 text-white"
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
                      className="h-7 w-7 rounded-md inline-flex items-center justify-center transition-colors hover:bg-white/10 text-white"
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
                    if (date) setCalendarOpen(false);
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
                    day_today: "bg-white/10 text-white",
                    day_outside: "text-zinc-600 opacity-50",
                    day_disabled: "text-zinc-700 opacity-50",
                    day: cn("h-9 w-9 p-0 font-normal text-zinc-300 aria-selected:opacity-100 hover:bg-white/10 hover:text-white rounded-md transition-colors"),
                    head_cell: "text-zinc-500 rounded-md w-9 font-normal text-[0.8rem]",
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Gender */}
          <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
            <span className="font-medium text-sm text-white/80">Gender</span>
            <SimpleSelect
              value={formData?.gender || ""}
              onChange={(val) => updateField('gender', val)}
              options={genderOptions}
              placeholder="Select..."
              className="w-36 text-sm text-left"
            />
          </div>

          {/* Ethnicity */}
          <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
            <span className="font-medium text-sm text-white/80">Ethnicity</span>
            <SimpleSelect
              value={formData?.ethnicity || ""}
              onChange={(val) => updateField('ethnicity', val)}
              options={ethnicityOptions}
              placeholder="Select..."
              className="w-44 text-sm text-left"
            />
          </div>

          {/* Height & Weight */}
          <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-medium text-white/80">Height</label>
              <div className="relative w-14">
                <input
                  type="number"
                  min="0"
                  max="8"
                  value={formData?.height_feet || ""}
                  onChange={(e) => updateField('height_feet', parseInt(e.target.value) || 0)}
                  className="w-full rounded-md px-2 pr-6 py-1 text-sm text-left focus:outline-none transition-colors [&::-webkit-inner-spin-button]:appearance-none bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                  placeholder="0"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">ft</span>
              </div>
              <div className="relative w-14">
                <input
                  type="number"
                  min="0"
                  max="11"
                  value={formData?.height_inches || ""}
                  onChange={(e) => updateField('height_inches', parseInt(e.target.value) || 0)}
                  className="w-full rounded-md px-2 pr-6 py-1 text-sm text-left focus:outline-none transition-colors [&::-webkit-inner-spin-button]:appearance-none bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                  placeholder="0"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">in</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-medium text-white/80">Weight</label>
              <div className="relative w-20">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={formData?.weight || ""}
                  onChange={(e) => updateField('weight', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-md px-2 pl-3 pr-8 py-1 text-sm text-left focus:outline-none transition-colors [&::-webkit-inner-spin-button]:appearance-none bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                  placeholder="0"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">lbs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Column 2: Preferred Location + Primary Care Physician */}
      <div className="space-y-3">
        {/* Preferred Location container */}
        <div className="bg-white/5 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-white flex items-center gap-2 pb-1">
            <Compass className="h-4 w-4 text-primary" />
            Preferred Location
          </h3>
          {/* Island - Inline dropdown */}
          <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
            <span className="font-medium text-sm text-white/80">Island</span>
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
          <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
            <span className="font-medium text-sm text-white/80">Neighborhood</span>
            <SimpleSelect
              value={formData?.preferred_neighborhood || ""}
              onChange={(val) => updateField('preferred_neighborhood', val)}
              options={neighborhoodMap[formData?.preferred_island || "Oahu"] || []}
              placeholder="Select..."
              className="w-36 text-sm text-left"
            />
          </div>

          {/* Min Budget - Currency field */}
          <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
            <label className="text-sm font-medium text-white/80">Min Budget</label>
            <div className="relative w-32">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${formData?.minimum_budget ? "text-white/80" : "text-zinc-500"}`}>$</span>
              <input
                type="number"
                step="100"
                min="0"
                value={formData?.minimum_budget || ""}
                onChange={(e) => updateField('minimum_budget', parseFloat(e.target.value) || 0)}
                className="w-full rounded-md px-2 pl-6 pr-8 py-1 text-sm text-left focus:outline-none transition-colors [&::-webkit-inner-spin-button]:appearance-none bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                placeholder="0"
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const current = parseFloat(formData?.minimum_budget) || 0;
                    updateField('minimum_budget', current + 100);
                  }}
                  className="p-0.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                >
                  <ChevronUp className="h-2 w-2" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const current = parseFloat(formData?.minimum_budget) || 0;
                    updateField('minimum_budget', Math.max(0, current - 100));
                  }}
                  className="p-0.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                >
                  <ChevronDown className="h-2 w-2" />
                </button>
              </div>
            </div>
          </div>

          {/* Max Budget - Currency field */}
          <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
            <label className="text-sm font-medium text-white/80">Max Budget</label>
            <div className="relative w-32">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${formData?.maximum_budget ? "text-white/80" : "text-zinc-500"}`}>$</span>
              <input
                type="number"
                step="100"
                min="0"
                value={formData?.maximum_budget || ""}
                onChange={(e) => updateField('maximum_budget', parseFloat(e.target.value) || 0)}
                className="w-full rounded-md px-2 pl-6 pr-8 py-1 text-sm text-left focus:outline-none transition-colors [&::-webkit-inner-spin-button]:appearance-none bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                placeholder="0"
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const current = parseFloat(formData?.maximum_budget) || 0;
                    updateField('maximum_budget', current + 100);
                  }}
                  className="p-0.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                >
                  <ChevronUp className="h-2 w-2" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const current = parseFloat(formData?.maximum_budget) || 0;
                    updateField('maximum_budget', Math.max(0, current - 100));
                  }}
                  className="p-0.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                >
                  <ChevronDown className="h-2 w-2" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Care Physician container */}
        <div className="bg-white/5 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-white flex items-center gap-2 pb-1">
            <Stethoscope className="h-4 w-4 text-primary" />
            Primary Care Physician
          </h3>

          <div className="space-y-2">
            {/* PCP Name */}
            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
              <label className="text-sm font-medium text-white/80 whitespace-nowrap">Name</label>
              <input
                type="text"
                value={formData?.pcp_name || ""}
                onChange={(e) => updateField('pcp_name', e.target.value)}
                className="bg-black/30 border-transparent text-white text-sm text-left placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 focus:outline-none transition-colors w-48 h-8 rounded-md px-3"
                placeholder="Physician name"
              />
            </div>

            {/* PCP Phone */}
            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
              <label className="text-sm font-medium text-white/80 whitespace-nowrap">Phone</label>
              <input
                type="tel"
                value={formData?.pcp_phone || ""}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  updateField('pcp_phone', formatted);
                }}
                className="bg-black/30 border-transparent text-white text-sm text-left placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 focus:outline-none transition-colors w-48 h-8 rounded-md px-3"
                placeholder="(123) 456-7890"
              />
            </div>

            {/* PCP Email */}
            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
              <label className="text-sm font-medium text-white/80 whitespace-nowrap">Email</label>
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
                  className={`bg-black/30 border-transparent text-white text-sm text-left placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 focus:outline-none transition-colors w-48 h-8 rounded-md px-3 ${pcpEmailError ? 'border-red-500/50' : ''}`}
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
      <div className="space-y-3">
        {/* Insurance Information container */}
        <div className="bg-white/5 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-white flex items-center gap-2 pb-1">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Insurance Information
          </h3>

          <div className="space-y-2">
            {/* Primary Insurance */}
            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
              <label className="text-sm font-medium text-white/80 whitespace-nowrap">Primary</label>
              <input
                type="text"
                value={formData?.primary_insurance || ""}
                onChange={(e) => updateField('primary_insurance', e.target.value)}
                className="bg-black/30 border-transparent text-white text-sm text-left placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 focus:outline-none transition-colors w-48 h-8 rounded-md px-3"
                placeholder="Primary insurance"
              />
            </div>

            {/* Secondary Insurance */}
            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/10 rounded-lg transition-all">
              <label className="text-sm font-medium text-white/80 whitespace-nowrap">Secondary</label>
              <input
                type="text"
                value={formData?.secondary_insurance || ""}
                onChange={(e) => updateField('secondary_insurance', e.target.value)}
                className="bg-black/30 border-transparent text-white text-sm text-left placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 focus:outline-none transition-colors w-48 h-8 rounded-md px-3"
                placeholder="Secondary insurance"
              />
            </div>
          </div>
        </div>

        {/* Diagnoses container */}
        <div className="bg-white/5 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-white flex items-center gap-2 pb-1">
            <Activity className="h-4 w-4 text-primary" />
            Diagnoses
          </h3>

          <div className="space-y-1">
            <textarea
              value={formData?.diagnoses || ""}
              onChange={(e) => updateField('diagnoses', e.target.value)}
              className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors bg-white/10 text-white placeholder-zinc-400 hover:bg-white/15 focus:bg-white/15 min-h-[100px] resize-y"
              placeholder="Medical diagnoses and relevant health conditions..."
              disabled={readOnly}
            />
          </div>
        </div>
      </div>

      {/* Column 4: Additional Information */}
      <div className="space-y-3">
        {/* Additional Information container */}
        <div className="bg-white/5 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-white flex items-center gap-2 pb-1">
            <Info className="h-4 w-4 text-primary" />
            Additional Information
          </h3>

          {/* Diet Restrictions */}
          <div className="space-y-1">
            <textarea
              value={formData?.diet_restrictions || ""}
              onChange={(e) => updateField('diet_restrictions', e.target.value)}
              className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors bg-white/10 text-white placeholder-zinc-400 hover:bg-white/15 focus:bg-white/15 min-h-[100px] resize-y"
              placeholder="Diet Restrictions/Preferences"
            />
          </div>

          {/* Supplements */}
          <div className="space-y-1">
            <textarea
              value={formData?.supplements || ""}
              onChange={(e) => updateField('supplements', e.target.value)}
              className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors bg-white/10 text-white placeholder-zinc-400 hover:bg-white/15 focus:bg-white/15 min-h-[100px] resize-y"
              placeholder="Supplements"
            />
          </div>

          {/* Dentition */}
          <div className="space-y-1">
            <input
              type="text"
              value={formData?.dentition || ""}
              onChange={(e) => updateField('dentition', e.target.value)}
              className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors bg-white/10 text-white placeholder-zinc-400 hover:bg-white/15 focus:bg-white/15"
              placeholder="Dentition"
            />
          </div>

          {/* Vision */}
          <div className="space-y-1">
            <input
              type="text"
              value={formData?.vision || ""}
              onChange={(e) => updateField('vision', e.target.value)}
              className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors bg-white/10 text-white placeholder-zinc-400 hover:bg-white/15 focus:bg-white/15"
              placeholder="Vision"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResidentInfoSection;