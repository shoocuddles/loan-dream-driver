
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SortableTable, ColumnDef } from "@/components/ui/sortable-table";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { isValid, parseISO, format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DealerPurchase {
  id: string;
  dealerName: string;
  dealerEmail: string;
  dealerId: string;
  clientName: string;
  vehicleType: string;
  purchaseDate: string;
  paymentAmount: number;
  status: string;
}

interface DealerInfo {
  id: string;
  name: string;
  email: string;
}

const DealerPurchases = () => {
  const [purchases, setPurchases] = useState<DealerPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dealers, setDealers] = useState<DealerInfo[]>([]);
  const [selectedDealers, setSelectedDealers] = useState<string[]>([]);
  const [openDealer, setOpenDealer] = useState(false);

  useEffect(() => {
    fetchDealers();
    fetchDealerPurchases();
  }, []);
  
  useEffect(() => {
    fetchDealerPurchases(selectedDealers);
  }, [selectedDealers]);

  const fetchDealers = async () => {
    try {
      const { data: dealersData, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .eq('role', 'dealer');
      
      if (error) throw error;
      
      const formattedDealers: DealerInfo[] = dealersData.map(dealer => ({
        id: dealer.id,
        name: dealer.full_name || 'Unknown Dealer',
        email: dealer.email || ''
      }));
      
      setDealers(formattedDealers);
    } catch (error: any) {
      console.error('Error fetching dealers:', error.message);
      toast.error('Failed to load dealers');
    }
  };

  const fetchDealerPurchases = async (dealerIds: string[] = []) => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('application_downloads')
        .select(`
          id,
          downloaded_at,
          payment_amount,
          dealer_id,
          application_id,
          user_profiles(id, full_name, email),
          applications(fullname, vehicletype, status)
        `)
        .order('downloaded_at', { ascending: false });
      
      // Filter by selected dealers if any are selected
      if (dealerIds.length > 0) {
        query = query.in('dealer_id', dealerIds);
      }
      
      const { data: downloadsData, error: downloadsError } = await query;
      
      if (downloadsError) {
        console.error('Error fetching dealer purchases:', downloadsError.message);
        throw downloadsError;
      }
      
      console.log('Downloaded data:', downloadsData);
      
      // Transform the data format
      const formattedData: DealerPurchase[] = downloadsData.map(item => ({
        id: item.id,
        dealerId: item.dealer_id,
        dealerName: item.user_profiles?.[0]?.full_name || 'Unknown Dealer',
        dealerEmail: item.user_profiles?.[0]?.email || 'N/A',
        clientName: item.applications?.[0]?.fullname || 'Unknown Client',
        vehicleType: item.applications?.[0]?.vehicletype || 'N/A',
        purchaseDate: item.downloaded_at,
        paymentAmount: item.payment_amount || 0,
        status: item.applications?.[0]?.status || 'N/A'
      }));
      
      setPurchases(formattedData);
      
    } catch (error: any) {
      console.error('Error fetching dealer purchases:', error.message);
      toast.error('Failed to load dealer purchases');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDealerSelectionChange = (selectedValues: string[]) => {
    setSelectedDealers(selectedValues);
  };

  const toggleDealerSelection = (dealerId: string) => {
    setSelectedDealers(current => 
      current.includes(dealerId)
        ? current.filter(id => id !== dealerId)
        : [...current, dealerId]
    );
  };

  // Helper function to safely format dates
  const safeFormatDate = (dateString: string) => {
    try {
      // First check if the string is valid
      if (!dateString) return 'N/A';
      
      // Parse the ISO string to a Date object
      const date = parseISO(dateString);
      
      // Check if the date is valid before formatting
      if (!isValid(date)) return 'Invalid date';
      
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid date';
    }
  };

  const columns: ColumnDef<DealerPurchase>[] = [
    {
      accessorKey: 'dealerName',
      header: 'Dealer',
      cell: ({ row }) => {
        const dealerName = row.original.dealerName;
        const dealerEmail = row.original.dealerEmail;
        return (
          <div className="font-medium">
            <div>{dealerName}</div>
            <div className="text-xs text-gray-500">{dealerEmail}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'clientName',
      header: 'Client Name',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.clientName}</div>
      ),
    },
    {
      accessorKey: 'vehicleType',
      header: 'Vehicle Type',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        let badgeVariant = "outline";
        const status = row.original.status;
        
        switch (status.toLowerCase()) {
          case 'submitted':
            badgeVariant = "default";
            break;
          case 'approved':
            badgeVariant = "success";
            break;
          case 'rejected':
            badgeVariant = "destructive";
            break;
          default:
            badgeVariant = "secondary";
        }
        
        return (
          <Badge variant={badgeVariant as any}>{status}</Badge>
        );
      },
    },
    {
      accessorKey: 'purchaseDate',
      header: 'Purchase Date',
      cell: ({ row }) => {
        return safeFormatDate(row.original.purchaseDate);
      },
    },
    {
      accessorKey: 'paymentAmount',
      header: 'Payment Amount',
      cell: ({ row }) => {
        const amount = row.original.paymentAmount;
        return (
          <div>${amount.toFixed(2)}</div>
        );
      },
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Dealer Purchases</CardTitle>
        <div className="flex items-center space-x-2">
          <Popover open={openDealer} onOpenChange={setOpenDealer}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openDealer}
                className="min-w-[200px] justify-between"
              >
                {selectedDealers.length > 0
                  ? `${selectedDealers.length} dealer${selectedDealers.length > 1 ? 's' : ''} selected`
                  : "Select dealers..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Search dealers..." />
                <CommandList>
                  <CommandEmpty>No dealers found.</CommandEmpty>
                  <CommandGroup>
                    {dealers.map((dealer) => (
                      <CommandItem
                        key={dealer.id}
                        value={dealer.id}
                        onSelect={() => toggleDealerSelection(dealer.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedDealers.includes(dealer.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div>
                          <p>{dealer.name}</p>
                          <p className="text-xs text-gray-500">{dealer.email}</p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
                <div className="border-t p-2 flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDealers([])}
                  >
                    Clear
                  </Button>
                  {selectedDealers.length === 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDealers(dealers.map(d => d.id))}
                    >
                      Select All
                    </Button>
                  )}
                </div>
              </Command>
            </PopoverContent>
          </Popover>

          <Button 
            variant="outline" 
            onClick={() => fetchDealerPurchases(selectedDealers)}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <SortableTable
          data={purchases}
          columns={columns}
          isLoading={isLoading}
          noDataMessage="No dealer purchases found"
        />
      </CardContent>
    </Card>
  );
};

export default DealerPurchases;
