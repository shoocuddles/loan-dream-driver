
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Unlock, Lock, Download } from 'lucide-react';
import { ApplicationItem, LockType } from '@/lib/types/dealer-dashboard';

interface ApplicationActionsProps {
  application: ApplicationItem;
  onViewDetails: (application: ApplicationItem) => void;
  onLock: (applicationId: string, lockType: LockType) => Promise<void>;
  onUnlock: (applicationId: string) => Promise<void>;
  onDownload: (applicationId: string) => Promise<void>;
  processingId: string | null;
  lockOptions: {
    id: number;
    name: string;
    type: LockType;
    fee: number;
  }[];
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
      
      {application.lockInfo?.isLocked && application.lockInfo?.isOwnLock ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onUnlock(application.applicationId)}
          disabled={processingId === application.applicationId}
          title="Unlock Application"
        >
          <Unlock className="h-4 w-4" />
        </Button>
      ) : !application.lockInfo?.isLocked && (
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleLockOptions}
            disabled={processingId === application.applicationId}
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
        disabled={
          processingId === application.applicationId || 
          (application.lockInfo?.isLocked && !application.lockInfo?.isOwnLock)
        }
        title="Download Application"
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
};
