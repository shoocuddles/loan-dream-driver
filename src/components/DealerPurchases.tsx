
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
          user_profiles(full_name, email),
          applications(fullname, vehicletype, status)
        `)
        .order('downloaded_at', { ascending: false });
      
      if (downloadsError) {
        console.error('Error fetching dealer purchases:', downloadsError.message);
        throw downloadsError;
      }
      
      console.log('Downloaded data:', downloadsData);
      
      // Transform the data format
      const formattedData: DealerPurchase[] = downloadsData.map(item => ({
        id: item.id,
        dealerName: item.user_profiles && item.user_profiles[0] ? item.user_profiles[0].full_name || 'Unknown Dealer' : 'Unknown Dealer',
        dealerEmail: item.user_profiles && item.user_profiles[0] ? item.user_profiles[0].email || 'N/A' : 'N/A',
        clientName: item.applications && item.applications[0] ? item.applications[0].fullname || 'Unknown Client' : 'Unknown Client',
        vehicleType: item.applications && item.applications[0] ? item.applications[0].vehicletype || 'N/A' : 'N/A',
        purchaseDate: new Date(item.downloaded_at).toLocaleString(),
        paymentAmount: item.payment_amount || 0,
        status: item.applications && item.applications[0] ? item.applications[0].status || 'N/A' : 'N/A'
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
