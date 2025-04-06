
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SortableTable, ColumnDef } from "@/components/ui/sortable-table";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface DealerPurchase {
  id: string;
  dealerName: string;
  dealerEmail: string;
  clientName: string;
  vehicleType: string;
  purchaseDate: string;
  paymentAmount: number;
  status: string;
}

const DealerPurchases = () => {
  const [purchases, setPurchases] = useState<DealerPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDealerPurchases();
  }, []);

  const fetchDealerPurchases = async () => {
    try {
      setIsLoading(true);
      
      // Query all application downloads with dealer and application info
      const { data: downloadsData, error: downloadsError } = await supabase
        .from('application_downloads')
        .select(`
          id,
          downloaded_at,
          payment_amount,
          dealer_id,
          application_id,
          user_profiles!dealer_id(full_name, email),
          applications!application_id(fullname, vehicletype, status)
        `)
        .order('downloaded_at', { ascending: false });
      
      if (downloadsError) {
        throw downloadsError;
      }
      
      // Transform the data format
      const formattedData: DealerPurchase[] = downloadsData.map(item => ({
        id: item.id,
        dealerName: item.user_profiles?.full_name || 'Unknown Dealer',
        dealerEmail: item.user_profiles?.email || 'N/A',
        clientName: item.applications?.fullname || 'Unknown Client',
        vehicleType: item.applications?.vehicletype || 'N/A',
        purchaseDate: new Date(item.downloaded_at).toLocaleString(),
        paymentAmount: item.payment_amount || 0,
        status: item.applications?.status || 'N/A'
      }));
      
      setPurchases(formattedData);
      
    } catch (error: any) {
      console.error('Error fetching dealer purchases:', error.message);
      toast.error('Failed to load dealer purchases');
    } finally {
      setIsLoading(false);
    }
  };

  const columns: ColumnDef<DealerPurchase>[] = [
    {
      accessorKey: 'dealerName',
      header: 'Dealer',
      cell: ({ row }) => (
        <div className="font-medium">
          <div>{row.dealerName}</div>
          <div className="text-xs text-gray-500">{row.dealerEmail}</div>
        </div>
      ),
    },
    {
      accessorKey: 'clientName',
      header: 'Client Name',
      cell: ({ row }) => (
        <div className="font-medium">{row.clientName}</div>
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
        
        switch (row.status.toLowerCase()) {
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
          <Badge variant={badgeVariant as any}>{row.status}</Badge>
        );
      },
    },
    {
      accessorKey: 'purchaseDate',
      header: 'Purchase Date',
    },
    {
      accessorKey: 'paymentAmount',
      header: 'Payment Amount',
      cell: ({ row }) => (
        <div>${row.paymentAmount.toFixed(2)}</div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dealer Purchases</CardTitle>
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
