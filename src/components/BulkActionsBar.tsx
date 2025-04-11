
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Lock, Download, ShoppingCart, X, EyeOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LockType } from '@/lib/types/dealer-dashboard';
import DownloadOptions from './application-table/DownloadOptions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery } from '@tanstack/react-query';
import { fetchLockoutPeriods } from '@/lib/services/lock/lockService';

interface BulkActionsBarProps {
  selectedCount: number;
  onBulkDownload: () => Promise<void>;
  onBulkLock: (lockType: LockType) => Promise<void>;
  onClearSelection: () => void;
  isProcessing: boolean;
  unpurchasedCount: number;
  totalPurchaseCost: number;
  selectedApplicationIds: string[];
  onPurchaseSelected: () => Promise<void>;
  allDownloaded?: boolean;
  onBulkHide?: () => Promise<void>;
}

const BulkActionsBar = ({
  selectedCount,
  onBulkDownload,
  onBulkLock,
  onClearSelection,
  isProcessing,
  unpurchasedCount,
  totalPurchaseCost,
  selectedApplicationIds,
  onPurchaseSelected,
  allDownloaded = false,
  onBulkHide
}: BulkActionsBarProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPurchaseAlert, setShowPurchaseAlert] = useState(false);
  
  // Fetch available lockout periods
  const { data: lockoutPeriods = [] } = useQuery({
    queryKey: ['lockout-periods'],
    queryFn: fetchLockoutPeriods
  });
  
  if (selectedCount === 0) {
    return null;
  }

  const handleMixedPurchaseClick = () => {
    if (unpurchasedCount > 0) {
      setShowPurchaseAlert(true);
    } else {
      onBulkDownload();
    }
  };

  return (
    <>
      <div className="sticky bottom-4 left-0 right-0 mt-4 p-4 bg-gray-200/70 backdrop-blur-sm rounded-lg border shadow-lg flex justify-between items-center z-10">
        <div>
          <span className="font-medium">{selectedCount} item{selectedCount !== 1 ? 's' : ''} selected</span>
          {unpurchasedCount > 0 && (
            <span className="ml-2 text-sm text-gray-500">
              ({unpurchasedCount} unpurchased, ${totalPurchaseCost.toFixed(2)})
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            disabled={isProcessing}
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>

          {/* Add Hide button */}
          {selectedCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="bg-[#FEF7CD] border-amber-200 hover:bg-amber-100"
              onClick={onBulkHide}
              disabled={isProcessing}
            >
              <EyeOff className="mr-1 h-4 w-4" />
              Hide
            </Button>
          )}
          
          {/* Show Lock button for purchased applications */}
          {(unpurchasedCount === 0 || allDownloaded) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="bg-amber-400 hover:bg-amber-500 text-amber-950"
                  disabled={isProcessing || selectedCount === 0}
                >
                  <Lock className="mr-1 h-4 w-4" />
                  Lock
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  {lockoutPeriods.map(period => (
                    <DropdownMenuItem 
                      key={period.id} 
                      onClick={() => onBulkLock(period.name.toLowerCase().replace(/\s+/g, '') as LockType)}
                    >
                      {period.name} (${period.fee.toFixed(2)} each)
                    </DropdownMenuItem>
                  ))}
                  {lockoutPeriods.length === 0 && (
                    <>
                      <DropdownMenuItem onClick={() => onBulkLock('24hours')}>
                        24 Hours ($4.99 each)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onBulkLock('1week')}>
                        1 Week ($9.99 each)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onBulkLock('permanent')}>
                        Permanent ($29.99 each)
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Only show Download button if all items are purchased */}
          {(unpurchasedCount === 0 || allDownloaded) && selectedApplicationIds.length > 0 && (
            <DownloadOptions
              applicationIds={selectedApplicationIds}
              isProcessing={isDownloading}
              variant="success"
              label="Download"
              showIcon
            />
          )}
          
          {/* Show combined action button when there's a mix of purchased and unpurchased */}
          {unpurchasedCount > 0 && selectedCount > unpurchasedCount && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleMixedPurchaseClick}
              disabled={isProcessing}
            >
              <Download className="mr-1 h-4 w-4" />
              Process Selected
            </Button>
          )}
          
          {/* Always show Purchase button if there are unpurchased items */}
          {unpurchasedCount > 0 && (
            <Button
              size="sm"
              variant="success"
              onClick={() => unpurchasedCount < selectedCount ? setShowPurchaseAlert(true) : onPurchaseSelected()}
              disabled={isProcessing}
            >
              <ShoppingCart className="mr-1 h-4 w-4" />
              Purchase {unpurchasedCount < selectedCount ? "Unpurchased" : `(${unpurchasedCount})`}
            </Button>
          )}
        </div>
      </div>

      {/* Alert dialog for mixed purchased/unpurchased selection */}
      <AlertDialog open={showPurchaseAlert} onOpenChange={setShowPurchaseAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpurchased Applications</AlertDialogTitle>
            <AlertDialogDescription>
              You have {unpurchasedCount} unpurchased applications selected. Would you like to buy and unlock your unpurchased applications that are selected?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onPurchaseSelected} className="bg-green-600 hover:bg-green-700">
              Purchase Now (${totalPurchaseCost.toFixed(2)})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BulkActionsBar;
