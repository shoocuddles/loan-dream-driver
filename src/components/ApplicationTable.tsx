
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Lock, Unlock, Download, Eye, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ApplicationItem, LockType } from '@/lib/types/dealer-dashboard';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

type LockOption = {
  id: number;
  name: string;
  type: LockType;
  fee: number;
};

interface ApplicationTableProps {
  applications: ApplicationItem[];
  isLoading: boolean;
  selectedApplications: string[];
  toggleApplicationSelection: (id: string) => void;
  selectAll: (select: boolean) => void;
  onLock: (applicationId: string, lockType: LockType) => Promise<void>;
  onUnlock: (applicationId: string) => Promise<void>;
  onDownload: (applicationId: string) => Promise<void>;
  onViewDetails: (application: ApplicationItem) => void;
  processingId: string | null;
  lockOptions: LockOption[];
}

const ApplicationTable = ({
  applications,
  isLoading,
  selectedApplications,
  toggleApplicationSelection,
  selectAll,
  onLock,
  onUnlock,
  onDownload,
  onViewDetails,
  processingId,
  lockOptions
}: ApplicationTableProps) => {
  const { toast } = useToast();
  const [showLockOptions, setShowLockOptions] = useState<{ [key: string]: boolean }>({});

  const handleToggleLockOptions = (applicationId: string) => {
    setShowLockOptions(prev => ({
      ...prev,
      [applicationId]: !prev[applicationId]
    }));
  };

  const handleLock = (applicationId: string, lockType: LockType) => {
    onLock(applicationId, lockType);
    setShowLockOptions(prev => ({
      ...prev,
      [applicationId]: false
    }));
  };

  const renderLockStatus = (application: ApplicationItem) => {
    const lockInfo = application.lockInfo;
    
    if (!lockInfo || !lockInfo.isLocked) {
      return null;
    }

    if (lockInfo.isOwnLock) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Lock className="w-3 h-3 mr-1" /> Locked by You
        </Badge>
      );
    }

    const expiresAt = lockInfo.expiresAt ? new Date(lockInfo.expiresAt) : null;
    if (!expiresAt) return null;

    const isExpired = expiresAt < new Date();
    if (isExpired) return null;

    const timeLeft = formatDistanceToNow(expiresAt, { addSuffix: true });
    
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        <Clock className="w-3 h-3 mr-1" /> Locked {timeLeft}
      </Badge>
    );
  };

  const renderDownloadStatus = (application: ApplicationItem) => {
    if (application.isDownloaded) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Downloaded
        </Badge>
      );
    }
    return null;
  };

  const getPrice = (application: ApplicationItem) => {
    if (application.isDownloaded) {
      return 'Free';
    }
    const lockInfo = application.lockInfo;
    const wasLocked = lockInfo?.isLocked && lockInfo.lockedBy !== 'currentDealerId';
    return wasLocked ? 
      `$${application.discountedPrice?.toFixed(2)}` : 
      `$${application.standardPrice?.toFixed(2)}`;
  };

  const allSelected = applications.length > 0 && selectedApplications.length === applications.length;
  const someSelected = selectedApplications.length > 0 && !allSelected;

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox 
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={(checked) => selectAll(!!checked)}
                aria-label="Select all applications"
              />
            </TableHead>
            <TableHead>Application</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-ontario-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading applications...
                </div>
              </TableCell>
            </TableRow>
          ) : applications.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                No applications available
              </TableCell>
            </TableRow>
          ) : (
            applications.map((application) => (
              <TableRow key={application.applicationId}>
                <TableCell>
                  <Checkbox 
                    checked={selectedApplications.includes(application.applicationId)}
                    onCheckedChange={() => toggleApplicationSelection(application.applicationId)}
                    disabled={application.lockInfo?.isLocked && !application.lockInfo?.isOwnLock}
                    aria-label={`Select application ${application.applicationId}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="font-medium">{application.fullName}</div>
                </TableCell>
                <TableCell>{application.city || 'N/A'}</TableCell>
                <TableCell>
                  {format(new Date(application.submissionDate), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {renderLockStatus(application)}
                    {renderDownloadStatus(application)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-medium">{getPrice(application)}</div>
                </TableCell>
                <TableCell>
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
                          onClick={() => handleToggleLockOptions(application.applicationId)}
                          disabled={processingId === application.applicationId}
                          title="Lock Application"
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                        
                        {showLockOptions[application.applicationId] && (
                          <div className="absolute right-0 mt-1 bg-white shadow-lg rounded-md border border-gray-200 z-10 w-48 py-1">
                            {lockOptions.map(option => (
                              <button
                                key={option.id}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex justify-between"
                                onClick={() => handleLock(application.applicationId, option.type)}
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default ApplicationTable;
