
import { Button } from '@/components/ui/button';
import { ApplicationItem, LockType } from '@/lib/types/dealer-dashboard';
import { Eye, Lock, Unlock, Download } from 'lucide-react';
import { useState } from 'react';

interface LockOption {
  id: number;
  name: string;
  type: LockType;
  fee: number;
}

interface ApplicationActionsProps {
  application: ApplicationItem;
  onViewDetails: (application: ApplicationItem) => void;
  onLock: (applicationId: string, lockType: LockType) => Promise<void>;
  onUnlock: (applicationId: string) => Promise<void>;
  onDownload: (applicationId: string) => Promise<void>;
  processingId: string | null;
  lockOptions: LockOption[];
}

export const ApplicationActions = ({
  application,
  onViewDetails,
  onLock,
  onUnlock,
  onDownload,
  processingId,
  lockOptions
}: ApplicationActionsProps) => {
  const [showLockOptions, setShowLockOptions] = useState(false);

  const handleToggleLockOptions = () => {
    setShowLockOptions(prev => !prev);
  };

  const handleLock = (lockType: LockType) => {
    onLock(application.applicationId, lockType);
    setShowLockOptions(false);
  };

  const isProcessing = processingId === application.applicationId;
  const isLocked = application.lockInfo?.isLocked;
  const isOwnLock = application.lockInfo?.isOwnLock;
  const canDownload = !isProcessing && (!isLocked || isOwnLock);

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onViewDetails(application)}
        title="View Details"
      >
        <Eye className="h-4 w-4" />
      </Button>
      
      {isLocked && isOwnLock ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onUnlock(application.applicationId)}
          disabled={isProcessing}
          title="Unlock Application"
        >
          <Unlock className="h-4 w-4" />
        </Button>
      ) : !isLocked && (
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleLockOptions}
            disabled={isProcessing}
            title="Lock Application"
          >
            <Lock className="h-4 w-4" />
          </Button>
          
          {showLockOptions && (
            <div className="absolute right-0 mt-1 bg-white shadow-lg rounded-md border border-gray-200 z-10 w-48 py-1">
              {lockOptions.map(option => (
                <button
                  key={option.id}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex justify-between"
                  onClick={() => handleLock(option.type)}
                >
                  <span>{option.name}</span>
                  <span className="font-medium">${option.fee.toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDownload(application.applicationId)}
        disabled={!canDownload}
        title="Download Application"
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
};
