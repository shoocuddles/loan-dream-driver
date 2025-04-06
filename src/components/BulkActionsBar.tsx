
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Lock, Trash } from 'lucide-react';
import { LockType } from '@/lib/types/dealer-dashboard';

interface BulkActionsBarProps {
  selectedCount: number;
  onBulkDownload: () => Promise<void>;
  onBulkLock: (lockType: LockType) => Promise<void>;
  onClearSelection: () => void;
  isProcessing: boolean;
}

const BulkActionsBar = ({
  selectedCount,
  onBulkDownload,
  onBulkLock,
  onClearSelection,
  isProcessing
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
              <div className="absolute right-0 mt-1 bg-white shadow-lg rounded-md border border-gray-200 z-10 w-48 py-1">
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
          
          <Button
            size="sm"
            className="bg-ontario-blue hover:bg-ontario-blue/90"
            onClick={onBulkDownload}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download selected
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsBar;
