
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  Download, 
  Search, 
  Lock, 
  Unlock,
  Calendar
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ApplicationItem, LockType } from '@/lib/types/dealer-dashboard';

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

export function ApplicationActions({
  application,
  onViewDetails,
  onLock,
  onUnlock,
  onDownload,
  processingId,
  lockOptions
}: ApplicationActionsProps) {
  const [showLockOptions, setShowLockOptions] = useState(false);
  
  const isLocked = application.lockInfo?.isLocked;
  const isOwnLock = application.lockInfo?.isOwnLock;
  const isProcessing = processingId === application.applicationId;
  const isAlreadyDownloaded = application.isDownloaded;

  return (
    <div className="flex gap-2 justify-end">
      <Button
        size="sm"
        variant="outline"
        onClick={() => onViewDetails(application)}
      >
        <Search className="h-4 w-4" />
      </Button>

      {isLocked && isOwnLock ? (
        <Button 
          size="sm"
          variant="outline"
          onClick={() => onUnlock(application.applicationId)}
          disabled={isProcessing}
        >
          <Unlock className="h-4 w-4" />
        </Button>
      ) : !isLocked && (
        <DropdownMenu open={showLockOptions} onOpenChange={setShowLockOptions}>
          <DropdownMenuTrigger asChild>
            <Button 
              size="sm"
              variant="outline"
              disabled={isProcessing}
            >
              <Lock className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Lock Options</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => {
              onLock(application.applicationId, 'temporary');
              setShowLockOptions(false);
            }}>
              <Calendar className="h-4 w-4 mr-2" />
              Temporary Lock (Free)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {lockOptions.map(option => (
              <DropdownMenuItem 
                key={option.id}
                onClick={() => {
                  onLock(application.applicationId, option.type);
                  setShowLockOptions(false);
                }}
              >
                <Lock className="h-4 w-4 mr-2" />
                {option.name} (${option.fee.toFixed(2)})
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Button
        size="sm"
        className={isAlreadyDownloaded ? "bg-green-600 hover:bg-green-700" : ""}
        disabled={isProcessing || (isLocked && !isOwnLock)}
        onClick={() => onDownload(application.applicationId)}
      >
        <Download className="h-4 w-4 mr-2" />
        {isProcessing ? (
          "Processing..."
        ) : isAlreadyDownloaded ? (
          "View (Free)"
        ) : isLocked ? (
          isOwnLock ? "Download" : "Locked"
        ) : (
          "Purchase"
        )}
      </Button>
    </div>
  );
}
