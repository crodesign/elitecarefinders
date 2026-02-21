import React, { useState } from "react";
import { CalendarIcon, X, Building2, DollarSign, FileCheck, ClipboardList, HeartPulse, Shield, Check, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { validateEmailField } from "@/lib/validateEmail";
import { handlePhoneInput } from "@/lib/formatPhoneInput";
import { formatDateForHawaii, parseHawaiiDate } from "@/lib/hawaiiDate";
import { SimpleSelect } from "../../admin/SimpleSelect";
import { EnhancedSelect } from "../../admin/EnhancedSelect";

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 1900 + 10 }, (_, i) => (1900 + i).toString()).reverse();

interface ChecklistSectionProps {
  formData?: any;
  setFormData?: (data: any) => void;
  handleChange?: (data: any) => void;
  readOnly?: boolean;
  invoiceEditMode?: boolean;
  onPrevious?: () => void;
  contactId?: string;
}

// ───────────────── helpers ─────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg">
      <label className="text-sm font-medium text-content-secondary whitespace-nowrap">{label}</label>
      {children}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-input rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pb-1">
        <Icon className="h-4 w-4 text-accent" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function ToggleRow({
  id, label, checked, onChange, disabled, children,
}: {
  id: string; label: string; checked: boolean;
  onChange: (v: boolean) => void; disabled?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 py-2 pr-3 pl-3.5 bg-surface-hover rounded-lg">
        <label htmlFor={id} className="text-sm font-medium text-content-secondary select-none cursor-pointer">{label}</label>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
          className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-hover"
        />
      </div>
      {children}
    </div>
  );
}

function CheckRow({ id, label, checked, onChange, disabled }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      id={id}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`w-full flex items-center justify-between p-3 rounded-lg border border-transparent transition-all ${checked ? "bg-surface-hover" : "bg-surface-hover hover:bg-black/20"
        }`}
    >
      <span className={`text-sm font-medium ${checked ? "text-content-primary" : "text-content-secondary"}`}>{label}</span>
      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${checked ? "border border-accent bg-accent" : "bg-surface-secondary"
        }`}>
        {checked
          ? <Check className="h-3 w-3 text-white" />
          : <X className="h-3 w-3 text-content-muted" />
        }
      </div>
    </button>
  );
}

const calendarClassNames = {
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
};

function CalendarPopoverContent({ open, onClose, value, onChange, disabled }: {
  open: boolean; onClose: () => void;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  disabled?: boolean;
}) {
  const parsed = value ? parseHawaiiDate(value) : undefined;
  const [month, setMonth] = React.useState<Date>(parsed || new Date());
  React.useEffect(() => { if (open) setMonth(parsed || new Date()); }, [open]);
  return (
    <PopoverContent
      className="w-auto p-0 bg-surface-secondary border-ui-border text-content-primary"
      align="end"
    >
      <div className="p-3 pb-1 space-y-2">
        {/* Close */}
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-surface-hover text-content-muted hover:text-content-primary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Month/year nav */}
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => { const p = new Date(month); p.setMonth(p.getMonth() - 1); setMonth(p); }} className="h-7 w-7 rounded-md inline-flex items-center justify-center transition-colors hover:bg-surface-hover text-content-primary">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1.5 flex-1 justify-center">
            <SimpleSelect
              value={monthNames[month.getMonth()]}
              onChange={(val: string) => { const idx = monthNames.indexOf(val); if (idx >= 0) { const u = new Date(month); u.setMonth(idx); setMonth(u); } }}
              options={monthNames}
              placeholder="Month"
              className="w-[110px]"
              textSize="text-xs"
            />
            <SimpleSelect
              value={month.getFullYear().toString()}
              onChange={(val: string) => { const u = new Date(month); u.setFullYear(parseInt(val)); setMonth(u); }}
              options={yearOptions}
              placeholder="Year"
              className="w-[70px]"
              textSize="text-xs"
            />
          </div>
          <button type="button" onClick={() => { const n = new Date(month); n.setMonth(n.getMonth() + 1); setMonth(n); }} className="h-7 w-7 rounded-md inline-flex items-center justify-center transition-colors hover:bg-surface-hover text-content-primary">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <Calendar
        mode="single"
        month={month}
        onMonthChange={setMonth}
        selected={parsed ?? undefined}
        onSelect={(date) => { onChange(date ? formatDateForHawaii(date) : null); if (date) onClose(); }}
        className="p-3 pt-0 pointer-events-auto"
        classNames={calendarClassNames}
      />
    </PopoverContent>
  );
}

function DateField({ label, value, onChange, disabled, clearable = true }: { label: string; value: string | null | undefined; onChange: (v: string | null) => void; disabled?: boolean; clearable?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const parsed = value ? parseHawaiiDate(value) : undefined;
  return (
    <FieldRow label={label}>
      <div className="flex items-center gap-1.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button type="button" disabled={disabled} className={cn("form-input flex items-center gap-2 px-3 py-1.5 text-sm h-8 rounded-md", !value && "text-content-muted")}>
              <CalendarIcon className="h-3.5 w-3.5 text-content-muted flex-shrink-0" />
              {parsed ? format(parsed, "MMM d, yyyy") : <span>Pick a date</span>}
            </button>
          </PopoverTrigger>
          <CalendarPopoverContent open={open} onClose={() => setOpen(false)} value={value} onChange={onChange} disabled={disabled} />
        </Popover>
        {clearable && value && (
          <button type="button" onClick={() => onChange(null)} className="p-1 rounded bg-accent text-white hover:opacity-80 transition-opacity">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </FieldRow>
  );
}

/** Bare date picker — no FieldRow wrapper, for use inline inside an existing row */
function InlineDatePicker({ value, onChange, disabled }: { value: string | null | undefined; onChange: (v: string | null) => void; disabled?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const parsed = value ? parseHawaiiDate(value) : undefined;
  return (
    <div className="flex items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" disabled={disabled} className={cn("form-input flex items-center gap-2 px-3 py-1.5 text-sm h-8 rounded-md", !value && "text-content-muted")}>
            <CalendarIcon className="h-3.5 w-3.5 text-content-muted flex-shrink-0" />
            {parsed ? format(parsed, "MMM d, yyyy") : <span>Pick a date</span>}
          </button>
        </PopoverTrigger>
        <CalendarPopoverContent open={open} onClose={() => setOpen(false)} value={value} onChange={onChange} disabled={disabled} />
      </Popover>
      {value && (
        <button type="button" onClick={() => onChange(null)} className="p-1 rounded bg-accent text-white hover:opacity-80 transition-opacity">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─────────────── Main Component ───────────────

const ChecklistSection = ({ formData, setFormData, handleChange: handleChangeProp, readOnly = false, invoiceEditMode = false }: ChecklistSectionProps) => {
  const onChange = handleChangeProp ?? setFormData;
  const [cmaEmailError, setCmaEmailError] = useState<string | null>(null);
  const [careProviderEmailError, setCareProviderEmailError] = useState<string | null>(null);

  const updateField = (field: string, value: any) => {
    if (onChange) {
      onChange((prev: any) => ({ ...prev, [field]: value }));
    }
    if (field === 'cmaEmail') setCmaEmailError(validateEmailField(value));
    if (field === 'careProviderEmail') setCareProviderEmailError(validateEmailField(value));
  };

  const monthlyRate = parseFloat(formData?.referralMonthlyRate) || 0;
  const feePercentage = parseFloat(formData?.referralFeePercentage) || 0;
  const taxPercentage = parseFloat(formData?.referralTax) || 4.712;
  const referralAmount = (monthlyRate * feePercentage) / 100;
  const referralTotal = referralAmount + (referralAmount * taxPercentage) / 100;

  return (
    <div className="flex gap-4 items-start">

      {/* ── COLUMN 1: Care Provider, Financials, Invoice Status ── */}
      <div className="flex-1 space-y-4 min-w-0">

        <Section icon={Building2} title="Care Provider Info">
          <FieldRow label="Provider Name">
            <input type="text" value={formData?.careProviderName || ""} onChange={(e) => updateField('careProviderName', e.target.value)} disabled={readOnly} placeholder="Care provider name" className="form-input text-sm w-48 h-8 rounded-md px-3" />
          </FieldRow>
          <FieldRow label="Provider Phone">
            <input type="tel" value={formData?.careProviderPhone || ""} onChange={(e) => handlePhoneInput(e.target.value, updateField, 'careProviderPhone')} disabled={readOnly} placeholder="(808) 000-0000" className="form-input text-sm w-48 h-8 rounded-md px-3" />
          </FieldRow>
          <div className="space-y-1">
            <FieldRow label="Provider Email">
              <input type="email" value={formData?.careProviderEmail || ""} onChange={(e) => updateField('careProviderEmail', e.target.value)} disabled={readOnly} placeholder="name@example.com" className={cn("form-input text-sm w-48 h-8 rounded-md px-3", careProviderEmailError && "border-red-500")} />
            </FieldRow>
            {careProviderEmailError && <p className="text-xs text-red-500 pl-3">{careProviderEmailError}</p>}
          </div>
          <FieldRow label="Location">
            <input type="text" value={formData?.referralLocation || ""} onChange={(e) => updateField('referralLocation', e.target.value)} disabled={readOnly} placeholder="Location" className="form-input text-sm w-48 h-8 rounded-md px-3" />
          </FieldRow>
          <FieldRow label="Location Address">
            <input type="text" value={formData?.referralLocationAddress || ""} onChange={(e) => updateField('referralLocationAddress', e.target.value)} disabled={readOnly} placeholder="Full address" className="form-input text-sm w-48 h-8 rounded-md px-3" />
          </FieldRow>
        </Section>

        <Section icon={DollarSign} title="Referral Financials">
          <FieldRow label="Monthly Rate">
            <div className="relative w-36">
              <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-sm ${formData?.referralMonthlyRate ? 'text-content-secondary' : 'text-content-muted'}`}>$</span>
              <input
                type="number" step="100" min="0"
                value={formData?.referralMonthlyRate || ""}
                onChange={(e) => updateField('referralMonthlyRate', parseFloat(e.target.value) || 0)}
                disabled={readOnly}
                placeholder="0.00"
                className="form-input text-sm w-full h-8 rounded-md pl-6 pr-8 [&::-webkit-inner-spin-button]:appearance-none"
              />
              {!readOnly && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                  <button type="button" onClick={() => updateField('referralMonthlyRate', (parseFloat(formData?.referralMonthlyRate) || 0) + 100)} className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"><ChevronUp className="h-2 w-2" /></button>
                  <button type="button" onClick={() => updateField('referralMonthlyRate', Math.max(0, (parseFloat(formData?.referralMonthlyRate) || 0) - 100))} className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"><ChevronDown className="h-2 w-2" /></button>
                </div>
              )}
            </div>
          </FieldRow>
          <FieldRow label="Referral %">
            <div className="relative w-36">
              <input
                type="number" step="1" min="0" max="100"
                value={formData?.referralFeePercentage || ""}
                onChange={(e) => updateField('referralFeePercentage', parseFloat(e.target.value) || 0)}
                disabled={readOnly}
                placeholder="0"
                className="form-input text-sm w-full h-8 rounded-md pl-3 pr-8 [&::-webkit-inner-spin-button]:appearance-none"
              />
              {!readOnly && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                  <button type="button" onClick={() => updateField('referralFeePercentage', Math.min(100, (parseFloat(formData?.referralFeePercentage) || 0) + 1))} className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"><ChevronUp className="h-2 w-2" /></button>
                  <button type="button" onClick={() => updateField('referralFeePercentage', Math.max(0, (parseFloat(formData?.referralFeePercentage) || 0) - 1))} className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"><ChevronDown className="h-2 w-2" /></button>
                </div>
              )}
            </div>
          </FieldRow>
          <FieldRow label="Referral Amount">
            <div className="relative w-36">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
              <input readOnly value={referralAmount.toFixed(2)} className="form-input text-sm w-full h-8 rounded-md pl-6 pr-3 opacity-60 cursor-not-allowed" />
            </div>
          </FieldRow>
          <FieldRow label="Tax %">
            <div className="relative w-36">
              <input
                type="number" step="0.001" min="0"
                value={formData?.referralTax || "4.712"}
                onChange={(e) => updateField('referralTax', parseFloat(e.target.value) || 4.712)}
                disabled={readOnly}
                placeholder="4.712"
                className="form-input text-sm w-full h-8 rounded-md pl-3 pr-8 [&::-webkit-inner-spin-button]:appearance-none"
              />
              {!readOnly && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                  <button type="button" onClick={() => updateField('referralTax', Math.round(((parseFloat(formData?.referralTax) || 4.712) + 0.001) * 1000) / 1000)} className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"><ChevronUp className="h-2 w-2" /></button>
                  <button type="button" onClick={() => updateField('referralTax', Math.max(0, Math.round(((parseFloat(formData?.referralTax) || 4.712) - 0.001) * 1000) / 1000))} className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"><ChevronDown className="h-2 w-2" /></button>
                </div>
              )}
            </div>
          </FieldRow>
          <FieldRow label="Referral Total">
            <div className="relative w-36">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
              <input readOnly value={referralTotal.toFixed(2)} className="form-input text-sm w-full h-8 rounded-md pl-6 pr-3 opacity-60 cursor-not-allowed" />
            </div>
          </FieldRow>
        </Section>

        {/* Invoice Status — always shown in col 1 (invoiceEditMode shows this exclusively) */}
        <Section icon={FileCheck} title="Invoice Status">
          {/* Invoice Sent row */}
          <div className="flex items-center justify-between gap-2 py-2 pr-3 pl-3.5 bg-surface-hover rounded-lg">
            <label htmlFor="col1-invoice-sent" className="text-sm font-medium text-content-secondary select-none cursor-pointer whitespace-nowrap">Invoice Sent</label>
            <div className="flex items-center gap-2">
              {formData?.invoiceSent && (
                <InlineDatePicker
                  value={formData?.invoiceSentDate}
                  onChange={(v) => {
                    updateField('invoiceSentDate', v);
                    if (!v) {
                      updateField('invoiceReceivedDate', null);
                      updateField('invoiceReceived', false);
                      updateField('invoiceReceivedTogglePosition', false);
                    }
                  }}
                  disabled={readOnly}
                />
              )}
              <Switch
                id="col1-invoice-sent"
                checked={formData?.invoiceSent || false}
                onCheckedChange={(checked) => { updateField('invoiceSent', checked); updateField('invoiceSentTogglePosition', checked); }}
                disabled={readOnly}
                className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-hover"
              />
            </div>
          </div>
          {/* Invoice Paid row */}
          <div className={cn("flex items-center justify-between gap-2 py-2 pr-3 pl-3.5 bg-surface-hover rounded-lg", (!formData?.invoiceSentDate) && "opacity-50")}>
            <label htmlFor="col1-invoice-received" className="text-sm font-medium text-content-secondary select-none cursor-pointer whitespace-nowrap">
              Invoice Paid{!formData?.invoiceSentDate ? " (requires sent date)" : ""}
            </label>
            <div className="flex items-center gap-2">
              {formData?.invoiceReceived && formData?.invoiceSentDate && (
                <InlineDatePicker value={formData?.invoiceReceivedDate} onChange={(v) => updateField('invoiceReceivedDate', v)} disabled={readOnly} />
              )}
              <Switch
                id="col1-invoice-received"
                checked={formData?.invoiceReceived || false}
                onCheckedChange={(checked) => { updateField('invoiceReceived', checked); updateField('invoiceReceivedTogglePosition', checked); }}
                disabled={readOnly || !formData?.invoiceSentDate}
                className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-hover"
              />
            </div>
          </div>
        </Section>

      </div>{/* end col 1 */}

      {/* ── COLUMNS 2-4 only outside invoiceEditMode ── */}
      {!invoiceEditMode && (
        <>
          {/* ── COLUMN 2: Move-in, PCP ── */}
          <div className="flex-1 space-y-4 min-w-0">

            <Section icon={CalendarIcon} title="Move-in Dates">
              <FieldRow label="Move-in Date">
                <input readOnly value={formData?.timeToMove || ""} className="form-input text-sm w-48 h-8 rounded-md px-3 opacity-60 cursor-not-allowed" />
              </FieldRow>
              <DateField label="Actual Move-in" value={formData?.actualMoveDate} onChange={(v) => updateField('actualMoveDate', v)} disabled={readOnly} />
            </Section>

            <Section icon={HeartPulse} title="Primary Care Physician">
              <FieldRow label="PCP Name"><input readOnly value={formData?.pcp_name || ""} className="form-input text-sm w-48 h-8 rounded-md px-3 opacity-60 cursor-not-allowed" /></FieldRow>
              <FieldRow label="PCP Email"><input readOnly value={formData?.pcp_email || ""} className="form-input text-sm w-48 h-8 rounded-md px-3 opacity-60 cursor-not-allowed" /></FieldRow>
              <FieldRow label="PCP Phone/Fax"><input readOnly value={formData?.pcp_phone || ""} className="form-input text-sm w-48 h-8 rounded-md px-3 opacity-60 cursor-not-allowed" /></FieldRow>
            </Section>

          </div>{/* end col 2 */}

          {/* ── COLUMN 3: COVID, TB Clearance ── */}
          <div className="flex-1 space-y-4 min-w-0">

            <div className="bg-surface-input rounded-lg p-4 space-y-3">
              {/* Title + subtitle left, switch right */}
              <div className="flex items-start justify-between gap-2 pb-1">
                <div>
                  <h3 className="text-sm font-medium text-content-primary flex items-center gap-2">
                    <Shield className="h-4 w-4 text-accent" />
                    COVID
                  </h3>
                  <p className="text-xs text-content-muted mt-0.5 pl-6">Test 72 Hours Prior</p>
                </div>
                <Switch
                  id="covid-test"
                  checked={formData?.covidTest || false}
                  onCheckedChange={(checked) => { updateField('covidTest', checked); updateField('covidTestTogglePosition', checked); }}
                  disabled={readOnly}
                  className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-hover mt-0.5"
                />
              </div>
              {/* Fields revealed when on */}
              {formData?.covidTest && (
                <div className="space-y-2">
                  <DateField label="Test Date" value={formData?.covidTestDate} onChange={(v) => updateField('covidTestDate', v)} disabled={readOnly} />
                  <FieldRow label="Test Result">
                    <EnhancedSelect
                      value={formData?.covidTestResult || ""}
                      onChange={(v) => updateField('covidTestResult', v)}
                      options={[
                        { value: "Positive", label: "Positive" },
                        { value: "Negative", label: "Negative" },
                        { value: "Indeterminate", label: "Indeterminate" },
                      ]}
                      placeholder="Select result"
                      className="w-40"
                      textSize="text-sm"
                      allowNone
                    />
                  </FieldRow>
                  <FieldRow label="Vaccinations">
                    <EnhancedSelect
                      value={formData?.covidVaccinationDetails || ""}
                      onChange={(v) => updateField('covidVaccinationDetails', v)}
                      options={[
                        { value: "None", label: "None" },
                        { value: "Moderna", label: "Moderna" },
                        { value: "Pfizer-BioNTech", label: "Pfizer-BioNTech" },
                        { value: "Novavax", label: "Novavax" },
                      ]}
                      placeholder="Select"
                      className="w-40"
                      textSize="text-sm"
                      allowNone
                    />
                  </FieldRow>
                </div>
              )}
            </div>

            <div className="bg-surface-input rounded-lg p-4 space-y-3">
              {/* Title + subtitle left, switch right */}
              <div className="flex items-start justify-between gap-2 pb-1">
                <div>
                  <h3 className="text-sm font-medium text-content-primary flex items-center gap-2">
                    <Shield className="h-4 w-4 text-accent" />
                    TB Clearance
                  </h3>
                  <p className="text-xs text-content-muted mt-0.5 pl-6">2-step PPD or Quantiferon</p>
                </div>
                <Switch
                  id="tb-clearance"
                  checked={formData?.tbClearance || false}
                  onCheckedChange={(checked) => { updateField('tbClearance', checked); updateField('tbClearanceTogglePosition', checked); }}
                  disabled={readOnly}
                  className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-hover mt-0.5"
                />
              </div>
              {/* Fields revealed when on */}
              {formData?.tbClearance && (
                <div className="space-y-2">
                  <FieldRow label="First Test Result">
                    <EnhancedSelect
                      value={formData?.tbClearanceField1 || ""}
                      onChange={(v) => updateField('tbClearanceField1', v)}
                      options={[
                        { value: "Positive", label: "Positive" },
                        { value: "Negative", label: "Negative" },
                        { value: "Indeterminate", label: "Indeterminate" },
                      ]}
                      placeholder="Select result"
                      className="w-40"
                      textSize="text-sm"
                      allowNone
                    />
                  </FieldRow>
                  <FieldRow label="Second Test Result">
                    <EnhancedSelect
                      value={formData?.tbClearanceField2 || ""}
                      onChange={(v) => updateField('tbClearanceField2', v)}
                      options={[
                        { value: "Positive", label: "Positive" },
                        { value: "Negative", label: "Negative" },
                        { value: "Indeterminate", label: "Indeterminate" },
                      ]}
                      placeholder="Select result"
                      className="w-40"
                      textSize="text-sm"
                      allowNone
                    />
                  </FieldRow>
                  <div className="bg-surface-hover rounded-lg p-3 space-y-2">
                    {/* Chest X-Ray toggle inline with label */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-content-secondary">Chest X-Ray <span className="text-content-muted">("No Active TB")</span></span>
                      <Switch
                        id="chest-xray"
                        checked={formData?.chestXray || false}
                        onCheckedChange={(checked) => { updateField('chestXray', checked); updateField('chestXrayTogglePosition', checked); }}
                        disabled={readOnly}
                        className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-hover"
                      />
                    </div>
                    {formData?.chestXray && (
                      <div className="space-y-2 pt-1">
                        <DateField label="X-Ray Date" value={formData?.chestXrayDate} onChange={(v) => updateField('chestXrayDate', v)} disabled={readOnly} />
                        <FieldRow label="X-Ray Result">
                          <EnhancedSelect
                            value={formData?.chestXrayResult || ""}
                            onChange={(v) => updateField('chestXrayResult', v)}
                            options={[
                              { value: "Clear", label: "Clear" },
                              { value: "No Active TB", label: "No Active TB" },
                              { value: "Abnormal", label: "Abnormal" },
                            ]}
                            placeholder="Select result"
                            className="w-40"
                            textSize="text-sm"
                            allowNone
                          />
                        </FieldRow>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <Section icon={ClipboardList} title="Required Items">
              <CheckRow id="admission-hp" label="Admission H & P" checked={formData?.admissionHp || false} onChange={(v) => { updateField('admissionHp', v); updateField('admissionHpTogglePosition', v); }} disabled={readOnly} />
              <CheckRow id="care-home-forms" label="Care Home Forms (ARCH / E-ARCH)" checked={formData?.careHomeForms || false} onChange={(v) => { updateField('careHomeForms', v); updateField('careHomeFormsTogglePosition', v); }} disabled={readOnly} />
              <CheckRow id="polst" label="POLST" checked={formData?.polst || false} onChange={(v) => { updateField('polst', v); updateField('polstTogglePosition', v); }} disabled={readOnly} />
              <CheckRow id="mar-tar" label="MAR / TAR" checked={formData?.marTar || false} onChange={(v) => { updateField('marTar', v); updateField('marTarTogglePosition', v); }} disabled={readOnly} />
            </Section>

          </div>{/* end col 3 */}

          {/* ── COLUMN 4: AD/POA, Email/Fax Records ── */}
          <div className="flex-1 space-y-4 min-w-0">
            <div className="bg-surface-input rounded-lg p-4 space-y-3">
              {/* Title row: icon+title left, switch right */}
              <div className="flex items-center justify-between gap-2 pb-1">
                <h3 className="text-sm font-medium text-content-primary flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent" />
                  AD / POA Documents
                </h3>
                <Switch
                  id="ad-poa"
                  checked={formData?.adPoa || false}
                  onCheckedChange={(v) => { updateField('adPoa', v); updateField('adPoaTogglePosition', v); }}
                  disabled={readOnly}
                  className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-hover"
                />
              </div>
              {/* Fields revealed when on */}
              {formData?.adPoa && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-content-muted uppercase tracking-wider px-1 pt-1">POA Contact</p>
                  <FieldRow label="POA Name"><input type="text" value={formData?.adPoaName || ""} onChange={(e) => updateField('adPoaName', e.target.value)} placeholder="Power of Attorney name" className="form-input text-sm w-48 h-8 rounded-md px-3" /></FieldRow>
                  <FieldRow label="POA Phone"><input type="tel" value={formData?.adPoaPhone || ""} onChange={(e) => handlePhoneInput(e.target.value, updateField, 'adPoaPhone')} placeholder="(808) 000-0000" className="form-input text-sm w-48 h-8 rounded-md px-3" /></FieldRow>
                  <FieldRow label="POA Email"><input type="email" value={formData?.adPoaEmail || ""} onChange={(e) => updateField('adPoaEmail', e.target.value)} placeholder="name@example.com" className="form-input text-sm w-48 h-8 rounded-md px-3" /></FieldRow>
                  <FieldRow label="POA Address"><input type="text" value={formData?.adPoaAddress || ""} onChange={(e) => updateField('adPoaAddress', e.target.value)} placeholder="Full address" className="form-input text-sm w-48 h-8 rounded-md px-3" /></FieldRow>
                  <FieldRow label="AD"><input type="text" value={formData?.adInfo || ""} onChange={(e) => updateField('adInfo', e.target.value)} placeholder="AD details" className="form-input text-sm w-48 h-8 rounded-md px-3" /></FieldRow>
                  <FieldRow label="POA HC"><input type="text" value={formData?.poaHc || ""} onChange={(e) => updateField('poaHc', e.target.value)} placeholder="POA Healthcare" className="form-input text-sm w-48 h-8 rounded-md px-3" /></FieldRow>
                  <FieldRow label="POA Financial"><input type="text" value={formData?.poaFinancial || ""} onChange={(e) => updateField('poaFinancial', e.target.value)} placeholder="POA Financial" className="form-input text-sm w-48 h-8 rounded-md px-3" /></FieldRow>
                  <div className="px-1 space-y-1">
                    <label className="text-sm font-medium text-content-secondary">Comments</label>
                    <textarea value={formData?.poaComments || ""} onChange={(e) => updateField('poaComments', e.target.value)} rows={3} placeholder="Additional comments" className="form-input text-sm w-full rounded-md px-3 py-2 resize-none" />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-surface-input rounded-lg p-4 space-y-3">
              {/* Title+subtitle left, optional date + switch right */}
              <div className="flex items-start justify-between gap-2 pb-1">
                <div>
                  <h3 className="text-sm font-medium text-content-primary flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-accent" />
                    Email/Fax
                  </h3>
                  <p className="text-xs text-content-muted mt-0.5 pl-6">Prelim Records</p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {formData?.emailFaxRecords && (
                    <InlineDatePicker value={formData?.recordsDate} onChange={(v) => updateField('recordsDate', v)} disabled={readOnly} />
                  )}
                  <Switch
                    id="email-fax-records"
                    checked={formData?.emailFaxRecords || false}
                    onCheckedChange={(v) => { updateField('emailFaxRecords', v); updateField('emailFaxRecordsTogglePosition', v); }}
                    disabled={readOnly}
                    className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-hover"
                  />
                </div>
              </div>
              {/* Fields revealed when on */}
              {formData?.emailFaxRecords && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-content-muted uppercase tracking-wider px-1 pt-1">CMA Info</p>
                  <FieldRow label="CMA Name"><input type="text" value={formData?.cmaName || ""} onChange={(e) => updateField('cmaName', e.target.value)} placeholder="CMA name" className="form-input text-sm w-48 h-8 rounded-md px-3" /></FieldRow>
                  <FieldRow label="CMA Phone"><input type="tel" value={formData?.cmaPhone || ""} onChange={(e) => handlePhoneInput(e.target.value, updateField, 'cmaPhone')} placeholder="(808) 000-0000" className="form-input text-sm w-48 h-8 rounded-md px-3" /></FieldRow>
                  <div className="space-y-1">
                    <FieldRow label="CMA Email">
                      <input type="email" value={formData?.cmaEmail || ""} onChange={(e) => updateField('cmaEmail', e.target.value)} placeholder="name@example.com" className={cn("form-input text-sm w-48 h-8 rounded-md px-3", cmaEmailError && "border-red-500")} />
                    </FieldRow>
                    {cmaEmailError && <p className="text-xs text-red-500 pl-3">{cmaEmailError}</p>}
                  </div>
                </div>
              )}
            </div>

          </div>{/* end col 4 */}
        </>
      )}

    </div>
  );
};

export default ChecklistSection;