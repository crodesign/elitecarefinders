import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface MentalHealthSectionProps {
  formData?: any;
  setFormData?: (data: any) => void;
  readOnly?: boolean;
}

const MentalHealthSection = ({ formData, setFormData, readOnly = false }: MentalHealthSectionProps) => {
  const updateField = (field: string, value: any) => {
    if (setFormData) {
      setFormData((prev: any) => ({ ...prev, [field]: value }));
    }
  };

  const handleMentalHealthChange = (condition: string, checked: boolean | string) => {
    // Cast to boolean since onCheckedChange can return string | boolean
    const isChecked = checked === true || checked === 'true';
    const currentConditions = formData?.mentalHealth || [];
    const newConditions = isChecked 
      ? [...currentConditions, condition]
      : currentConditions.filter((c: string) => c !== condition);
    updateField('mentalHealth', newConditions);
  };
  return (
    <div className="space-y-[10px]">
      {/* Mental Health */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground pt-[5px] pl-[5px] pb-[5px]">MENTAL HEALTH</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="memory-issues" 
              checked={formData?.mentalHealth?.includes("Memory Issues") || false}
              onCheckedChange={(checked) => handleMentalHealthChange("Memory Issues", checked)}
              disabled={readOnly}
            />
            <Label htmlFor="memory-issues">Memory Issues</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="hallucinations" 
              checked={formData?.mentalHealth?.includes("Hallucinations") || false}
              onCheckedChange={(checked) => handleMentalHealthChange("Hallucinations", checked)}
              disabled={readOnly}
            />
            <Label htmlFor="hallucinations">Hallucinations</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="wandering" 
              checked={formData?.mentalHealth?.includes("Wandering") || false}
              onCheckedChange={(checked) => handleMentalHealthChange("Wandering", checked)}
              disabled={readOnly}
            />
            <Label htmlFor="wandering">Wandering</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="aggressiveness" 
              checked={formData?.mentalHealth?.includes("Aggressiveness towards Others") || false}
              onCheckedChange={(checked) => handleMentalHealthChange("Aggressiveness towards Others", checked)}
              disabled={readOnly}
            />
            <Label htmlFor="aggressiveness">Aggressiveness towards Others</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="withdrawal" 
              checked={formData?.mentalHealth?.includes("Withdrawal from Activities") || false}
              onCheckedChange={(checked) => handleMentalHealthChange("Withdrawal from Activities", checked)}
              disabled={readOnly}
            />
            <Label htmlFor="withdrawal">Withdrawal from Activities</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="inappropriate-behaviors" 
              checked={formData?.mentalHealth?.includes("Inappropriate Behaviors") || false}
              onCheckedChange={(checked) => handleMentalHealthChange("Inappropriate Behaviors", checked)}
              disabled={readOnly}
            />
            <Label htmlFor="inappropriate-behaviors">Inappropriate Behaviors</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="none" 
              checked={formData?.mentalHealth?.includes("None") || false}
              onCheckedChange={(checked) => handleMentalHealthChange("None", checked)}
              disabled={readOnly}
            />
            <Label htmlFor="none">None</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="dementia" 
              checked={formData?.mentalHealth?.includes("Dementia") || false}
              onCheckedChange={(checked) => handleMentalHealthChange("Dementia", checked)}
              disabled={readOnly}
            />
            <Label htmlFor="dementia">Dementia</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="mci" 
              checked={formData?.mentalHealth?.includes("Mild Cognitive Impairment (MCI)") || false}
              onCheckedChange={(checked) => handleMentalHealthChange("Mild Cognitive Impairment (MCI)", checked)}
              disabled={readOnly}
            />
            <Label htmlFor="mci">Mild Cognitive Impairment (MCI)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="alzheimers" 
              checked={formData?.mentalHealth?.includes("Alzheimer's") || false}
              onCheckedChange={(checked) => handleMentalHealthChange("Alzheimer's", checked)}
              disabled={readOnly}
            />
            <Label htmlFor="alzheimers">Alzheimer's</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="sundowning" 
              checked={formData?.mentalHealth?.includes("Sundowning") || false}
              onCheckedChange={(checked) => handleMentalHealthChange("Sundowning", checked)}
              disabled={readOnly}
            />
            <Label htmlFor="sundowning">Sundowning</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="combativeness" 
              checked={formData?.mentalHealth?.includes("Combativeness") || false}
              onCheckedChange={(checked) => handleMentalHealthChange("Combativeness", checked)}
              disabled={readOnly}
            />
            <Label htmlFor="combativeness">Combativeness</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="sleep-issues" 
              checked={formData?.mentalHealth?.includes("Doesn't Sleep Through Night") || false}
              onCheckedChange={(checked) => handleMentalHealthChange("Doesn't Sleep Through Night", checked)}
              disabled={readOnly}
            />
            <Label htmlFor="sleep-issues">Doesn't Sleep Through Night</Label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentalHealthSection;