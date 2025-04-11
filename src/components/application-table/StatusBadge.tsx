
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { LockInfo } from '@/lib/types/dealer-dashboard';

interface StatusBadgeProps {
  status?: string;
}

interface LockStatusBadgeProps {
  lockInfo?: LockInfo;
}

interface DownloadStatusBadgeProps {
  isDownloaded?: boolean;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  if (!status) return null;
  
  let badgeVariant: 'default' | 'destructive' | 'outline' | 'secondary' = 'outline';
  let badgeClasses = 'bg-gray-50 text-gray-700 border-gray-200';
  
  if (status === 'submitted' || status === 'processing') {
    badgeClasses = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (status === 'approved' || status === 'completed') {
    badgeClasses = 'bg-green-50 text-green-700 border-green-200';
  } else if (status === 'rejected' || status === 'declined') {
    badgeClasses = 'bg-red-50 text-red-700 border-red-200';
  }
  
  const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1);
  
  return (
    <Badge variant="outline" className={badgeClasses}>{formattedStatus}</Badge>
  );
};

export const LockStatusBadge = ({ lockInfo }: LockStatusBadgeProps) => {
  if (!lockInfo || !lockInfo.isLocked) return null;
  
  if (lockInfo.isOwnLock) {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        Locked by You
      </Badge>
    );
  }
  
  if (!lockInfo.expiresAt) return null;
  
  const expiresAt = new Date(lockInfo.expiresAt);
  if (expiresAt < new Date()) return null;
  
  // Change "about" to "for" to match the requested format
  const timeLeft = formatDistanceToNow(expiresAt);
  
  return (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
      Locked for {timeLeft}
    </Badge>
  );
};

export const DownloadStatusBadge = ({ isDownloaded }: DownloadStatusBadgeProps) => {
  if (!isDownloaded) return null;
  
  return (
    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
      Downloaded
    </Badge>
  );
};
