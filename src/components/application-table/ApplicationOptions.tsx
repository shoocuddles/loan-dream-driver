
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface ApplicationOptionsProps {
  hideOlderThan90Days: boolean;
  hideLockedApplications: boolean;
  hidePurchasedApplications: boolean;
  autoRefreshEnabled: boolean;
  onToggleHideOlderThan90Days: (checked: boolean) => void;
  onToggleHideLockedApplications: (checked: boolean) => void;
  onToggleHidePurchasedApplications: (checked: boolean) => void;
  onToggleAutoRefresh: (checked: boolean) => void;
  onManualRefresh: () => void;
}

const ApplicationOptions = ({
  hideOlderThan90Days,
  hideLockedApplications,
  hidePurchasedApplications,
  autoRefreshEnabled,
  onToggleHideOlderThan90Days,
  onToggleHideLockedApplications,
  onToggleHidePurchasedApplications,
  onToggleAutoRefresh,
  onManualRefresh
}: ApplicationOptionsProps) => {
  return (
    <div className="bg-gray-50 p-4 rounded-md border mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold">Options</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onManualRefresh}
          className="flex items-center gap-1"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
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
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="autoRefreshEnabled" 
            checked={autoRefreshEnabled} 
            onCheckedChange={onToggleAutoRefresh} 
          />
          <Label htmlFor="autoRefreshEnabled">Auto-refresh page every 60 seconds</Label>
        </div>
      </div>
    </div>
  );
};

export default ApplicationOptions;
