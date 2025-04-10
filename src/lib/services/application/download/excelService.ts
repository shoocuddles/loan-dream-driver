
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { generateFilename } from './formatUtils';
import { fetchFullApplicationDetails } from './fetchService';
import { ApplicationData } from './types';

// Download as Excel
export const downloadAsExcel = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📊 Generating Excel for applications:', applicationIds);
    
    const applications = await fetchFullApplicationDetails(applicationIds);
    if (!applications.length) {
      console.error('❌ No application data found for Excel generation');
      toast.error('No application data found. Please try downloading again.');
      return;
    }
    
    // Log the raw application data received from Supabase
    console.log('Raw application data for Excel:', applications[0]);
    
    // Process the applications for Excel format
    const formattedData = applications.map(app => {
      // Create a processed object with all fields
      const processedApp: Record<string, any> = {};
      
      // Add all fields from the application
      Object.keys(app).forEach(key => {
        let value = app[key];
        
        // Format boolean values
        if (typeof value === 'boolean') {
          value = value ? 'Yes' : 'No';
        }
        
        // Format date values
        if ((key === 'created_at' || key === 'updated_at' || key === 'downloadDate' || 
            key === 'downloaded_at') && value) {
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              value = date.toLocaleDateString('en-CA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
            }
          } catch (e) {
            console.error(`Error formatting date for ${key}:`, e);
          }
        }
        
        // Format the key for display (snake_case to Title Case)
        const displayKey = key
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        processedApp[displayKey] = value !== null && value !== undefined ? value : 'N/A';
      });
      
      return processedApp;
    });
    
    console.log('Formatted data for Excel (first few fields):', 
      Object.entries(formattedData[0]).slice(0, 5).map(([k, v]) => `${k}: ${v}`));
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Use the json_to_sheet function to convert the data
    const ws = XLSX.utils.json_to_sheet(formattedData);
    
    // Set column widths
    const colWidths = Object.keys(formattedData[0]).map(() => ({ wch: 20 }));
    ws['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Applications');
    
    // Generate Excel file
    const fileName = applications.length === 1 
      ? generateFilename(applications[0], 'xlsx')
      : `applications_${new Date().getTime()}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    console.log('✅ Excel file generated successfully');
    toast.success('Excel file downloaded successfully');
  } catch (error) {
    console.error('❌ Error generating Excel file:', error);
    toast.error(`Error generating Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
