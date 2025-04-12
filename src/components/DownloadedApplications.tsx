
import { useState, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { format, isValid, parseISO } from 'date-fns';
import { Search, Lock } from 'lucide-react';
import { DownloadedApplication, LockType } from '@/lib/types/dealer-dashboard';
import DownloadOptions from './application-table/DownloadOptions';
import BulkActionsBar from './BulkActionsBar';
import { createLockExtensionCheckout } from '@/lib/services/lock/lockService';
import { toast } from 'sonner';
import { LockStatusBadge } from './application-table/StatusBadge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DownloadedApplicationsProps {
  applications: DownloadedApplication[];
  isLoading: boolean;
  onDownload: (applicationId: string) => Promise<void>;
  onViewDetails: (application: DownloadedApplication) => void;
}

const DownloadedApplications = ({
  applications,
  isLoading,
  onDownload,
}: DownloadedApplicationsProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const filteredApplications = applications.filter(app => 
    app.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (app.email && app.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (app.city && app.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const safeFormatDate = (dateString: string) => {
    try {
      if (!dateString) return 'N/A';
      
      const date = parseISO(dateString);
      
      if (!isValid(date)) return 'Invalid date';
      
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid date';
    }
  };

  const toggleApplicationSelection = (applicationId: string) => {
    setSelectedApplications(prev => 
      prev.includes(applicationId)
        ? prev.filter(id => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedApplications(filteredApplications.map(app => app.applicationId));
    } else {
      setSelectedApplications([]);
    }
  };

  const scrollToTop = () => {
    if (cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleBulkDownload = async () => {
    // No need to purchase as these applications are already purchased
    console.log(`Bulk downloading ${selectedApplications.length} applications`);
    // The download functionality is handled by the DownloadOptions component
  };

  const handleBulkLock = async (lockType: LockType) => {
    try {
      setIsProcessingPayment(true);
      console.log(`Initiating payment for locking ${selectedApplications.length} applications with lock type: ${lockType}`);
      
      let lockFee = 0;
      switch(lockType) {
        case '24hours':
          lockFee = 4.99;
          break;
        case '1week':
          lockFee = 9.99;
          break;
        case 'permanent':
          lockFee = 29.99;
          break;
        default:
          lockFee = 4.99;
      }
      
      // Get application details for all selected applications
      const appDetails = selectedApplications.map(appId => {
        const app = filteredApplications.find(a => a.applicationId === appId);
        return {
          id: appId,
          fullName: app?.fullName || 'Applicant'
        };
      });
      
      const { error, url } = await createLockExtensionCheckout(
        selectedApplications,
        lockType,
        appDetails
      );
      
      if (error) {
        toast.error(`Payment setup failed: ${error}`);
        setIsProcessingPayment(false);
        return;
      }
      
      if (url) {
        window.location.href = url;
      } else {
        toast.error('Could not create payment session');
        setIsProcessingPayment(false);
      }
    } catch (error) {
      toast.error('Error setting up lock payment');
      console.error('Error during bulk lock payment:', error);
      setIsProcessingPayment(false);
    }
  };

  console.log("Downloaded applications to display:", applications);

  return (
    <Card ref={cardRef}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold">Purchased Applications</CardTitle>
        <div className="flex items-center gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search purchased applications..."
              className="pl-8 pr-4 py-2 w-full border rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <input
                    type="checkbox"
                    checked={selectedApplications.length === filteredApplications.length && filteredApplications.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Vehicle Type</TableHead>
                <TableHead>Downloaded</TableHead>
                <TableHead>
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center cursor-help">
                          Lock Status <Lock className="ml-1 h-3.5 w-3.5 text-gray-500" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>When an application is locked, other dealers cannot purchase it. Locks can be temporary or permanent.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-ontario-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading purchased applications...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    {searchTerm ? 'No applications match your search' : 'No purchased applications yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredApplications.map((application) => (
                  <TableRow key={application.id || application.applicationId}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedApplications.includes(application.applicationId)}
                        onChange={() => toggleApplicationSelection(application.applicationId)}
                        className="w-4 h-4"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{application.fullName || 'Unknown'}</div>
                    </TableCell>
                    <TableCell>
                      <div>{application.phoneNumber || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{application.email || 'N/A'}</div>
                    </TableCell>
                    <TableCell>
                      <div>{application.address || 'N/A'}</div>
                      <div className="text-sm">
                        {[application.city, application.province, application.postalCode]
                          .filter(Boolean)
                          .join(', ') || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{application.vehicleType || 'N/A'}</TableCell>
                    <TableCell>{safeFormatDate(application.downloadDate || application.purchaseDate)}</TableCell>
                    <TableCell>
                      <LockStatusBadge lockInfo={application.lockInfo} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <DownloadOptions 
                          applicationIds={[application.applicationId]}
                          isProcessing={false}
                          variant="success"
                          size="icon"
                          showIcon={true}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <BulkActionsBar
          selectedCount={selectedApplications.length}
          onBulkDownload={handleBulkDownload}
          onBulkLock={handleBulkLock}
          onClearSelection={() => setSelectedApplications([])}
          isProcessing={isProcessingPayment}
          selectedApplicationIds={selectedApplications}
          unpurchasedCount={0}
          totalPurchaseCost={0}
          onPurchaseSelected={() => Promise.resolve()}
          allDownloaded={true}
        />
      </CardContent>
    </Card>
  );
};

export default DownloadedApplications;
