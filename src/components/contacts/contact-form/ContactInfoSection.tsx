import React, { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePadEnhanced, SignaturePadEnhancedRef } from "@/components/ui/signature-pad-enhanced";
import { Trash2, CalendarIcon, Download, Save, Info, UserCircle, Share2, FileSignature, UserPlus, ChevronLeft, ChevronRight, ChevronDown, Check, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { validateEmailField } from "@/lib/validateEmail";
import { formatDateForHawaii, parseHawaiiDate } from "@/lib/hawaiiDate";
import { handlePhoneInput } from "@/lib/formatPhoneInput";
import { SimpleSelect } from "../../admin/SimpleSelect";
import jsPDF from 'jspdf';

interface ContactInfoSectionProps {
  formData?: any;
  setFormData?: (data: any) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  onSave?: (autoSave?: boolean) => Promise<void>;
  onSaveWaiver?: (waiverData: { signatureData: string; signatureDate: string; waiverText: string; signatureName: string }) => Promise<void>;
  hideProgressAndStatus?: boolean;
}

const ContactInfoSection = ({ formData, setFormData, onDelete, readOnly = false, onSave, onSaveWaiver, hideProgressAndStatus = false }: ContactInfoSectionProps) => {
  const [emailError, setEmailError] = useState<string | null>(null);
  const [secondaryEmailError, setSecondaryEmailError] = useState<string | null>(null);
  const [showStatusConfirmation, setShowStatusConfirmation] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [localSignatureData, setLocalSignatureData] = useState<string>(formData?.signatureData || '');
  const [localSignatureDate, setLocalSignatureDate] = useState<string>(formData?.signatureDate || '');
  const [signatureIsDirty, setSignatureIsDirty] = useState<boolean>(false);
  const [signatureIsSaved, setSignatureIsSaved] = useState<boolean>(false);
  const signaturePadRef = useRef<SignaturePadEnhancedRef>(null);

  // Referral date calendar state
  const [referralCalendarOpen, setReferralCalendarOpen] = useState(false);
  const [referralCalendarMonth, setReferralCalendarMonth] = useState<Date>(
    formData?.referralDate ? (parseHawaiiDate(formData.referralDate) || new Date()) : new Date()
  );

  // Progress & Status custom dropdown state
  const [progressOpen, setProgressOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => (currentYear - i).toString());

  const updateField = (field: string, value: any) => {
    if (setFormData) {
      setFormData((prev: any) => ({ ...prev, [field]: value }));
    }

    // Validate email fields on change
    if (field === 'contactEmail') {
      setEmailError(validateEmailField(value));
    } else if (field === 'secondaryContactEmail') {
      setSecondaryEmailError(validateEmailField(value));
    }
  };

  // Click-outside handler for custom dropdowns
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (progressRef.current && !progressRef.current.contains(event.target as Node)) {
        setProgressOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync local signature data with form data when it changes
  React.useEffect(() => {
    if (formData?.signatureData !== localSignatureData) {
      setLocalSignatureData(formData?.signatureData || '');
      setSignatureIsDirty(false); // Reset dirty state when syncing from saved data
    }
    if (formData?.signatureDate !== localSignatureDate) {
      setLocalSignatureDate(formData?.signatureDate || '');
    }
  }, [formData?.signatureData, formData?.signatureDate]);

  // Initialize signature date to today if not set
  React.useEffect(() => {
    if (!localSignatureDate && setFormData) {
      const todayFormatted = formatDateForHawaii(new Date());
      setLocalSignatureDate(todayFormatted);
    }
  }, [localSignatureDate]);

  const handleStatusChange = (newStatus: string) => {
    setPendingStatus(newStatus);
    setShowStatusConfirmation(true);
  };

  const confirmStatusChange = async () => {
    if (pendingStatus) {
      console.log('Confirming status change to:', pendingStatus);
      updateField('status', pendingStatus);
      setShowStatusConfirmation(false);
      setPendingStatus(null);
    } else {
      setShowStatusConfirmation(false);
      setPendingStatus(null);
    }
  };

  const cancelStatusChange = () => {
    setShowStatusConfirmation(false);
    setPendingStatus(null);
  };

  const generateWaiverPDF = async (): Promise<jsPDF> => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const leftMargin = 20;
    const rightMargin = 20;
    const availableWidth = pageWidth - leftMargin - rightMargin;
    const lineHeight = 4.5;
    const bottomMargin = 25;
    let y = 15;

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - bottomMargin) {
        pdf.addPage();
        y = 20;
      }
    };

    // Helper: render a signature image (white strokes on transparent) onto white background
    // by drawing on black first, then inverting pixels → black strokes on white
    const renderImageOnWhite = (src: string, w: number, h: number): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d')!;
          // Draw on black so white strokes are visible
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          // Invert all pixels: white strokes → black, black bg → white
          const imageData = ctx.getImageData(0, 0, w, h);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];       // R
            data[i + 1] = 255 - data[i + 1]; // G
            data[i + 2] = 255 - data[i + 2]; // B
            // alpha unchanged
          }
          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve('');
        img.src = src;
      });
    };


    // Helper: render the actual logo SVG file to a canvas PNG
    const renderLogoToCanvas = (): Promise<string> => {
      return new Promise((resolve) => {
        // Fetch the actual SVG file from the public folder
        fetch('/images/Elite CareFinders Logo b-c.svg')
          .then(r => r.text())
          .then(svgText => {
            const blob = new Blob([svgText], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = 1254;
              canvas.height = 248;
              const ctx = canvas.getContext('2d')!;
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              URL.revokeObjectURL(url);
              resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
            img.src = url;
          })
          .catch(() => resolve(''));
      });
    };

    // --- Contact/Resident names (above logo) ---
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const contactName = formData?.contactName
      || (formData?.first_name || formData?.last_name
        ? `${formData?.first_name || ''} ${formData?.last_name || ''}`.trim()
        : '');
    const residentName = (formData?.residentFullName && formData.residentFullName !== contactName)
      ? formData.residentFullName
      : (formData?.resident_full_name && formData.resident_full_name !== contactName)
        ? formData.resident_full_name
        : '';
    pdf.text(`Resident Name: ${residentName}`, leftMargin, y);
    pdf.text(`Contact Name: ${contactName}`, pageWidth / 2, y);
    y += 7;

    // --- Logo (70% of original 80×16mm = 56×11.2mm) ---
    const logoData = await renderLogoToCanvas();
    if (logoData) {
      const logoW = 56;
      const logoH = 11.2;
      const logoX = (pageWidth - logoW) / 2;
      pdf.addImage(logoData, 'PNG', logoX, y, logoW, logoH);
      y += logoH + 4;
    } else {
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Elite Carefinders LLC', pageWidth / 2, y, { align: 'center' });
      y += 8;
    }

    // --- Document title ---
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ACKNOWLEDGMENT AND WAIVER', pageWidth / 2, y, { align: 'center' });
    y += 12;

    // --- Waiver body text ---
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    const waiverTextContent = formData?.waiverText ||
      `I, the undersigned, acknowledge and understand that I voluntarily choose or seek to receive referral and information services (the "Services") from ELITE CAREFINDERS L.L.C., a Hawaii limited liability company ("ECF") for the referral of facilities, housing and care options and information of the same.\n\nI acknowledge and understand that ECF's referrals and/or information provided relating to specific facilities, housing, or care options is an information service only, and are not recommendations of any such specific facilities, housing, or care options. I also acknowledge and understand that any information or advice I may receive from ECF is not medical advice, and I will treat all information I receive as such. ECF may request medical information or protected health information as a part of its Services and for the purpose of providing high quality information catered to me, and should I decide to cause such information to be disclosed to ECF, I do so knowingly and voluntarily. In addition, during the initial process, when I share information which may include protected health information with ECF over the phone or otherwise, I understand and consent to ECF providing such information to prospective facility, home, care provider/manager, or other placement in order to carry out ECF's services. For written documents or records containing protected health information, I understand that ECF may require my express written consent in accordance with the Health Insurance Portability and Accountability Act (HIPAA) to disclose documents to the facility, home, or other placement as instructed by me in writing.\n\nI further acknowledge and understand that ECF has no control over the operations of such facilities, housing, or care options, and that ECF makes no warranty, promises, or guarantees regarding any facilities, housing, or care options it refers to me. I fully understand that I am free, but entirely responsible, to determine whether such specific facilities, housing, or care options are appropriate for me. I understand that ECF may receive a commission from such facilities, housing, or care providers for its referral services. I also acknowledge, understand, and agree that ECF may communicate through facsimile or electronic means (e.g., fax, e-mail, texts, SMS, or MMS) with facilities and other third parties for purposes of carrying out the Services. I understand that communication through electronic means inherently carries the risk of third parties obtaining unauthorized access beyond ECF's control, despite ECF's efforts to maintain secure communications.\n\nIn consideration of the opportunity to obtain the Services, I hereby RELEASE, WAIVE, AND HOLD HARMLESS ECF and its employees, agents, officers, directors, independent contractors, attorneys, partners, members, principals, assigns, parent companies, and subsidiaries (collectively the "ECF Entities") from and against any and all actions, suits, claims for sums of money, contracts, controversies, agreements, costs, attorneys' fees, expenses, damages, interest, settlements, judgments and demands whatsoever in law or in equity, known or unknown, now existing or hereafter arising, whether contractual, extra-contractual, in tort or otherwise, which I had, have, or may have in the future against the ECF Entities, arising out of, related to, in connection with, directly or indirectly, the Services, ECF's communications with facilities and other entities regarding my selected placement, the acts, omissions, agreements, and discussions with any facilities, housing, or care options referred to me by ECF, and/or the events that occur after my placement with such facilities, housing, or care options.\n\nThis ACKNOWLEDGMENT AND WAIVER may be electronically signed and/or delivered by facsimile, email, or other electronic medium. Such signature shall be treated in all respects as having the same force and effect as original handwritten signatures.`;

    const paragraphs = waiverTextContent.split('\n\n').filter((p: string) => p.trim());

    paragraphs.forEach((paragraph: string, paragraphIndex: number) => {
      const trimmed = paragraph.trim();
      if (paragraphIndex > 0) y += 4;
      const indentAmount = 12;
      const lines = pdf.splitTextToSize(trimmed, availableWidth - indentAmount);
      lines.forEach((line: string, lineIndex: number) => {
        checkPageBreak(lineHeight);
        const x = leftMargin + (lineIndex === 0 ? indentAmount : 0);
        pdf.text(line.trim(), x, y);
        y += lineHeight;
      });
    });

    // --- Signature section — always on page 1, no page break ---
    y += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Full Legal Name: ${contactName}`, leftMargin, y);
    y += 10;

    const signatureDateFormatted = formData?.signatureDate
      ? (parseHawaiiDate(formData.signatureDate) ? format(parseHawaiiDate(formData.signatureDate)!, 'PPP') : 'Invalid date')
      : format(new Date(), 'PPP');
    const dateLabel = `Date: ${signatureDateFormatted}`;
    pdf.text(dateLabel, leftMargin, y);

    const sigLabelX = leftMargin + pdf.getTextWidth(dateLabel) + 20;
    pdf.text('Signature:', sigLabelX, y);

    // Signature image — properly await image load before drawing
    const sigImageData = localSignatureData || formData?.signatureData;
    if (sigImageData) {
      try {
        const whiteSigData = await renderImageOnWhite(sigImageData, 560, 160);
        if (whiteSigData) {
          const sigX = sigLabelX + pdf.getTextWidth('Signature:') + 4;
          pdf.addImage(whiteSigData, 'PNG', sigX, y - 16, 70, 20);
        }
      } catch (error) {
        console.error('Error adding signature to PDF:', error);
      }
    }

    return pdf;
  };

  const handleDownloadPDF = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const pdf = await generateWaiverPDF();
      // Open in new tab for debugging
      // Build filename: Elite-Carefinders-Waiver-[Contact-Name]-[date-signed].pdf
      const resolvedName = formData?.contactName
        || (formData?.first_name || formData?.last_name
          ? `${formData?.first_name || ''} ${formData?.last_name || ''}`.trim()
          : 'Unknown');
      const namePart = resolvedName.replace(/\s+/g, '-');
      const dateSigned = localSignatureDate || formData?.signatureDate || '';
      const datePart = dateSigned
        ? (parseHawaiiDate(dateSigned) ? format(parseHawaiiDate(dateSigned)!, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
        : format(new Date(), 'yyyy-MM-dd');
      const fileName = `Elite-Carefinders-Waiver-${namePart}-${datePart}.pdf`;

      console.log('PDF filename:', fileName);
      // jsPDF v4: output() may also return a Promise — await it
      const pdfBytes = await pdf.output('arraybuffer');
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        document.body.removeChild(link);
      }, 200);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert(`PDF error: ${err}`);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
      {/* Hidden inputs for progress and status when hideProgressAndStatus is true */}
      {hideProgressAndStatus && (
        <>
          <input type="hidden" name="leadClassification" value={formData?.leadClassification || "new"} />
          <input type="hidden" name="status" value={formData?.status || "Active"} />
        </>
      )}

      {/* Column 1: Progress/Status + Primary Contact + Secondary Contact */}
      <div className="space-y-3">
        {/* Progress & Status - only show if not hidden */}
        {!hideProgressAndStatus && (
          <div className="bg-surface-input rounded-lg p-4 space-y-3">
            {/* Progress */}
            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
              <label className="text-sm font-medium text-content-secondary whitespace-nowrap">Progress</label>
              <div className="relative w-40" ref={progressRef}>
                <button
                  type="button"
                  onClick={() => !readOnly && setProgressOpen(!progressOpen)}
                  className={`form-input w-full flex items-center justify-between px-2 py-1 text-sm h-full min-h-[28px]`}
                >
                  <span className="flex items-center gap-2 truncate mr-2">
                    {formData?.leadClassification === 'new' && <span className="h-2 w-2 rounded-full bg-[hsl(var(--lead-new))] flex-shrink-0"></span>}
                    {formData?.leadClassification === 'prospects' && <span className="h-2 w-2 rounded-full bg-[hsl(var(--lead-prospects))] flex-shrink-0"></span>}
                    {formData?.leadClassification === 'connected' && <span className="h-2 w-2 rounded-full bg-[hsl(var(--lead-connected))] flex-shrink-0"></span>}
                    {formData?.leadClassification === 'won' && <span className="h-2 w-2 rounded-full bg-[hsl(var(--lead-won))] flex-shrink-0"></span>}
                    {formData?.leadClassification === 'closed' && <span className="h-2 w-2 rounded-full bg-[hsl(var(--lead-closed))] flex-shrink-0"></span>}
                    <span className={formData?.leadClassification ? 'text-content-primary' : 'text-content-muted'}>
                      {formData?.leadClassification ? formData.leadClassification.charAt(0).toUpperCase() + formData.leadClassification.slice(1) : 'Select...'}
                    </span>
                  </span>
                  <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 text-content-muted ${progressOpen ? 'rotate-180' : ''}`} />
                </button>
                {progressOpen && (
                  <div className="dropdown-menu absolute z-50 right-0 w-full min-w-[150px] mt-1 max-h-60 flex flex-col">
                    <div className="overflow-y-auto flex-1 p-1">
                      {[
                        { value: 'new', label: 'New', color: 'bg-[hsl(var(--lead-new))]' },
                        { value: 'prospects', label: 'Prospects', color: 'bg-[hsl(var(--lead-prospects))]' },
                        { value: 'connected', label: 'Connected', color: 'bg-[hsl(var(--lead-connected))]' },
                        { value: 'won', label: 'Won', color: 'bg-[hsl(var(--lead-won))]' },
                        { value: 'closed', label: 'Closed', color: 'bg-[hsl(var(--lead-closed))]' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { updateField('leadClassification', opt.value); setProgressOpen(false); }}
                          className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${formData?.leadClassification === opt.value ? 'bg-surface-hover text-content-primary' : 'text-content-secondary hover:bg-surface-hover hover:text-content-primary'}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${opt.color} flex-shrink-0`}></span>
                          <span>{opt.label}</span>
                          {formData?.leadClassification === opt.value && <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
              <label className="text-sm font-medium text-content-secondary whitespace-nowrap">Status</label>
              <div className="relative w-40" ref={statusRef}>
                <button
                  type="button"
                  onClick={() => !readOnly && setStatusOpen(!statusOpen)}
                  className={`form-input w-full flex items-center justify-between px-2 py-1 text-sm h-full min-h-[28px]`}
                >
                  <span className="flex items-center gap-2 truncate mr-2">
                    {formData?.status === 'Active' && <span className="h-2 w-2 rounded-full bg-green-400 flex-shrink-0"></span>}
                    {formData?.status === 'Paused' && <span className="h-2 w-2 rounded-full bg-yellow-400 flex-shrink-0"></span>}
                    {formData?.status === 'Disabled' && <span className="h-2 w-2 rounded-full bg-red-400 flex-shrink-0"></span>}
                    <span className={formData?.status ? 'text-content-primary' : 'text-content-muted'}>
                      {formData?.status || 'Select...'}
                    </span>
                  </span>
                  <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 text-content-muted ${statusOpen ? 'rotate-180' : ''}`} />
                </button>
                {statusOpen && (
                  <div className="dropdown-menu absolute z-50 right-0 w-full min-w-[150px] mt-1 max-h-60 flex flex-col">
                    <div className="overflow-y-auto flex-1 p-1">
                      {[
                        { value: 'Active', label: 'Active', color: 'bg-green-400' },
                        { value: 'Paused', label: 'Paused', color: 'bg-yellow-400' },
                        { value: 'Disabled', label: 'Disabled', color: 'bg-red-400' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { handleStatusChange(opt.value); setStatusOpen(false); }}
                          className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${formData?.status === opt.value ? 'bg-surface-hover text-content-primary' : 'text-content-secondary hover:bg-surface-hover hover:text-content-primary'}`}
                        >
                          <span className={`h-2 w-2 rounded-full ${opt.color} flex-shrink-0`}></span>
                          <span>{opt.label}</span>
                          {formData?.status === opt.value && <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {
              onDelete && (
                <div className="flex justify-end pt-1">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-surface-secondary border-ui-border text-content-primary">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                        <AlertDialogDescription className="text-content-muted">
                          Are you sure you want to delete this contact? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-ui-border text-content-primary hover:bg-surface-hover">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete} className="bg-red-500 text-white hover:bg-red-600">
                          Delete Contact
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )
            }
          </div >
        )}

        {/* Primary Contact */}
        <div className="bg-surface-input rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pb-1">
            <UserCircle className="h-4 w-4 text-accent" />
            Primary Contact
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
              <label className="text-sm font-medium text-content-secondary whitespace-nowrap">Full Name</label>
              <input
                id="contact-name"
                type="text"
                placeholder="Enter full name"
                value={formData?.contactName || ""}
                onChange={(e) => updateField('contactName', e.target.value)}
                disabled={readOnly}
                className={`form-input text-sm text-left w-48 h-8 rounded-md px-3 ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>
            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
              <label className="text-sm font-medium text-content-secondary whitespace-nowrap">Phone</label>
              <input
                id="contact-phone"
                type="tel"
                placeholder="(123) 456-7890"
                value={formData?.contactPhone || ""}
                onChange={(e) => handlePhoneInput(e.target.value, updateField, 'contactPhone')}
                disabled={readOnly}
                className={`form-input text-sm text-left w-48 h-8 rounded-md px-3 ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>
            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
              <label className="text-sm font-medium text-content-secondary whitespace-nowrap">Email</label>
              <div className="flex flex-col items-end">
                <input
                  id="contact-email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData?.contactEmail || ""}
                  onChange={(e) => updateField('contactEmail', e.target.value)}
                  className={`form-input text-sm text-left w-48 h-8 rounded-md px-3 ${emailError ? 'border-red-500/50' : ''} ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={readOnly}
                />
                {emailError && (
                  <p className="text-xs text-red-500 mt-1">{emailError}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Contact */}
        <div className="bg-surface-input rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-content-primary flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-accent" />
              Secondary Contact
            </h3>
            <div className="flex items-center gap-2">
              <Label htmlFor="enable-secondary-contact" className="text-xs text-content-muted">Enable</Label>
              <Switch
                id="enable-secondary-contact"
                checked={formData?.enableSecondaryContact || false}
                onCheckedChange={(checked) => updateField('enableSecondaryContact', checked)}
                disabled={readOnly}
                className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-hover"
              />
            </div>
          </div>

          {formData?.enableSecondaryContact && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
                <label className="text-sm font-medium text-content-secondary whitespace-nowrap">Full Name</label>
                <input
                  id="secondary-contact-name"
                  type="text"
                  placeholder="Enter full name"
                  value={formData?.secondaryContactName || ""}
                  onChange={(e) => updateField('secondaryContactName', e.target.value)}
                  disabled={readOnly}
                  className={`form-input text-sm text-left w-48 h-8 rounded-md px-3 ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                />
              </div>
              <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
                <label className="text-sm font-medium text-content-secondary whitespace-nowrap">Phone</label>
                <input
                  id="secondary-contact-phone"
                  type="tel"
                  placeholder="(123) 456-7890"
                  value={formData?.secondaryContactPhone || ""}
                  onChange={(e) => handlePhoneInput(e.target.value, updateField, 'secondaryContactPhone')}
                  disabled={readOnly}
                  className={`form-input text-sm text-left w-48 h-8 rounded-md px-3 ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                />
              </div>
              <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
                <label className="text-sm font-medium text-content-secondary whitespace-nowrap">Email</label>
                <div className="flex flex-col items-end">
                  <input
                    id="secondary-contact-email"
                    type="email"
                    placeholder="name@example.com"
                    value={formData?.secondaryContactEmail || ""}
                    onChange={(e) => updateField('secondaryContactEmail', e.target.value)}
                    className={`form-input text-sm text-left w-48 h-8 rounded-md px-3 ${secondaryEmailError ? 'border-red-500/50' : ''} ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                    disabled={readOnly}
                  />
                  {secondaryEmailError && (
                    <p className="text-xs text-red-500 mt-1">{secondaryEmailError}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div >

      {/* Column 2: Looking For + Referral Details */}
      < div className="space-y-3" >
        <div className="bg-surface-input rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
            <span className="font-medium text-sm text-content-secondary">Looking For</span>
            <SimpleSelect
              value={formData?.lookingFor || ""}
              onChange={(val) => updateField('lookingFor', val)}
              options={["Self", "Self + Partner", "Mother", "Father", "Parents", "Spouse", "Other"]}
              placeholder="Select..."
              className="w-40 text-sm text-left"
            />
          </div>
        </div>

        {/* Referral Details */}
        <div className="bg-surface-input rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pb-1">
            <Share2 className="h-4 w-4 text-accent" />
            Referral Details
          </h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
              <label className="text-sm font-medium text-content-secondary whitespace-nowrap">Referral Date</label>
              <Popover open={referralCalendarOpen} onOpenChange={setReferralCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={readOnly}
                    className={cn(
                      "form-input flex items-center justify-start text-left font-normal px-3 py-1.5 text-sm w-48 h-8",
                      !formData?.referralDate && "text-content-muted",
                      readOnly && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData?.referralDate
                      ? (parseHawaiiDate(formData.referralDate)
                        ? format(parseHawaiiDate(formData.referralDate)!, "MMM d, yyyy")
                        : "Invalid date")
                      : "Pick a date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-surface-secondary border-ui-border text-content-primary [&_.rdp-caption_dropdowns]:!hidden [&_.rdp-caption_label]:!hidden [&_.rdp-nav]:!hidden [&_.rdp-dropdown]:!hidden [&_.rdp-head_cell]:text-content-muted"
                  align="start"
                >
                  {/* Custom header: close button + month/year nav */}
                  <div className="p-3 pb-1 space-y-2">
                    {/* Close button */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setReferralCalendarOpen(false)}
                        className="p-1 rounded-md hover:bg-surface-hover text-content-muted hover:text-content-primary transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Month/Year navigation row */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const prev = new Date(referralCalendarMonth);
                          prev.setMonth(prev.getMonth() - 1);
                          setReferralCalendarMonth(prev);
                        }}
                        className="h-7 w-7 rounded-md inline-flex items-center justify-center transition-colors hover:bg-surface-hover text-content-primary"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="flex gap-1.5 flex-1 justify-center">
                        <SimpleSelect
                          value={monthNames[referralCalendarMonth.getMonth()]}
                          onChange={(val: string) => {
                            const idx = monthNames.indexOf(val);
                            if (idx >= 0) {
                              const updated = new Date(referralCalendarMonth);
                              updated.setMonth(idx);
                              setReferralCalendarMonth(updated);
                            }
                          }}
                          options={monthNames}
                          placeholder="Month"
                          className="w-[110px]"
                          textSize="text-xs"
                        />
                        <SimpleSelect
                          value={referralCalendarMonth.getFullYear().toString()}
                          onChange={(val: string) => {
                            const updated = new Date(referralCalendarMonth);
                            updated.setFullYear(parseInt(val));
                            setReferralCalendarMonth(updated);
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
                          const next = new Date(referralCalendarMonth);
                          next.setMonth(next.getMonth() + 1);
                          setReferralCalendarMonth(next);
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
                    month={referralCalendarMonth}
                    onMonthChange={setReferralCalendarMonth}
                    selected={formData?.referralDate ? (parseHawaiiDate(formData.referralDate) || undefined) : undefined}
                    onSelect={(date) => {
                      updateField('referralDate', date ? formatDateForHawaii(date) : null);
                      if (date) setReferralCalendarOpen(false);
                    }}
                    className="p-3 pt-0 pointer-events-auto"
                    classNames={{
                      caption: "!hidden",
                      caption_label: "!hidden",
                      caption_dropdowns: "!hidden",
                      dropdown_month: "!hidden",
                      dropdown_year: "!hidden",
                      nav: "!hidden",
                      day_selected: "bg-accent text-white hover:bg-accent focus:bg-accent focus:text-white",
                      day_today: "bg-surface-hover text-content-primary",
                      day_outside: "text-content-muted opacity-50",
                      day_disabled: "text-content-muted opacity-30",
                      day: cn("h-9 w-9 p-0 font-normal text-content-secondary aria-selected:opacity-100 hover:bg-surface-hover hover:text-content-primary rounded-md transition-colors"),
                      head_cell: "text-content-muted rounded-md w-9 font-normal text-[0.8rem] text-center",
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
              <label className="text-sm font-medium text-content-secondary whitespace-nowrap">Referral Name</label>
              <input
                id="referral-name"
                type="text"
                placeholder="Enter name"
                value={formData?.referralName || ""}
                onChange={(e) => updateField('referralName', e.target.value)}
                disabled={readOnly}
                className={`form-input text-sm text-left w-48 h-8 rounded-md px-3 ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>

            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
              <label className="text-sm font-medium text-content-secondary whitespace-nowrap">Referral Phone</label>
              <input
                id="referral-phone"
                type="tel"
                placeholder="(123) 456-7890"
                value={formData?.referralPhone || ""}
                onChange={(e) => handlePhoneInput(e.target.value, updateField, 'referralPhone')}
                disabled={readOnly}
                className={`form-input text-sm text-left w-48 h-8 rounded-md px-3 ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>
          </div>
        </div>
      </div >

      {/* Columns 3-4: Waiver Section */}
      < div className="lg:col-span-2 bg-surface-input rounded-lg p-4 space-y-4" >
        <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pb-1">
          <FileSignature className="h-4 w-4 text-accent" />
          Acknowledgment and Waiver
        </h3>
        <div className="space-y-4">
          <Textarea
            id="waiver-text"
            placeholder="Waiver text..."
            value={formData?.waiverText || `I, the undersigned, acknowledge and understand that I voluntarily choose or seek to receive referral and information services (the "Services") from ELITE CAREFINDERS L.L.C., a Hawaii limited liability company ("ECF") for the referral of facilities, housing and care options and information of the same.

I acknowledge and understand that ECF's referrals and/or information provided relating to specific facilities, housing, or care options is an information service only, and are not recommendations of any such specific facilities, housing, or care options. I also acknowledge and understand that any information or advice I may receive from ECF is not medical advice, and I will treat all information I receive as such. ECF may request medical information or protected health information as a part of its Services and for the purpose of providing high quality information catered to me, and should I decide to cause such information to be disclosed to ECF, I do so knowingly and voluntarily. In addition, during the initial process, when I share information which may include protected health information with ECF over the phone or otherwise, I understand and consent to ECF providing such information to prospective facility, home, care provider/manager, or other placement in order to carry out ECF's services. For written documents or records containing protected health information, I understand that ECF may require my express written consent in accordance with the Health Insurance Portability and Accountability Act (HIPAA) to disclose documents to the facility, home, or other placement as instructed by me in writing.

I further acknowledge and understand that ECF has no control over the operations of such facilities, housing, or care options, and that ECF makes no warranty, promises, or guarantees regarding any facilities, housing, or care options it refers to me. I fully understand that I am free, but entirely responsible, to determine whether such specific facilities, housing, or care options are appropriate for me. I understand that ECF may receive a commission from such facilities, housing, or care providers for its referral services. I also acknowledge, understand, and agree that ECF may communicate through facsimile or electronic means (e.g., fax, e-mail, texts, SMS, or MMS) with facilities and other third parties for purposes of carrying out the Services. I understand that communication through electronic means inherently carries the risk of third parties obtaining unauthorized access beyond ECF's control, despite ECF's efforts to maintain secure communications.

In consideration of the opportunity to obtain the Services, I hereby RELEASE, WAIVE, AND HOLD HARMLESS ECF and its employees, agents, officers, directors, independent contractors, attorneys, partners, members, principals, assigns, parent companies, and subsidiaries (collectively the "ECF Entities") from and against any and all actions, suits, claims for sums of money, contracts, controversies, agreements, costs, attorneys' fees, expenses, damages, interest, settlements, judgments and demands whatsoever in law or in equity, known or unknown, now existing or hereafter arising, whether contractual, extra-contractual, in tort or otherwise, which I had, have, or may have in the future against the ECF Entities, arising out of, related to, in connection with, directly or indirectly, the Services, ECF's communications with facilities and other entities regarding my selected placement, the acts, omissions, agreements, and discussions with any facilities, housing, or care options referred to me by ECF, and/or the events that occur after my placement with such facilities, housing, or care options.

This ACKNOWLEDGMENT AND WAIVER may be electronically signed and/or delivered by facsimile, email, or other electronic medium. Such signature shall be treated in all respects as having the same force and effect as original handwritten signatures.`}
            onChange={(e) => updateField('waiverText', e.target.value)}
            className="h-[160px] text-xs leading-relaxed bg-surface-hover border-0 text-content-secondary resize-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg custom-scrollbar whitespace-pre-wrap p-3"
            readOnly
          />

          <div className="flex items-start space-x-3 px-1">
            <Checkbox
              id="waiver-agreed"
              checked={formData?.waiverAgreed || false}
              onCheckedChange={(checked) => updateField('waiverAgreed', checked)}
              disabled={readOnly}
              className="mt-0.5 border-ui-border data-[state=checked]:bg-accent data-[state=checked]:border-accent"
            />
            <Label
              htmlFor="waiver-agreed"
              className="text-xs text-content-secondary leading-tight cursor-pointer font-normal opacity-90"
            >
              I fully understand the above, have had the opportunity to ask questions before signing this document, and understand that I can ask additional questions at any time.
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
            <label className="text-sm font-medium text-content-secondary whitespace-nowrap">Full Legal Name</label>
            <input
              id="signature-name"
              type="text"
              placeholder="Full legal name"
              value={formData?.contactName || ""}
              onChange={(e) => updateField('signatureName', e.target.value)}
              readOnly
              className="form-input border-0 text-sm text-right cursor-not-allowed opacity-60 w-48 h-8 rounded-md px-3 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
            <label className="text-sm font-medium text-content-secondary whitespace-nowrap">Date</label>
            <input
              type="text"
              value={localSignatureDate ? (parseHawaiiDate(localSignatureDate) ? format(parseHawaiiDate(localSignatureDate)!, "PPP") : "Invalid date") : format(new Date(), "PPP")}
              readOnly
              className="form-input border-0 text-sm text-right cursor-not-allowed opacity-60 w-48 h-8 rounded-md px-3 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-content-secondary">Digital Signature</label>
          <div className="mt-2">
            <SignaturePadEnhanced
              ref={signaturePadRef}
              value={localSignatureData}
              onChange={(signature) => {
                setLocalSignatureData(signature);
                setSignatureIsDirty(true);
                setSignatureIsSaved(false);
                // Push into formData so the main save picks it up
                updateField('signatureData', signature);
                if (signature && signature.trim() !== '') {
                  const today = formatDateForHawaii(new Date());
                  setLocalSignatureDate(today);
                  updateField('signatureDate', today);
                }
              }}
              disabled={readOnly}
              height={160}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
          <Button
            type="button"
            onClick={handleDownloadPDF}
            size="sm"
            disabled={!(localSignatureData || formData?.signatureData) || !formData?.waiverAgreed}
            className={`gap-2 bg-accent text-white border-0 hover:bg-accent-light transition-colors ${!(localSignatureData || formData?.signatureData) || !formData?.waiverAgreed ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>

          {!readOnly && onSaveWaiver && signatureIsDirty && !signatureIsSaved && (
            <Button
              onClick={async () => {
                try {
                  await onSaveWaiver({
                    signatureData: localSignatureData,
                    signatureDate: localSignatureDate,
                    waiverText: formData?.waiverText || '',
                    signatureName: formData?.contactName || ''
                  });
                  setSignatureIsDirty(false);
                  setSignatureIsSaved(true);
                } catch (error) {
                  console.error('Error saving waiver:', error);
                }
              }}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
              size="sm"
            >
              <Save className="h-4 w-4" />
              Save Waiver
            </Button>
          )}
        </div>
      </div >

      {/* Status Change Confirmation Dialog */}
      < AlertDialog open={showStatusConfirmation} onOpenChange={setShowStatusConfirmation} >
        <AlertDialogContent className="bg-surface-secondary border-ui-border text-content-primary">
          <AlertDialogHeader>
            <AlertDialogTitle>Change Contact Status</AlertDialogTitle>
            <AlertDialogDescription className="text-content-muted">
              Are you sure you want to change this contact's status to "{pendingStatus}"?
              {pendingStatus === "Active" && " This will reactivate the contact and make all form fields editable."}
              {pendingStatus === "Paused" && " This will make all form fields read-only until the status is changed back to Active."}
              {pendingStatus === "Disabled" && " This will disable all form fields and the contact will be marked as disabled."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelStatusChange} className="bg-transparent border-ui-border text-content-primary hover:bg-surface-hover">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange} className="bg-accent text-white hover:bg-accent-light">
              Yes, Change to {pendingStatus}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog >
    </div >
  );
};

export default ContactInfoSection;



