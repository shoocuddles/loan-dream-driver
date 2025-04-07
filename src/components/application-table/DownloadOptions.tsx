
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
}

const DownloadOptions = ({
  applicationIds,
  isProcessing,
  onClose,
  label = "Download",
  variant = "default",
  size = "default"
}: DownloadOptionsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [downloadType, setDownloadType] = useState<string | null>(null);
  
  const handleDownload = async (type: string) => {
    if (isProcessing || !applicationIds.length) return;
    
    setDownloadType(type);
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
      
      toast.success(`${type} downloaded successfully`);
    } catch (error) {
      console.error(`Error downloading ${type}:`, error);
      toast.error(`Failed to download ${type}`);
    } finally {
      setDownloadType(null);
    }
  };
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant={variant}
          size={size}
          disabled={isProcessing || !applicationIds.length}
        >
          <FileDown className={size === "icon" ? "h-4 w-4" : "h-4 w-4 mr-2"} />
          {size !== "icon" && label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2">
        <div className="flex flex-col space-y-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="justify-start" 
            onClick={() => handleDownload('PDF')}
            disabled={downloadType !== null}
          >
            <FileText className="h-4 w-4 mr-2" />
            Download as PDF
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="justify-start" 
            onClick={() => handleDownload('CSV')}
            disabled={downloadType !== null}
          >
            <Table className="h-4 w-4 mr-2" />
            Download as CSV
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="justify-start" 
            onClick={() => handleDownload('Excel')}
            disabled={downloadType !== null}
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
