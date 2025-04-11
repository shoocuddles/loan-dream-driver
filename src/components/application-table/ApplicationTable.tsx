
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ApplicationItem, LockType } from '@/lib/types/dealer-dashboard';
import { SortableTable, ColumnDef } from '@/components/ui/sortable-table';
import { StatusBadge, LockStatusBadge, DownloadStatusBadge } from './StatusBadge';
import { ApplicationActions } from './ApplicationActions';
import { safeFormatDate } from './dateUtils';
import { getPrice, AgeDiscountSettings } from './priceUtils';
import { SelectionHeader } from './SelectionHeader';

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
  ageDiscountSettings?: AgeDiscountSettings;
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
  lockOptions,
  ageDiscountSettings
}: ApplicationTableProps) => {
  const allSelected = applications.length > 0 && selectedApplications.length === applications.length;
  const someSelected = selectedApplications.length > 0 && !allSelected;

  // Debug log for applications data
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
        // Process the application to determine if it should be age discounted
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
        <ApplicationActions
          application={row.original}
          onViewDetails={onViewDetails}
          onLock={onLock}
          onUnlock={onUnlock}
          onDownload={onDownload}
          processingId={processingId}
          lockOptions={lockOptions}
        />
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
        data={applications}
        columns={columns}
        isLoading={isLoading}
        noDataMessage="No applications available"
      />
    </div>
  );
};

export default ApplicationTable;
