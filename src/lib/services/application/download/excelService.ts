
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { formatApplicationData, generateFilename } from './formatUtils';
import { fetchFullApplicationDetails } from './fetchService';

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
    
    // Format all applications
    const formattedApplicationsPromises = applications.map(app => formatApplicationData(app));
    const formattedApplications = await Promise.all(formattedApplicationsPromises);
    
    // Log the formatted application data
    console.log('Formatted application data for Excel:', 
      JSON.stringify(formattedApplications[0]).substring(0, 300) + '...');
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formattedApplications);
    
    // Set column widths
    const colWidths = Object.keys(formattedApplications[0]).map(() => ({ wch: 20 }));
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
    toast.error('Error generating Excel file');
  }
};
