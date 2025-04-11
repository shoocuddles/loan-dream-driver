
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet, FilePieChart } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  downloadAsPDF, 
  downloadAsExcel, 
  downloadAsCSV, 
  downloadRawData 
} from '@/lib/services/application/download';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DownloadOptionsProps {
  applicationIds: string[];
  isProcessing: boolean;
  onClose?: () => void;
  label?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showIcon?: boolean;
  disabled?: boolean;
  className?: string;
}

const DownloadOptions = ({
  applicationIds,
  isProcessing,
  onClose,
  label = 'Download',
  variant = 'default',
  size = 'default',
  showIcon = false,
  disabled = false,
  className
}: DownloadOptionsProps) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (format: 'pdf' | 'excel' | 'csv' | 'raw') => {
    try {
      setIsDownloading(true);
      console.log(`Downloading application(s) as ${format.toUpperCase()}:`, applicationIds);

      switch (format) {
        case 'pdf':
          await downloadAsPDF(applicationIds);
          break;
        case 'excel':
          await downloadAsExcel(applicationIds);
          break;
        case 'csv':
          await downloadAsCSV(applicationIds);
          break;
        case 'raw':
          await downloadRawData(applicationIds);
          break;
      }

      if (onClose) onClose();
    } catch (error: any) {
      console.error(`Error downloading as ${format}:`, error);
      toast.error(`Failed to download as ${format.toUpperCase()}: ${error.message || 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // Use success variant (green) for the download button
  const buttonVariant = variant === 'default' ? 'success' : variant;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={buttonVariant} 
          size={size} 
          disabled={isProcessing || isDownloading || disabled || applicationIds.length === 0}
          className={cn("text-white", className)}
        >
          {showIcon && <Download className={label ? "mr-2 h-4 w-4" : "h-4 w-4"} />}
          {label && label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Download Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => handleDownload('pdf')} disabled={isDownloading}>
            <FileText className="mr-2 h-4 w-4" />
            PDF Document
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownload('excel')} disabled={isDownloading}>
            <FilePieChart className="mr-2 h-4 w-4" />
            Excel Spreadsheet
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownload('csv')} disabled={isDownloading}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            CSV File
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownload('raw')} disabled={isDownloading}>
            <Download className="mr-2 h-4 w-4" />
            Raw Data (JSON)
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DownloadOptions;
