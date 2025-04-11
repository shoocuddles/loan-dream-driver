
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ApplicationItem, LockType } from '@/lib/types/dealer-dashboard';
import { SortableTable, ColumnDef } from '@/components/ui/sortable-table';
import { StatusBadge, LockStatusBadge, DownloadStatusBadge } from './StatusBadge';
import { ApplicationActions } from './ApplicationActions';
import { safeFormatDate } from './dateUtils';
import { getPrice, AgeDiscountSettings } from './priceUtils';
import { SelectionHeader } from './SelectionHeader';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, EyeOff, ShoppingCart, Eye } from 'lucide-react';

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
  onHideApplication?: (applicationId: string) => void;
  onPurchase?: (applicationId: string) => void;
  processingId: string | null;
  lockOptions: LockOption[];
  ageDiscountSettings?: AgeDiscountSettings;
  showActions?: boolean;
  isHiddenView?: boolean;
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
  onHideApplication,
  onPurchase,
  processingId,
  lockOptions,
  ageDiscountSettings,
  showActions = true,
  isHiddenView = false
}: ApplicationTableProps) => {
  const allSelected = applications.length > 0 && selectedApplications.length === applications.length;
  const someSelected = selectedApplications.length > 0 && !allSelected;
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  const totalPages = Math.ceil(applications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, applications.length);
  const currentApplications = applications.slice(startIndex, endIndex);

  console.log('Applications with lock info:', applications.map(app => ({ 
    id: app.applicationId,
    vehicleType: app.vehicleType,
    status: app.status,
    lockInfo: app.lockInfo,
    submissionDate: app.submissionDate
  })));

  if (ageDiscountSettings?.isEnabled) {
    console.log('Age discount settings:', ageDiscountSettings);
  }

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    selectAll(false);
  };

  const columns: ColumnDef<ApplicationItem>[] = [
    {
      accessorKey: 'select',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <Checkbox 
          checked={selectedApplications.includes(row.original.applicationId)}
          onCheckedChange={() => toggleApplicationSelection(row.original.applicationId)}
          disabled={row.original.lockInfo?.isLocked && !row.original.lockInfo?.isOwnLock}
          aria-label={`Select application ${row.original.applicationId}`}
        />
      )
    },
    {
      accessorKey: 'submissionDate',
      header: 'Date',
      cell: ({ row }) => safeFormatDate(row.original.submissionDate)
    },
    {
      accessorKey: 'fullName',
      header: 'Name',
      cell: ({ row }) => <div className="font-medium">{row.original.fullName}</div>
    },
    {
      accessorKey: 'city',
      header: 'City'
    },
    {
      accessorKey: 'vehicleType',
      header: 'Type',
      cell: ({ row }) => {
        return row.original.vehicleType || 'N/A';
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        return (
          <div className="flex flex-col gap-1">
            <StatusBadge status={row.original.status} />
            <LockStatusBadge lockInfo={row.original.lockInfo} />
            <DownloadStatusBadge isDownloaded={!!row.original.isDownloaded} />
            {row.original.isAgeDiscounted && (
              <span className="text-xs font-medium text-green-600">Age Discounted</span>
            )}
          </div>
        );
      }
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => {
        const price = getPrice(row.original, ageDiscountSettings);
        return (
          <div className={`font-medium text-right ${row.original.isAgeDiscounted ? 'text-green-600' : ''}`}>
            {price}
            {row.original.isAgeDiscounted && (
              <div className="text-xs">
                ({ageDiscountSettings?.discountPercentage || 0}% off)
              </div>
            )}
          </div>
        );
      }
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-2 justify-end">
          {showActions ? (
            <>
              <ApplicationActions
                application={row.original}
                onViewDetails={onViewDetails}
                onLock={onLock}
                onUnlock={onUnlock}
                onDownload={onDownload}
                processingId={processingId}
                lockOptions={lockOptions}
              />
              {onHideApplication && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onHideApplication(row.original.applicationId)}
                  title={isHiddenView ? "Unhide application" : "Hide application"}
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              )}
            </>
          ) : (
            <>
              {onHideApplication && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onHideApplication(row.original.applicationId)}
                  title={isHiddenView ? "Unhide application" : "Hide application"}
                  className="flex items-center gap-1"
                >
                  {isHiddenView ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                  <span className="sr-only">{isHiddenView ? "Unhide" : "Hide"}</span>
                  {isHiddenView && <span className="text-xs">Unhide</span>}
                </Button>
              )}
              <Button
                onClick={() => onViewDetails(row.original)}
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <Eye className="h-4 w-4" />
                <span className="text-xs">View Details</span>
              </Button>
              {onPurchase && !row.original.isDownloaded && (
                <Button
                  onClick={() => onPurchase(row.original.applicationId)}
                  variant="default"
                  size="sm"
                  className="bg-ontario-blue hover:bg-ontario-blue/90"
                  disabled={processingId === row.original.applicationId}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Purchase
                </Button>
              )}
            </>
          )}
        </div>
      )
    },
  ];

  return (
    <div className="border rounded-md">
      <div className="text-sm text-gray-500 p-2">
        <SelectionHeader 
          allSelected={allSelected} 
          someSelected={someSelected} 
          onSelectAll={selectAll} 
        />
      </div>
      <SortableTable
        data={currentApplications}
        columns={columns}
        isLoading={isLoading}
        noDataMessage="No applications available"
      />
      
      {totalPages > 1 && (
        <div className="py-4 border-t">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                  className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                />
              </PaginationItem>
              
              {currentPage > 2 && (
                <PaginationItem>
                  <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
                </PaginationItem>
              )}
              
              {currentPage > 3 && (
                <PaginationItem>
                  <span className="flex h-9 w-9 items-center justify-center">...</span>
                </PaginationItem>
              )}
              
              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationLink onClick={() => handlePageChange(currentPage - 1)}>
                    {currentPage - 1}
                  </PaginationLink>
                </PaginationItem>
              )}
              
              <PaginationItem>
                <PaginationLink isActive onClick={() => handlePageChange(currentPage)}>
                  {currentPage}
                </PaginationLink>
              </PaginationItem>
              
              {currentPage < totalPages && (
                <PaginationItem>
                  <PaginationLink onClick={() => handlePageChange(currentPage + 1)}>
                    {currentPage + 1}
                  </PaginationLink>
                </PaginationItem>
              )}
              
              {currentPage < totalPages - 2 && (
                <PaginationItem>
                  <span className="flex h-9 w-9 items-center justify-center">...</span>
                </PaginationItem>
              )}
              
              {currentPage < totalPages - 1 && (
                <PaginationItem>
                  <PaginationLink onClick={() => handlePageChange(totalPages)}>
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              )}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                  className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          <div className="text-center text-sm text-gray-500 mt-2">
            Page {currentPage} of {totalPages} • Showing {startIndex + 1}-{endIndex} of {applications.length} applications
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationTable;
