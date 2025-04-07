
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Lock, Trash } from 'lucide-react';
import { LockType } from '@/lib/types/dealer-dashboard';
import DownloadOptions from './application-table/DownloadOptions';

interface BulkActionsBarProps {
  selectedCount: number;
  onBulkDownload: () => Promise<void>;
  onBulkLock: (lockType: LockType) => Promise<void>;
  onClearSelection: () => void;
  isProcessing: boolean;
  selectedApplicationIds: string[];
}

const BulkActionsBar = ({
  selectedCount,
  onBulkDownload,
  onBulkLock,
  onClearSelection,
  isProcessing,
  selectedApplicationIds
}: BulkActionsBarProps) => {
  const [showLockOptions, setShowLockOptions] = useState(false);

  const handleLock = (lockType: LockType) => {
    onBulkLock(lockType);
    setShowLockOptions(false);
  };

  if (selectedCount === 0) return null;

  return (
    <div className="bg-white border rounded-md p-4 mt-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">
            {selectedCount} application{selectedCount !== 1 ? 's' : ''} selected
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
            disabled={isProcessing}
          >
            <Trash className="h-4 w-4 mr-2" />
            Clear selection
          </Button>
          
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLockOptions(!showLockOptions)}
              disabled={isProcessing}
            >
              <Lock className="h-4 w-4 mr-2" />
              Lock selected
            </Button>
            
            {showLockOptions && (
              <div className="absolute right-0 mt-1 bg-white shadow-lg rounded-md border border-gray-200 z-10 w-64 py-1">
                <div className="px-4 py-2 bg-blue-50 text-xs text-blue-700 border-b border-blue-100">
                  Lock this application to avoid other dealers being able to view. 24-hr lockout period automatic for every download.
                </div>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  onClick={() => handleLock('24hours')}
                >
                  24 Hours - $4.99 each
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  onClick={() => handleLock('1week')}
                >
                  1 Week - $9.99 each
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  onClick={() => handleLock('permanent')}
                >
                  Permanent - $29.99 each
                </button>
              </div>
            )}
          </div>
          
          <DownloadOptions
            applicationIds={selectedApplicationIds}
            isProcessing={isProcessing}
            label={isProcessing ? "Processing..." : "Download selected"}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
};

export default BulkActionsBar;
