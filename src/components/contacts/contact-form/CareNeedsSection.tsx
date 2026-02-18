import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const CareNeedsSection = () => {
  return (
    <div className="space-y-6">
      {/* Care Needs */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">CARE NEEDS</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox id="no-care" />
            <Label htmlFor="no-care">No Care</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="light-care" />
            <Label htmlFor="light-care">Light Care</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="heavy-care" />
            <Label htmlFor="heavy-care">Heavy Care</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="memory-care-needs" />
            <Label htmlFor="memory-care-needs">Memory Care</Label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareNeedsSection;