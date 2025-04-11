import { useState } from 'react';
import {
  ColumnDef,
  SortingState,
  VisibilityState,
  ColumnFiltersState,
  PaginationState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import { StatusBadge, LockStatusBadge, DownloadStatusBadge } from './StatusBadge';
import { Checkbox } from "@/components/ui/checkbox"
import { ApplicationItem } from '@/lib/types/dealer-dashboard';
import { LockType } from '@/lib/types/dealer-dashboard';
import { AgeDiscountSettings, getPrice } from './priceUtils';

interface ApplicationTableProps {
  applications: ApplicationItem[];
  isLoading: boolean;
  selectedApplications: string[];
  toggleApplicationSelection: (applicationId: string) => void;
  selectAll: (select: boolean) => void;
  onLock: (applicationId: string, lockType: LockType) => Promise<void>;
  onUnlock: (applicationId: string) => Promise<void>;
  onDownload: (applicationId: string) => Promise<void>;
  onViewDetails: (application: ApplicationItem) => void;
  onHideApplication: (applicationId: string) => void;
  onPurchase: (applicationId: string) => void;
  processingId: string | null;
  lockOptions: { id: number, name: string, type: LockType, fee: number }[];
  ageDiscountSettings: AgeDiscountSettings;
  showActions: boolean;
  isHiddenView: boolean;
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
  showActions,
  isHiddenView
}: ApplicationTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const columns: ColumnDef<ApplicationItem>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
          }
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value)
            selectAll(!!value)
          }}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedApplications.includes(row.original.applicationId)}
          onCheckedChange={(value) => {
            toggleApplicationSelection(row.original.applicationId)
            row.toggleSelected(!!value)
          }}
          aria-label="Select row"
          className="translate-y-[2px]"
          disabled={row.original.lockInfo?.isLocked && !row.original.lockInfo?.isOwnLock}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "fullName",
      header: "Full Name",
    },
    {
      accessorKey: "city",
      header: "City",
    },
    {
      accessorKey: "submissionDate",
      header: "Submission Date",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} />
      ),
    },
    {
      accessorKey: "lockInfo",
      header: "Lock Status",
      cell: ({ row }) => (
        <LockStatusBadge lockInfo={row.original.lockInfo} />
      ),
    },
    {
      accessorKey: "isDownloaded",
      header: "Download Status",
      cell: ({ row }) => (
        <DownloadStatusBadge isDownloaded={row.original.isDownloaded} />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const application = row.original;
        return (
          <div className="flex items-center space-x-2">
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <DotsHorizontalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onLock(application.applicationId, 'temporary')}
                    disabled={processingId === application.applicationId || application.lockInfo?.isLocked}
                  >
                    {application.lockInfo?.isLocked ? "Unlock" : "Lock (2 min)"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUnlock(application.applicationId)}
                    disabled={processingId === application.applicationId || !application.lockInfo?.isLocked}
                  >
                    Unlock
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownload(application.applicationId)}
                    disabled={processingId === application.applicationId || (application.lockInfo?.isLocked && !application.lockInfo?.isOwnLock)}
                  >
                    Download
                  </Button>
                  {!isHiddenView && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onHideApplication(application.applicationId)}
                    >
                      Hide
                    </Button>
                  )}
                  {isHiddenView && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onHideApplication(application.applicationId)}
                    >
                      Unhide
                    </Button>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {!showActions && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(application)}
                >
                  View Details
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => onPurchase(application.applicationId)}
                  disabled={processingId === application.applicationId || (application.lockInfo?.isLocked && !application.lockInfo?.isOwnLock)}
                >
                  {application.lockInfo?.isLocked && !application.lockInfo?.isOwnLock ? "Locked" : application.isPurchased ? "Download" : "Purchase"}
                </Button>
              </div>
            )}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];

  const table = useReactTable({
    data: applications,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination,
    },
  })

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter applications..."
          value={(table.getColumn("fullName")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("fullName")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <span className="ml-2 opacity-70">
                {table.getVisibleColumns().length}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[150px]">
            {table
              .getAllColumns()
              .filter(
                (column) => column.getCanHide()
              )
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="w-[200px]">
                      {header.isPlaceholder
                        ? null
                        : (
                          <div
                            {...{
                              className: "flex cursor-pointer select-none items-center justify-between",
                              onClick: header.column.getCanSort() ? () => {
                                header.column.toggleSorting(header.column.getIsSorted() === "asc")
                              } : undefined,
                            }}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {{
                              asc:
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-4 w-4"
                                >
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                </svg>,
                              desc:
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-4 w-4"
                                >
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path d="M5 12l-2 2 9 9 2-2L5 12z" />
                                  <path
