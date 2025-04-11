
import { useState } from 'react';
import {
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
} from "@/components/ui/table";
import { ApplicationItem, LockType } from '@/lib/types/dealer-dashboard';
import { AgeDiscountSettings } from './priceUtils';
import { createColumns } from './ApplicationTableColumns';
import { ApplicationTableFilters } from './ApplicationTableFilters';
import { ApplicationTablePagination } from './ApplicationTablePagination';
import { EmptyOrLoadingState } from './EmptyOrLoadingState';

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
  onHideApplication: (applicationId: string) => Promise<void>;
  onPurchase: (applicationId: string) => Promise<void>;
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
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = createColumns({
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
  });

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
  });

  return (
    <div className="w-full">
      <ApplicationTableFilters table={table} />
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
                            className="flex cursor-pointer select-none items-center justify-between"
                            onClick={header.column.getCanSort() ? () => {
                              header.column.toggleSorting(header.column.getIsSorted() === "asc");
                            } : undefined}
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
                                </svg>
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <EmptyOrLoadingState isLoading={isLoading} colSpan={columns.length} />
            )}
          </TableBody>
        </Table>
      </div>
      <ApplicationTablePagination table={table} selectedApplications={selectedApplications} />
    </div>
  );
};

export default ApplicationTable;
