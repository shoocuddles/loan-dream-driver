
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ApplicationItem, LockType } from '@/lib/types/dealer-dashboard';
import { SortableTable, ColumnDef } from '@/components/ui/sortable-table';
import { StatusBadge, LockStatusBadge, DownloadStatusBadge } from './StatusBadge';
import { ApplicationActions } from './ApplicationActions';
import { safeFormatDate } from './dateUtils';
import { getPrice } from './priceUtils';
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
  const allSelected = applications.length > 0 && selectedApplications.length === applications.length;
  const someSelected = selectedApplications.length > 0 && !allSelected;

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
      cell: ({ row }) => row.original.vehicleType || 'N/A'
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={row.original.status} />
          <LockStatusBadge lockInfo={row.original.lockInfo} />
          <DownloadStatusBadge isDownloaded={!!row.original.isDownloaded} />
        </div>
      )
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => (
        <div className="font-medium text-right">{getPrice(row.original)}</div>
      )
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
