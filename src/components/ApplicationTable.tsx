
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Lock, Unlock, Download, Eye, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ApplicationItem, LockType } from '@/lib/types/dealer-dashboard';
import { formatDistanceToNow } from 'date-fns';
import { SortableTable, ColumnDef } from '@/components/ui/sortable-table';

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

  // Define table columns
  const columns: ColumnDef<ApplicationItem>[] = [
    {
      accessorKey: 'select',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const app = row as unknown as ApplicationItem;
        return (
          <Checkbox 
            checked={selectedApplications.includes(app.applicationId)}
            onCheckedChange={() => toggleApplicationSelection(app.applicationId)}
            disabled={app.lockInfo?.isLocked && !app.lockInfo?.isOwnLock}
            aria-label={`Select application ${app.applicationId}`}
          />
        );
      }
    },
    {
      accessorKey: 'fullName',
      header: 'Application',
      cell: ({ row }) => {
        const app = row as unknown as ApplicationItem;
        return <div className="font-medium">{app.fullName}</div>;
      }
    },
    {
      accessorKey: 'city',
      header: 'City',
    },
    {
      accessorKey: 'submissionDate',
      header: 'Date',
      cell: ({ row }) => {
        const app = row as unknown as ApplicationItem;
        return format(new Date(app.submissionDate), 'MMM d, yyyy');
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const app = row as unknown as ApplicationItem;
        return (
          <div className="flex flex-col gap-1">
            {renderLockStatus(app)}
            {renderDownloadStatus(app)}
          </div>
        );
      }
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => {
        const app = row as unknown as ApplicationItem;
        return (
          <div className="font-medium text-right">{getPrice(app)}</div>
        );
      }
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const app = row as unknown as ApplicationItem;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onViewDetails(app)}
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            {app.lockInfo?.isLocked && app.lockInfo?.isOwnLock ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onUnlock(app.applicationId)}
                disabled={processingId === app.applicationId}
                title="Unlock Application"
              >
                <Unlock className="h-4 w-4" />
              </Button>
            ) : !app.lockInfo?.isLocked && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleLockOptions(app.applicationId)}
                  disabled={processingId === app.applicationId}
                  title="Lock Application"
                >
                  <Lock className="h-4 w-4" />
                </Button>
                
                {showLockOptions[app.applicationId] && (
                  <div className="absolute right-0 mt-1 bg-white shadow-lg rounded-md border border-gray-200 z-10 w-48 py-1">
                    {lockOptions.map(option => (
                      <button
                        key={option.id}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex justify-between"
                        onClick={() => handleLock(app.applicationId, option.type)}
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
              onClick={() => onDownload(app.applicationId)}
              disabled={
                processingId === app.applicationId || 
                (app.lockInfo?.isLocked && !app.lockInfo?.isOwnLock)
              }
              title="Download Application"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    },
  ];

  // For the header checkbox
  const allSelectCheckbox = (
    <div className="px-4 py-2 border-b">
      <Checkbox 
        checked={allSelected}
        className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
        onCheckedChange={(checked) => selectAll(!!checked)}
        aria-label="Select all applications"
      />
    </div>
  );

  return (
    <div className="border rounded-md">
      <div className="text-sm text-gray-500 p-2">
        {allSelectCheckbox}
      </div>
      <SortableTable
        data={applications}
        columns={columns}
        isLoading={isLoading}
        noDataMessage="No applications available"
      />
    </div>
  );
};

export default ApplicationTable;
