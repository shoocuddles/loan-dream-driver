
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ApplicationOptionsProps {
  hideOlderThan90Days: boolean;
  hideLockedApplications: boolean;
  hidePurchasedApplications: boolean;
  onToggleHideOlderThan90Days: (checked: boolean) => void;
  onToggleHideLockedApplications: (checked: boolean) => void;
  onToggleHidePurchasedApplications: (checked: boolean) => void;
}

const ApplicationOptions = ({
  hideOlderThan90Days,
  hideLockedApplications,
  hidePurchasedApplications,
  onToggleHideOlderThan90Days,
  onToggleHideLockedApplications,
  onToggleHidePurchasedApplications
}: ApplicationOptionsProps) => {
  return (
    <div className="bg-gray-50 p-4 rounded-md border mb-4">
      <h3 className="text-sm font-semibold mb-2">Options</h3>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="hideOlderThan90Days" 
            checked={hideOlderThan90Days} 
            onCheckedChange={onToggleHideOlderThan90Days} 
          />
          <Label htmlFor="hideOlderThan90Days">Hide applications older than 90 days</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="hideLockedApplications" 
            checked={hideLockedApplications} 
            onCheckedChange={onToggleHideLockedApplications} 
          />
          <Label htmlFor="hideLockedApplications">Hide locked applications</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="hidePurchasedApplications" 
            checked={hidePurchasedApplications} 
            onCheckedChange={onToggleHidePurchasedApplications} 
          />
          <Label htmlFor="hidePurchasedApplications">Hide previously purchased applications</Label>
        </div>
      </div>
    </div>
  );
};

export default ApplicationOptions;
