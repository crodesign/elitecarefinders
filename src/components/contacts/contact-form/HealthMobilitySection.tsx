import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const HealthMobilitySection = () => {
  return (
    <div className="space-y-[10px]">
      {/* Medical Conditions */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground pt-[5px] pl-[5px] pb-[5px]">MEDICAL CONDITIONS</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox id="diabetes" />
            <Label htmlFor="diabetes">Diabetes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="insulin-injections" />
            <Label htmlFor="insulin-injections">Insulin Injections</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="sliding-scale" />
            <Label htmlFor="sliding-scale">Sliding Scale Injections</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="blood-sugar-monitoring" />
            <Label htmlFor="blood-sugar-monitoring">Blood Sugar Monitoring</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="soft-pureed-diet" />
            <Label htmlFor="soft-pureed-diet">Soft Pureed Diet</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="low-sugar-diet" />
            <Label htmlFor="low-sugar-diet">Low Sugar Diet</Label>
          </div>
        </div>
      </div>

      {/* Level of Mobility */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground pt-[5px] pl-[5px] pb-[5px]">LEVEL OF MOBILITY</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox id="ambulatory" />
            <Label htmlFor="ambulatory">Ambulatory</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="non-ambulatory" />
            <Label htmlFor="non-ambulatory">Non Ambulatory</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="cane" />
            <Label htmlFor="cane">Cane</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="walker" />
            <Label htmlFor="walker">Walker</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="hoyer-lift" />
            <Label htmlFor="hoyer-lift">Hoyer Lift</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="wheelchair" />
            <Label htmlFor="wheelchair">Wheelchair</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="one-person-transfer" />
            <Label htmlFor="one-person-transfer">1-Person Transfer</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="two-person-transfer" />
            <Label htmlFor="two-person-transfer">2-Person Transfer</Label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthMobilitySection;