import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { format, isValid, parseISO } from 'date-fns';
import { Download, Eye, Search } from 'lucide-react';
import { DownloadedApplication } from '@/lib/types/dealer-dashboard';

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
  onViewDetails
}: DownloadedApplicationsProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredApplications = applications.filter(app => 
    app.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">Downloaded Applications</CardTitle>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search downloaded applications..."
            className="pl-8 pr-4 py-2 w-full border rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Vehicle Type</TableHead>
                <TableHead>Downloaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-ontario-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading downloaded applications...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    {searchTerm ? 'No applications match your search' : 'No downloaded applications yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredApplications.map((application) => (
                  <TableRow key={application.downloadId}>
                    <TableCell>
                      <div className="font-medium">{application.fullName}</div>
                    </TableCell>
                    <TableCell>
                      <div>{application.phoneNumber}</div>
                      <div className="text-sm text-gray-500">{application.email}</div>
                    </TableCell>
                    <TableCell>
                      <div>{application.address}</div>
                      <div className="text-sm">
                        {[application.city, application.province, application.postalCode]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    </TableCell>
                    <TableCell>{application.vehicleType || 'N/A'}</TableCell>
                    <TableCell>{safeFormatDate(application.downloadDate)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewDetails(application)}
                          title="View Full Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDownload(application.applicationId)}
                          title="Download Again"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default DownloadedApplications;
