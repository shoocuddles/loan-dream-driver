
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
  onPurchaseSelected
}: BulkActionsBarProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  
  if (selectedCount === 0) {
    return null;
  }

  return (
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
        
        {selectedApplicationIds.length > 0 ? (
          <DownloadOptions
            applicationIds={selectedApplicationIds}
            isProcessing={isDownloading}
            variant="outline"
            label="Download"
            showIcon
          />
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={isProcessing || selectedCount === 0}
          >
            <Download className="mr-1 h-4 w-4" />
            Download
          </Button>
        )}
        
        {unpurchasedCount > 0 && (
          <Button
            size="sm"
            variant="default"
            onClick={onPurchaseSelected}
            disabled={isProcessing}
          >
            <ShoppingCart className="mr-1 h-4 w-4" />
            Purchase ({unpurchasedCount})
          </Button>
        )}
      </div>
    </div>
  );
};

export default BulkActionsBar;
