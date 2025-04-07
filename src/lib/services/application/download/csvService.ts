
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { fetchFullApplicationDetails } from './fetchService';

// Download as CSV with minimal formatting/transformation
export const downloadAsCSV = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📊 Generating CSV for applications with direct data transfer:', applicationIds);
    
    const applications = await fetchFullApplicationDetails(applicationIds);
    if (!applications.length) {
      console.error('❌ No application data found for CSV generation');
      toast.error('No application data found. Please try downloading again.');
      return;
    }
    
    // Log the raw application data from Supabase
    console.log('Raw Supabase data for CSV (first application):');
    console.log(JSON.stringify(applications[0], null, 2));
    
    // Get all unique headers across all applications directly from the data
    const allHeaders = new Set<string>();
    applications.forEach(app => {
      Object.keys(app).forEach(header => allHeaders.add(header));
    });
    
    // Convert to array and sort for consistent output
    const headers = Array.from(allHeaders).sort();
    console.log('🏷️ CSV Headers (direct from Supabase):', headers);
    
    // Create CSV content - direct mapping from Supabase data
    const csvRows = [
      // Header row
      headers.join(','),
      
      // Data rows - minimal transformation, just for CSV format compliance
      ...applications.map(app => 
        headers.map(header => {
          // Get raw value directly from Supabase
          let value = app[header] !== undefined && app[header] !== null 
            ? app[header] 
            : '';
            
          // Convert to string if not already
          value = String(value);
          
          // Only escape quotes for CSV format compliance
          value = value.replace(/"/g, '""');
          
          // Wrap in quotes if it contains comma, quote or newline (CSV format requirement)
          return /[",\n\r]/.test(value) ? `"${value}"` : value;
        }).join(',')
      )
    ];
    
    // Create blob and save
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Simple filename generation
    const fileName = applications.length === 1 
      ? `application_${applications[0].id}.csv`
      : `applications_${new Date().getTime()}.csv`;
    
    saveAs(blob, fileName);
    console.log('✅ CSV generated successfully with direct data transfer');
    toast.success('CSV downloaded successfully');
  } catch (error) {
    console.error('❌ Error generating CSV:', error);
    toast.error('Error generating CSV');
  }
};
