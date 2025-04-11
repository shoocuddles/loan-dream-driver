
import React from 'react';
import { Button } from "@/components/ui/button";
import { Table } from "@tanstack/react-table";
import { ApplicationItem } from '@/lib/types/dealer-dashboard';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginationProps {
  table: Table<ApplicationItem>;
  selectedApplications: string[];
}

export const ApplicationTablePagination = ({ table, selectedApplications }: PaginationProps) => {
  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;

  // Generate array of page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (pageCount <= maxVisiblePages) {
      // Show all pages if there are less than or equal to maxVisiblePages
      for (let i = 1; i <= pageCount; i++) {
        pages.push(i);
      }
    } else {
      // Always include first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis-start');
      }
      
      // Pages around current page
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(pageCount - 1, currentPage + 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (currentPage < pageCount - 2) {
        pages.push('ellipsis-end');
      }
      
      // Always include last page
      if (pageCount > 1) {
        pages.push(pageCount);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-2">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Rows per page
        </p>
        <Select
          value={table.getState().pagination.pageSize.toString()}
          onValueChange={(value) => {
            table.setPageSize(Number(value));
          }}
        >
          <SelectTrigger className="w-16 h-8">
            <SelectValue placeholder={table.getState().pagination.pageSize.toString()} />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <SelectItem key={pageSize} value={pageSize.toString()}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex-1 text-sm text-muted-foreground text-center sm:text-left">
        {selectedApplications.length > 0 && (
          <span>
            {selectedApplications.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
          </span>
        )}
      </div>
      
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => table.previousPage()} 
              className={!table.getCanPreviousPage() ? "pointer-events-none opacity-50" : ""}
              aria-disabled={!table.getCanPreviousPage()}
            />
          </PaginationItem>
          
          {getPageNumbers().map((page, index) => {
            if (page === 'ellipsis-start' || page === 'ellipsis-end') {
              return (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }
            
            return (
              <PaginationItem key={index}>
                <PaginationLink 
                  isActive={currentPage === page}
                  onClick={() => table.setPageIndex(Number(page) - 1)}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => table.nextPage()} 
              className={!table.getCanNextPage() ? "pointer-events-none opacity-50" : ""}
              aria-disabled={!table.getCanNextPage()}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};
