import { useState, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { format, isValid, parseISO } from 'date-fns';
import { Eye, Search } from 'lucide-react';
import { DownloadedApplication } from '@/lib/types/dealer-dashboard';
import DownloadOptions from './application-table/DownloadOptions';

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
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  
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

  const toggleApplicationSelection = (applicationId: string) => {
    setSelectedApplications(prev => 
      prev.includes(applicationId)
        ? prev.filter(id => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const scrollToTop = () => {
    if (cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleBulkDownload = () => {
    if (selectedApplications.length === 0) return;
    // Let the DownloadOptions component handle the download
  };

  return (
    <Card ref={cardRef}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold">Downloaded Applications</CardTitle>
        <div className="flex items-center gap-4">
          {selectedApplications.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {selectedApplications.length} selected
              </span>
              <DownloadOptions
                applicationIds={selectedApplications}
                isProcessing={false}
                label="Download Selected"
                size="sm"
                variant="outline"
                onClose={() => setSelectedApplications([])}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedApplications([])}
              >
                Clear
              </Button>
            </div>
          )}
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
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedApplications(filteredApplications.map(app => app.applicationId));
                      } else {
                        setSelectedApplications([]);
                      }
                    }}
                    className="w-4 h-4"
                  />
                </TableHead>
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
                  <TableCell colSpan={7} className="text-center py-8">
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
                  <TableCell colSpan={7} className="text-center py-8">
                    {searchTerm ? 'No applications match your search' : 'No downloaded applications yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredApplications.map((application) => (
                  <TableRow key={application.downloadId}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedApplications.includes(application.applicationId)}
                        onChange={() => toggleApplicationSelection(application.applicationId)}
                        className="w-4 h-4"
                      />
                    </TableCell>
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
                        <DownloadOptions 
                          applicationIds={[application.applicationId]}
                          isProcessing={false}
                          variant="ghost"
                          size="icon"
                        />
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
