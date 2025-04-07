
import { Badge } from '@/components/ui/badge';
import { Clock, Lock } from 'lucide-react';
import { ApplicationItem } from '@/lib/types/dealer-dashboard';
import { formatDistanceToNow } from 'date-fns';

interface StatusBadgeProps {
  status: string | undefined;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  if (!status) return null;
  
  let badgeClass = "bg-gray-50 text-gray-700 border-gray-200";
  
  if (status === "submitted") {
    badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
  } else if (status === "approved") {
    badgeClass = "bg-green-50 text-green-700 border-green-200";
  } else if (status === "rejected") {
    badgeClass = "bg-red-50 text-red-700 border-red-200";
  }
  
  return (
    <Badge variant="outline" className={badgeClass}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

interface LockStatusBadgeProps {
  lockInfo: ApplicationItem['lockInfo'];
}

export const LockStatusBadge = ({ lockInfo }: LockStatusBadgeProps) => {
  if (!lockInfo || !lockInfo.isLocked) {
    return null;
  }

  // Always show lock status to all dealers
  const expiresAt = lockInfo.expiresAt ? new Date(lockInfo.expiresAt) : null;
  if (!expiresAt || expiresAt < new Date()) return null;

  const timeLeft = formatDistanceToNow(expiresAt, { addSuffix: true });
  
  // Use different styling based on whether it's the dealer's own lock
  const badgeClass = lockInfo.isOwnLock 
    ? "bg-blue-50 text-blue-700 border-blue-200"
    : "bg-red-50 text-red-700 border-red-200";
  
  return (
    <Badge variant="outline" className={badgeClass}>
      <Clock className="w-3 h-3 mr-1" /> 
      {lockInfo.isOwnLock ? "Locked by You" : `Locked ${timeLeft}`}
    </Badge>
  );
};

export const DownloadStatusBadge = ({ isDownloaded }: { isDownloaded: boolean }) => {
  if (!isDownloaded) {
    return null;
  }
  
  return (
    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
      Downloaded
    </Badge>
  );
};
