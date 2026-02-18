import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { validateEmailField } from "@/lib/validateEmail";
import { handlePhoneInput } from "@/lib/formatPhoneInput";
import { formatDateForHawaii, parseHawaiiDate } from "@/lib/hawaiiDate";

interface ChecklistSectionProps {
  formData?: any;
  setFormData?: (data: any) => void;
  readOnly?: boolean;
  invoiceEditMode?: boolean;
}

const ChecklistSection = ({ formData, setFormData, readOnly = false, invoiceEditMode = false }: ChecklistSectionProps) => {
  const [cmaEmailError, setCmaEmailError] = useState<string | null>(null);
  const [careProviderEmailError, setCareProviderEmailError] = useState<string | null>(null);
  
  const updateField = (field: string, value: any) => {
    if (setFormData) {
      setFormData((prev: any) => ({ ...prev, [field]: value }));
    }
    
    // Validate email fields on change
    if (field === 'cmaEmail') {
      setCmaEmailError(validateEmailField(value));
    } else if (field === 'careProviderEmail') {
      setCareProviderEmailError(validateEmailField(value));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Referral Information Section - Always visible */}
      <Card className="bg-muted border-0">
        <CardContent className="space-y-2 pt-6 pb-6">
          {readOnly && !invoiceEditMode ? (
            // Display mode - Location in same row with 1/4 and 3/4 layout, then other fields
            <>
              {/* Location fields in same row */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="col-span-1 space-y-2">
                  <Label>Location</Label>
                  <Input 
                    value={formData?.referralLocation || ""} 
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Location Address</Label>
                  <Input 
                    value={formData?.referralLocationAddress || ""} 
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>
              
              {/* Financial fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Rate</Label>
                  <Input 
                    value={formData?.referralMonthlyRate ? `$${parseFloat(formData.referralMonthlyRate).toFixed(2)}` : ""} 
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Referral Fee</Label>
                  <Input 
                    value={(() => {
                      const monthlyRate = parseFloat(formData?.referralMonthlyRate) || 0;
                      const feePercentage = parseFloat(formData?.referralFeePercentage) || 0;
                      const actualFee = (monthlyRate * feePercentage) / 100;
                      return actualFee > 0 ? `$${actualFee.toFixed(2)}` : "";
                    })()} 
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Referral Total <span className="text-xs text-muted-foreground">(includes tax)</span></Label>
                  <Input 
                    value={(() => {
                      const monthlyRate = parseFloat(formData?.referralMonthlyRate) || 0;
                      const feePercentage = parseFloat(formData?.referralFeePercentage) || 0;
                      const actualFee = (monthlyRate * feePercentage) / 100;
                      const taxPercentage = parseFloat(formData?.referralTax) || 4.712;
                      const taxAmount = (actualFee * taxPercentage) / 100;
                      const total = actualFee + taxAmount;
                      return total > 0 ? `$${total.toFixed(2)}` : "";
                    })()} 
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>
            </>
          ) : (
            // Edit mode - show all fields
            <>
              {/* Care Provider Info Section */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-4">CARE PROVIDER INFO</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="care-provider-name">Care Provider Name</Label>
                    <Input 
                      id="care-provider-name" 
                      placeholder="Care provider name"
                      value={formData?.careProviderName || ""} 
                      onChange={(e) => updateField('careProviderName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="care-provider-phone">Care Provider Phone</Label>
                    <Input 
                      id="care-provider-phone" 
                      type="tel"
                      placeholder="(123) 456-7890"
                      value={formData?.careProviderPhone || ""} 
                      onChange={(e) => handlePhoneInput(e.target.value, updateField, 'careProviderPhone')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="care-provider-email">Care Provider Email</Label>
                    <Input 
                      id="care-provider-email" 
                      type="email"
                      placeholder="name@example.com"
                      value={formData?.careProviderEmail || ""} 
                      onChange={(e) => updateField('careProviderEmail', e.target.value)}
                      className={careProviderEmailError ? 'border-red-500' : ''}
                    />
                    {careProviderEmailError && (
                      <p className="text-sm text-red-600">{careProviderEmailError}</p>
                    )}
                  </div>
                </div>

                {/* Location fields in same row */}
                <div className="grid grid-cols-3 gap-4 mb-4 pb-4" style={{ borderBottom: '2px solid white' }}>
                  <div className="col-span-1 space-y-2">
                    <Label>Location</Label>
                    <Input 
                      value={formData?.referralLocation || ""} 
                      onChange={(e) => updateField('referralLocation', e.target.value)}
                      placeholder="Enter location"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Location Address</Label>
                    <Input 
                      value={formData?.referralLocationAddress || ""} 
                      onChange={(e) => updateField('referralLocationAddress', e.target.value)}
                      placeholder="Enter location address"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>Monthly Rate</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      type="number"
                      step="0.01"
                      value={formData?.referralMonthlyRate || ""} 
                      onChange={(e) => updateField('referralMonthlyRate', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Referral %</Label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">%</span>
                    <Input 
                      type="number"
                      step="0.01"
                      max="100"
                      min="0"
                      value={formData?.referralFeePercentage || ""} 
                      onChange={(e) => updateField('referralFeePercentage', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="pr-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Referral Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      value={(() => {
                        const monthlyRate = parseFloat(formData?.referralMonthlyRate) || 0;
                        const feePercentage = parseFloat(formData?.referralFeePercentage) || 0;
                        const actualFee = (monthlyRate * feePercentage) / 100;
                        return actualFee.toFixed(2);
                      })()} 
                      readOnly
                      className="bg-muted pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tax %</Label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">%</span>
                    <Input 
                      type="number"
                      step="0.0001"
                      value={formData?.referralTax || "4.712"} 
                      onChange={(e) => updateField('referralTax', parseFloat(e.target.value) || 4.712)}
                      placeholder="4.7120"
                      className="pr-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Referral Total</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      value={(() => {
                        const monthlyRate = parseFloat(formData?.referralMonthlyRate) || 0;
                        const feePercentage = parseFloat(formData?.referralFeePercentage) || 0;
                        const actualFee = (monthlyRate * feePercentage) / 100;
                        const taxPercentage = parseFloat(formData?.referralTax) || 4.712;
                        const taxAmount = (actualFee * taxPercentage) / 100;
                        const total = actualFee + taxAmount;
                        return total.toFixed(2);
                      })()} 
                      readOnly
                      className="bg-muted pl-7"
                    />
                  </div>
                </div>
              </div>
              
              {/* Invoice Status Row - Two Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* Invoice Sent Column */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                   <Switch 
                     id="invoice-sent" 
                     checked={formData?.invoiceSent || false}
                     onCheckedChange={(checked) => {
                       updateField('invoiceSent', checked);
                       updateField('invoiceSentTogglePosition', checked);
                     }}
                   />
                    <Label htmlFor="invoice-sent">Invoice Sent</Label>
                  </div>
                  {formData?.invoiceSent && (
                    <div className="space-y-2">
                      <Label>Date Sent</Label>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "flex-1 justify-start text-left font-normal",
                                !formData?.invoiceSentDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData?.invoiceSentDate ? (parseHawaiiDate(formData.invoiceSentDate) ? format(parseHawaiiDate(formData.invoiceSentDate)!, "PPP") : <span>Invalid date</span>) : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={formData?.invoiceSentDate ? (parseHawaiiDate(formData.invoiceSentDate) ?? undefined) : undefined}
                               onSelect={(date) => {
                                 if (date) {
                                   // Debug logging to understand the issue
                                   console.log('Calendar selected date:', date);
                                   console.log('Date in local timezone:', date.toString());
                                   console.log('Date UTC:', date.toUTCString());
                                   
                                   // Format as YYYY-MM-DD preserving the selected date
                                   const formattedDate = formatDateForHawaii(date);
                                   console.log('Formatted date for Hawaii:', formattedDate);
                                   
                                   updateField('invoiceSentDate', formattedDate);
                                 } else {
                                   updateField('invoiceSentDate', null);
                                 }
                               }}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        {formData?.invoiceSentDate && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateField('invoiceSentDate', null)}
                            className="shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Invoice Paid Column */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                   <Switch 
                     id="invoice-received" 
                     checked={formData?.invoiceReceived || false}
                     onCheckedChange={(checked) => {
                       updateField('invoiceReceived', checked);
                       updateField('invoiceReceivedTogglePosition', checked);
                     }}
                     disabled={!formData?.invoiceSentDate}
                   />
                    <Label htmlFor="invoice-received" className={!formData?.invoiceSentDate ? "text-muted-foreground" : ""}>
                      Invoice Paid {!formData?.invoiceSentDate && "(requires sent date)"}
                    </Label>
                  </div>
                  {formData?.invoiceReceived && formData?.invoiceSentDate && (
                    <div className="space-y-2">
                      <Label>Date Paid</Label>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "flex-1 justify-start text-left font-normal",
                                !formData?.invoiceReceivedDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData?.invoiceReceivedDate ? (parseHawaiiDate(formData.invoiceReceivedDate) ? format(parseHawaiiDate(formData.invoiceReceivedDate)!, "PPP") : <span>Invalid date</span>) : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={formData?.invoiceReceivedDate ? (parseHawaiiDate(formData.invoiceReceivedDate) ?? undefined) : undefined}
                              onSelect={(date) => {
                                 if (date) {
                                   // Format as YYYY-MM-DD in Hawaii timezone
                                   const formattedDate = formatDateForHawaii(date);
                                   updateField('invoiceReceivedDate', formattedDate);
                                 } else {
                                   updateField('invoiceReceivedDate', null);
                                 }
                               }}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        {formData?.invoiceReceivedDate && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateField('invoiceReceivedDate', null)}
                            className="shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Hide all other sections when in invoice edit mode */}
      {!invoiceEditMode && (
        <>
          {/* Move-in Date Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6" style={{ borderBottom: '2px solid #dddddd' }}>
            <div className="space-y-2">
              <Label htmlFor="projected-move-date-readonly">Projected Move-in Date</Label>
              <Input 
                id="projected-move-date-readonly" 
                value={formData?.timeToMove || ""} 
                readOnly
                className="bg-muted"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Actual Move-in Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData?.actualMoveDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData?.actualMoveDate ? (parseHawaiiDate(formData.actualMoveDate) ? format(parseHawaiiDate(formData.actualMoveDate)!, "PPP") : <span>Invalid date</span>) : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData?.actualMoveDate ? (parseHawaiiDate(formData.actualMoveDate) ?? undefined) : undefined}
                    onSelect={(date) => updateField('actualMoveDate', date ? formatDateForHawaii(date) : null)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="space-y-6">

            {/* Primary Care Physician Section */}
            <div className="space-y-2 pb-6" style={{ borderBottom: '2px solid #dddddd' }}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">PRIMARY CARE PHYSICIAN</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input 
                    value={formData?.pcp_name || ""} 
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    value={formData?.pcp_email || ""} 
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone/Fax</Label>
                  <Input 
                    value={formData?.pcp_phone || ""} 
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>
            </div>

            {/* COVID Section - Three Columns */}
            <div className="space-y-3 pb-6" style={{ borderBottom: '2px solid #dddddd' }}>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="covid-test" 
                  checked={formData?.covidTest || false}
                  onCheckedChange={(checked) => {
                    updateField('covidTest', checked);
                    updateField('covidTestTogglePosition', checked);
                  }}
                  disabled={readOnly}
                />
                <Label htmlFor="covid-test">COVID Test 72 Hours Prior to Admission</Label>
              </div>
              {formData?.covidTest && (
                <div className="ml-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Test Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData?.covidTestDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData?.covidTestDate ? (parseHawaiiDate(formData.covidTestDate) ? format(parseHawaiiDate(formData.covidTestDate)!, "PPP") : <span>Invalid date</span>) : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData?.covidTestDate ? (parseHawaiiDate(formData.covidTestDate) ?? undefined) : undefined}
                          onSelect={(date) => updateField('covidTestDate', date ? formatDateForHawaii(date) : null)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="covid-test-result">Test Result</Label>
                    <Select value={formData?.covidTestResult || ""} onValueChange={(value) => updateField('covidTestResult', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select result" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Positive">Positive</SelectItem>
                        <SelectItem value="Negative">Negative</SelectItem>
                        <SelectItem value="Indeterminate">Indeterminate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="covid-vaccinations">Vaccinations (if any)</Label>
                    <Select value={formData?.covidVaccinationDetails || ""} onValueChange={(value) => updateField('covidVaccinationDetails', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vaccination" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Moderna">Moderna</SelectItem>
                        <SelectItem value="Pfizer-BioNTech">Pfizer-BioNTech</SelectItem>
                        <SelectItem value="Novavax">Novavax</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* TB Clearance */}
            <div className="space-y-3 py-6" style={{ borderBottom: '2px solid #dddddd' }}>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="tb-clearance" 
                  checked={formData?.tbClearance || false}
                  onCheckedChange={(checked) => {
                    updateField('tbClearance', checked);
                    updateField('tbClearanceTogglePosition', checked);
                  }}
                  disabled={readOnly}
                />
                <Label htmlFor="tb-clearance">TB Clearance: 2-step PPD or Quantiferon Test</Label>
              </div>
              {formData?.tbClearance && (
                <div className="ml-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Test Result</Label>
                      <Select value={formData?.tbClearanceField1 || ""} onValueChange={(value) => updateField('tbClearanceField1', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select result" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Positive">Positive</SelectItem>
                          <SelectItem value="Negative">Negative</SelectItem>
                          <SelectItem value="Indeterminate">Indeterminate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Second Test Result</Label>
                      <Select value={formData?.tbClearanceField2 || ""} onValueChange={(value) => updateField('tbClearanceField2', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select result" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Positive">Positive</SelectItem>
                          <SelectItem value="Negative">Negative</SelectItem>
                          <SelectItem value="Indeterminate">Indeterminate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="chest-xray" 
                          checked={formData?.chestXray || false}
                          onCheckedChange={(checked) => {
                            updateField('chestXray', checked);
                            updateField('chestXrayTogglePosition', checked);
                          }}
                          disabled={readOnly}
                        />
                        <Label htmlFor="chest-xray">Chest X-Ray If Applicable (Must Document "No Active TB")</Label>
                      </div>
                      {formData?.chestXray && (
                        <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div className="space-y-2">
                            <Label>Chest X-ray Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !formData?.chestXrayDate && "text-muted-foreground"
                                  )}
                                  disabled={readOnly}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {formData?.chestXrayDate ? (parseHawaiiDate(formData.chestXrayDate) ? format(parseHawaiiDate(formData.chestXrayDate)!, "PPP") : <span>Invalid date</span>) : <span>Pick a date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={formData?.chestXrayDate ? (parseHawaiiDate(formData.chestXrayDate) ?? undefined) : undefined}
                                  onSelect={(date) => updateField('chestXrayDate', date ? formatDateForHawaii(date) : null)}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="chest-xray-result">Chest X-Ray Result</Label>
                            <Select 
                              value={formData?.chestXrayResult || ""} 
                              onValueChange={(value) => updateField('chestXrayResult', value)}
                              disabled={readOnly}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select result" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Clear">Clear</SelectItem>
                                <SelectItem value="No Active TB">No Active TB</SelectItem>
                                <SelectItem value="Abnormal">Abnormal</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                </div>
              )}
            </div>

            {/* Required Document Checkboxes - 2x2 Grid */}
            <div className="space-y-3 py-6" style={{ borderBottom: '2px solid #dddddd' }}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">REQUIRED ITEMS</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="flex items-center space-x-2">
                 <Checkbox 
                   id="admission-hp" 
                   checked={formData?.admissionHp || false}
                   onCheckedChange={(checked) => {
                     updateField('admissionHp', checked);
                     updateField('admissionHpTogglePosition', checked);
                   }}
                   disabled={readOnly}
                 />
                 <Label htmlFor="admission-hp">Admission H & P</Label>
               </div>

               <div className="flex items-center space-x-2">
                 <Checkbox 
                   id="care-home-forms" 
                   checked={formData?.careHomeForms || false}
                   onCheckedChange={(checked) => {
                     updateField('careHomeForms', checked);
                     updateField('careHomeFormsTogglePosition', checked);
                   }}
                   disabled={readOnly}
                 />
                 <Label htmlFor="care-home-forms">Care Home Forms (if ARCH or E-ARCH)</Label>
               </div>

               <div className="flex items-center space-x-2">
                 <Checkbox 
                   id="polst" 
                   checked={formData?.polst || false}
                   onCheckedChange={(checked) => {
                     updateField('polst', checked);
                     updateField('polstTogglePosition', checked);
                   }}
                   disabled={readOnly}
                 />
                 <Label htmlFor="polst">POLST</Label>
               </div>

               <div className="flex items-center space-x-2">
                 <Checkbox 
                   id="mar-tar" 
                   checked={formData?.marTar || false}
                   onCheckedChange={(checked) => {
                     updateField('marTar', checked);
                     updateField('marTarTogglePosition', checked);
                   }}
                   disabled={readOnly}
                 />
                 <Label htmlFor="mar-tar">MAR /TAR</Label>
               </div>
              </div>
            </div>

            {/* AD/POA Fields */}
            <div className="space-y-3 py-6" style={{ borderBottom: '2px solid #dddddd' }}>
               <div className="flex items-center space-x-2">
                 <Switch 
                   id="ad-poa" 
                   checked={formData?.adPoa || false}
                   onCheckedChange={(checked) => {
                     updateField('adPoa', checked);
                     updateField('adPoaTogglePosition', checked);
                   }}
                   disabled={readOnly}
                 />
                 <Label htmlFor="ad-poa">AD/POA Documents</Label>
               </div>
              {formData?.adPoa && (
                <>
                  <div className="ml-6 space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">POA CONTACT INFORMATION</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ad-poa-name">POA Name *</Label>
                        <Input 
                          id="ad-poa-name" 
                          placeholder="Power of Attorney name"
                          value={formData?.adPoaName || ""} 
                          onChange={(e) => updateField('adPoaName', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ad-poa-phone">POA Phone</Label>
                        <Input 
                          id="ad-poa-phone" 
                          type="tel"
                          placeholder="(123) 456-7890"
                          value={formData?.adPoaPhone || ""} 
                          onChange={(e) => handlePhoneInput(e.target.value, updateField, 'adPoaPhone')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ad-poa-email">POA Email</Label>
                        <Input 
                          id="ad-poa-email" 
                          type="email"
                          placeholder="name@example.com"
                          value={formData?.adPoaEmail || ""} 
                          onChange={(e) => updateField('adPoaEmail', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ad-poa-address">POA Address</Label>
                        <Input 
                          id="ad-poa-address" 
                          placeholder="Full address"
                          value={formData?.adPoaAddress || ""} 
                          onChange={(e) => updateField('adPoaAddress', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="ml-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ad-info">AD</Label>
                      <Input 
                        id="ad-info" 
                        placeholder="AD details"
                        value={formData?.adInfo || ""} 
                        onChange={(e) => updateField('adInfo', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="poa-hc">POA HC</Label>
                      <Input 
                        id="poa-hc" 
                        placeholder="POA Healthcare"
                        value={formData?.poaHc || ""} 
                        onChange={(e) => updateField('poaHc', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="poa-financial">POA Financial</Label>
                      <Input 
                        id="poa-financial" 
                        placeholder="POA Financial"
                        value={formData?.poaFinancial || ""} 
                        onChange={(e) => updateField('poaFinancial', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="poa-comments">Comments</Label>
                    <Textarea 
                      id="poa-comments" 
                      placeholder="Additional comments"
                      value={formData?.poaComments || ""} 
                      onChange={(e) => updateField('poaComments', e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Email/Fax Records */}
            <div className="space-y-3 pt-6">
               <div className="flex items-center space-x-2">
                 <Switch 
                   id="email-fax-records" 
                   checked={formData?.emailFaxRecords || false}
                   onCheckedChange={(checked) => {
                     updateField('emailFaxRecords', checked);
                     updateField('emailFaxRecordsTogglePosition', checked);
                   }}
                   disabled={readOnly}
                 />
                 <Label htmlFor="email-fax-records">Email/Fax Prelim Records to CMA & Provider</Label>
               </div>
              {formData?.emailFaxRecords && (
                <div className="ml-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData?.recordsDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData?.recordsDate ? (parseHawaiiDate(formData.recordsDate) ? format(parseHawaiiDate(formData.recordsDate)!, "PPP") : <span>Invalid date</span>) : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData?.recordsDate ? (parseHawaiiDate(formData.recordsDate) ?? undefined) : undefined}
                          onSelect={(date) => updateField('recordsDate', date ? formatDateForHawaii(date) : null)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-4">CMA INFO</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="cma-name">CMA</Label>
                        <Input 
                          id="cma-name" 
                          placeholder="CMA name"
                          value={formData?.cmaName || ""} 
                          onChange={(e) => updateField('cmaName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cma-phone">CMA Phone</Label>
                        <Input 
                          id="cma-phone" 
                          type="tel"
                          placeholder="(123) 456-7890"
                          value={formData?.cmaPhone || ""} 
                          onChange={(e) => handlePhoneInput(e.target.value, updateField, 'cmaPhone')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cma-email">CMA Email</Label>
                        <Input 
                          id="cma-email" 
                          type="email"
                          placeholder="name@example.com"
                          value={formData?.cmaEmail || ""} 
                          onChange={(e) => updateField('cmaEmail', e.target.value)}
                          className={cmaEmailError ? 'border-red-500' : ''}
                        />
                        {cmaEmailError && (
                          <p className="text-sm text-red-600">{cmaEmailError}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default ChecklistSection;