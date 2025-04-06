
import React, { useState } from 'react';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableFooter, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, ChevronDown, Filter } from 'lucide-react';

export interface ColumnDef<T> {
  accessorKey: keyof T | string;
  header: string;
  cell?: (info: { row: { original: T, getValue: (key: string) => any } }) => React.ReactNode;
  enableSorting?: boolean;
  enableFiltering?: boolean;
}

interface SortableTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  noDataMessage?: string;
}

export function SortableTable<T>({
  data,
  columns,
  isLoading = false,
  noDataMessage = "No data available"
}: SortableTableProps<T>) {
  const [sorting, setSorting] = useState<{
    column: string | null;
    direction: 'asc' | 'desc';
  }>({
    column: null,
    direction: 'asc',
  });
  
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [visibleFilters, setVisibleFilters] = useState<string[]>([]);

  // Toggle filter visibility for a column
  const toggleFilter = (columnKey: string) => {
    if (visibleFilters.includes(columnKey)) {
      setVisibleFilters(visibleFilters.filter(key => key !== columnKey));
    } else {
      setVisibleFilters([...visibleFilters, columnKey]);
    }
  };

  // Handle sort toggle
  const toggleSort = (column: string) => {
    if (sorting.column === column) {
      // Toggle direction if already sorting by this column
      setSorting({
        column,
        direction: sorting.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      // Set new sort column with default asc direction
      setSorting({
        column,
        direction: 'asc',
      });
    }
  };

  // Update filter for a column
  const handleFilterChange = (columnKey: string, value: string) => {
    setFilters({
      ...filters,
      [columnKey]: value,
    });
  };

  // Filter and sort data
  const filteredAndSortedData = React.useMemo(() => {
    // First apply filters
    let result = [...data];
    
    Object.entries(filters).forEach(([key, filterValue]) => {
      if (filterValue) {
        result = result.filter(item => {
          const value = String(item[key as keyof typeof item] || '').toLowerCase();
          return value.includes(filterValue.toLowerCase());
        });
      }
    });

    // Then apply sorting
    if (sorting.column) {
      result.sort((a, b) => {
        const aValue = a[sorting.column as keyof typeof a];
        const bValue = b[sorting.column as keyof typeof b];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sorting.direction === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        }
        
        if (aValue === bValue) return 0;
        
        if (sorting.direction === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }
    
    return result;
  }, [data, filters, sorting]);

  // Create enhanced row objects that include the original data and getValue function
  const enhancedRows = filteredAndSortedData.map(rowData => ({
    original: rowData,
    getValue: (key: string) => rowData[key as keyof typeof rowData]
  }));

  return (
    <div className="w-full">
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={String(column.accessorKey)} className="font-medium text-gray-900">
                  <div className="flex items-center space-x-1">
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-1">
                        {column.enableSorting !== false && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-8 hover:bg-gray-100"
                            onClick={() => toggleSort(String(column.accessorKey))}
                          >
                            {column.header}
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        )}
                        
                        {!column.enableSorting && <span>{column.header}</span>}
                        
                        {column.enableFiltering !== false && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 hover:bg-gray-100"
                              >
                                <Filter className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => toggleFilter(String(column.accessorKey))}
                              >
                                {visibleFilters.includes(String(column.accessorKey)) 
                                  ? "Hide filter" 
                                  : "Show filter"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      {visibleFilters.includes(String(column.accessorKey)) && (
                        <Input
                          placeholder={`Filter ${column.header}...`}
                          value={filters[String(column.accessorKey)] || ''}
                          onChange={(e) => 
                            handleFilterChange(String(column.accessorKey), e.target.value)
                          }
                          className="mt-1 h-8 text-sm"
                        />
                      )}
                    </div>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-ontario-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading data...
                  </div>
                </TableCell>
              </TableRow>
            ) : enhancedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  {noDataMessage}
                </TableCell>
              </TableRow>
            ) : (
              enhancedRows.map((row, rowIndex) => (
                <TableRow key={rowIndex} className="border-b hover:bg-gray-50">
                  {columns.map((column) => (
                    <TableCell key={String(column.accessorKey)}>
                      {column.cell
                        ? column.cell({ row })
                        : String(row.getValue(String(column.accessorKey)) || '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="mt-2 text-sm text-gray-500">
        Showing {enhancedRows.length} of {data.length} records
      </div>
    </div>
  );
}
