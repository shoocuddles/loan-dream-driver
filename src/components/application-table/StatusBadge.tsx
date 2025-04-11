
import { Badge } from "@/components/ui/badge";
import { LockType } from '@/lib/types/dealer-dashboard';
import { isValid, parseISO, format } from 'date-fns';

interface LockInfo {
  isLocked: boolean;
  lockedBy?: string;
  expiresAt?: string;
  lockType?: LockType;
  isOwnLock?: boolean;
}

export const StatusBadge = ({ status }: { status: string }) => {
  let variant: "outline" | "default" | "secondary" | "destructive" = "outline";
  let label = status?.charAt(0).toUpperCase() + status?.slice(1) || "Unknown";
  
  if (status === "approved") {
    variant = "default";
  } else if (status === "rejected") {
    variant = "destructive";
  } else if (status === "submitted") {
    variant = "secondary";
  }
  
  return (
    <Badge variant={variant}>{label}</Badge>
  );
};

export const LockStatusBadge = ({ lockInfo }: { lockInfo?: LockInfo }) => {
  if (!lockInfo || !lockInfo.isLocked) {
    return null;
  }
  
  if (lockInfo.isOwnLock) {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        You locked
      </Badge>
    );
  }
  
  // Format the expiration date if available
  if (lockInfo.expiresAt) {
    try {
      const expiryDate = parseISO(lockInfo.expiresAt);
      
      if (isValid(expiryDate)) {
        const now = new Date();
        
        // Check if the lock has expired
        if (expiryDate < now) {
          return (
            <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200">
              Lock expired
            </Badge>
          );
        }
        
        // Format the date and time in local timezone
        const formattedDate = format(expiryDate, 'MMM d, yyyy');
        const formattedTime = format(expiryDate, 'h:mm a');
        
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <div className="flex flex-col items-center text-center">
              <span className="text-xs">Locked until</span>
              <span>{formattedDate} {formattedTime}</span>
            </div>
          </Badge>
        );
      }
    } catch (error) {
      console.error('Error formatting lock expiration date:', error);
    }
  }
  
  // Fallback if no valid expiration date is available
  return (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
      Locked by other
    </Badge>
  );
};

export const DownloadStatusBadge = ({ isDownloaded }: { isDownloaded?: boolean }) => {
  if (!isDownloaded) {
    return null;
  }
  
  return (
    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
      Downloaded
    </Badge>
  );
};
