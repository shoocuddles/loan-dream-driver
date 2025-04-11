import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from "@/components/ui/button";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApplicationItem, LockType } from '@/lib/types/dealer-dashboard';
import { StatusBadge, LockStatusBadge } from './StatusBadge';
import { getPrice } from './priceUtils';
import { AgeDiscountSettings } from './priceUtils';
import { safeFormatDate } from './dateUtils';
import { EyeOff } from 'lucide-react';

interface CreateColumnsProps {
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

export const createColumns = ({
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
}: CreateColumnsProps): ColumnDef<ApplicationItem>[] => {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
          }
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value);
            selectAll(!!value);
          }}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedApplications.includes(row.original.applicationId)}
          onCheckedChange={(value) => {
            toggleApplicationSelection(row.original.applicationId);
            row.toggleSelected(!!value);
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
      accessorKey: "vehicleType",
      header: "Vehicle Type",
      cell: ({ row }) => (
        <div>{row.original.vehicleType || 'N/A'}</div>
      ),
    },
    {
      accessorKey: "submissionDate",
      header: "Submission Date",
      cell: ({ row }) => (
        <div>{safeFormatDate(row.original.submissionDate)}</div>
      ),
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
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => {
        const application = row.original;
        const price = getPrice(application, ageDiscountSettings);
        
        let isDiscounted = false;
        let discountReason = "";
        
        if (application.isPurchased) {
          return (
            <div className="font-medium text-right">
              Free
            </div>
          );
        }
        
        if (application.isAgeDiscounted) {
          isDiscounted = true;
          discountReason = "Age";
        } else if (application.lockInfo?.isLocked && !application.lockInfo?.isOwnLock) {
          isDiscounted = true;
          discountReason = "Prev Lock";
        }
        
        return (
          <div className={`font-medium text-right ${isDiscounted ? 'text-green-600 font-bold' : ''}`}>
            {price}
            {isDiscounted && (
              <div className="text-xs text-green-500">
                Discounted - {discountReason}
              </div>
            )}
          </div>
        );
      },
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
};
