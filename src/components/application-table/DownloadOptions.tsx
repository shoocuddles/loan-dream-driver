
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FileDown, FileSpreadsheet, FileText, Table } from 'lucide-react';
import { downloadAsPDF, downloadAsCSV, downloadAsExcel } from '@/lib/services/application/downloadService';
import { toast } from 'sonner';

interface DownloadOptionsProps {
  applicationIds: string[];
  isProcessing: boolean;
  onClose?: () => void;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string; 
}

const DownloadOptions = ({
  applicationIds,
  isProcessing,
  onClose,
  label = "Download",
  variant = "default",
  size = "default",
  className
}: DownloadOptionsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [downloadType, setDownloadType] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const handleDownload = async (type: string) => {
    if (isProcessing || !applicationIds.length || isDownloading) return;
    
    setDownloadType(type);
    setIsDownloading(true);
    setIsOpen(false);
    if (onClose) onClose();
    
    try {
      toast.info(`Preparing ${type} download...`);
      
      switch (type) {
        case 'PDF':
          await downloadAsPDF(applicationIds);
          break;
        case 'CSV':
          await downloadAsCSV(applicationIds);
          break;
        case 'Excel':
          await downloadAsExcel(applicationIds);
          break;
        default:
          throw new Error(`Unsupported download type: ${type}`);
      }
    } catch (error) {
      console.error(`Error downloading ${type}:`, error);
      toast.error(`Failed to download ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDownloadType(null);
      setIsDownloading(false);
    }
  };
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant={variant}
          size={size}
          disabled={isProcessing || !applicationIds.length || isDownloading}
          className={className}
        >
          <FileDown className={size === "icon" ? "h-4 w-4" : "h-4 w-4 mr-2"} />
          {size !== "icon" && (isDownloading ? "Downloading..." : label)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2">
        <div className="flex flex-col space-y-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="justify-start" 
            onClick={() => handleDownload('PDF')}
            disabled={downloadType !== null || isDownloading}
          >
            <FileText className="h-4 w-4 mr-2" />
            Download as PDF
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="justify-start" 
            onClick={() => handleDownload('CSV')}
            disabled={downloadType !== null || isDownloading}
          >
            <Table className="h-4 w-4 mr-2" />
            Download as CSV
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="justify-start" 
            onClick={() => handleDownload('Excel')}
            disabled={downloadType !== null || isDownloading}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Download as Excel
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DownloadOptions;
