
import React from 'react';
import { Button } from "@/components/ui/button";
import { Table } from "@tanstack/react-table";
import { ApplicationItem } from '@/lib/types/dealer-dashboard';

interface PaginationProps {
  table: Table<ApplicationItem>;
  selectedApplications: string[];
}

export const ApplicationTablePagination = ({ table, selectedApplications }: PaginationProps) => {
  return (
    <div className="flex items-center justify-end space-x-2 py-4">
      <div className="flex-1 text-sm text-muted-foreground">
        {selectedApplications.length > 0 && (
          <span>
            {selectedApplications.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
          </span>
        )}
      </div>
      <div className="space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
