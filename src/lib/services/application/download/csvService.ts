
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { formatApplicationData, generateFilename } from './formatUtils';
import { fetchFullApplicationDetails } from './fetchService';

// Download as CSV
export const downloadAsCSV = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📊 Generating CSV for applications:', applicationIds);
    
    const applications = await fetchFullApplicationDetails(applicationIds);
    if (!applications.length) {
      console.error('❌ No application data found for CSV generation');
      toast.error('No application data found. Please try downloading again.');
      return;
    }
    
    // Format all applications
    const formattedApplicationsPromises = applications.map(app => formatApplicationData(app));
    const formattedApplications = await Promise.all(formattedApplicationsPromises);
    
    // Create CSV content
    const headers = Object.keys(formattedApplications[0]);
    const csvRows = [
      // Header row
      headers.join(','),
      // Data rows
      ...formattedApplications.map(app => 
        headers.map(header => {
          // Escape commas and quotes
          let value = app[header as keyof typeof app] || '';
          value = String(value).replace(/"/g, '""');
          // Wrap in quotes if contains comma, quote or newline
          return /[",\n\r]/.test(value) ? `"${value}"` : value;
        }).join(',')
      )
    ];
    
    // Create blob and save
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = applications.length === 1 
      ? generateFilename(applications[0], 'csv')
      : `applications_${new Date().getTime()}.csv`;
    
    saveAs(blob, fileName);
    console.log('✅ CSV generated successfully');
    toast.success('CSV downloaded successfully');
  } catch (error) {
    console.error('❌ Error generating CSV:', error);
    toast.error('Error generating CSV');
  }
};
