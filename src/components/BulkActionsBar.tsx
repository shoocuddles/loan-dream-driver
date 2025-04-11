
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Lock, Download, ShoppingCart, X } from 'lucide-react';
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
  allDownloaded = false
}: BulkActionsBarProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPurchaseAlert, setShowPurchaseAlert] = useState(false);
  
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
      <div className="sticky bottom-4 left-0 right-0 mt-4 p-4 bg-white rounded-lg border shadow-lg flex justify-between items-center z-10">
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
          
          {/* Only show Lock button if all items are purchased */}
          {unpurchasedCount === 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isProcessing || selectedCount === 0}
                >
                  <Lock className="mr-1 h-4 w-4" />
                  Lock
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => onBulkLock('24hours')}>
                    24 Hours ($4.99 each)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkLock('1week')}>
                    1 Week ($9.99 each)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkLock('permanent')}>
                    Permanent ($29.99 each)
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Only show Download button if all items are purchased */}
          {unpurchasedCount === 0 && selectedApplicationIds.length > 0 && (
            <DownloadOptions
              applicationIds={selectedApplicationIds}
              isProcessing={isDownloading}
              variant="outline"
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
