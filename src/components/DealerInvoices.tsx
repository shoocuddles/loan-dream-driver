
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { getDealerInvoices } from '@/lib/dealerDashboardService';

interface Invoice {
  id: string;
  created: number;
  total: number;
  currency: string;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  number: string;
  status: string;
  application_ids?: string[];
  description?: string;
  type?: 'purchase' | 'lock_extension';
}

const DealerInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user]);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching invoices for dealer');
      
      const invoicesData = await getDealerInvoices();
      
      if (Array.isArray(invoicesData)) {
        console.log(`Fetched ${invoicesData.length} invoices`);
        setInvoices(invoicesData);
      } else {
        console.error('Invalid response format for invoices:', invoicesData);
        setInvoices([]);
      }
    } catch (error) {
      console.error('Exception fetching invoices:', error);
      toast.error('An unexpected error occurred while loading invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'uncollectible':
        return 'bg-red-100 text-red-800';
      case 'void':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInvoiceTypeDisplay = (invoice: Invoice) => {
    if (invoice.type === 'lock_extension') {
      return (
        <span className="text-sm text-amber-700 font-medium">
          Lock Extension
        </span>
      );
    }
    return (
      <span className="text-sm text-gray-500">
        Application Purchase
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Invoices</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchInvoices}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No invoices found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-ontario-blue text-white">
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Invoice #</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-center">Status</th>
                  <th className="px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{formatDate(invoice.created)}</td>
                    <td className="px-4 py-3">{invoice.number || invoice.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      {getInvoiceTypeDisplay(invoice)}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(invoice.status)}`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center space-x-2">
                        {invoice.invoice_pdf && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => window.open(invoice.invoice_pdf!, '_blank')}
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {invoice.hosted_invoice_url && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
                            title="View in Stripe"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DealerInvoices;
