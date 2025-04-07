
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { supabase, rpcCall } from '@/integrations/supabase/client';
import { fetchFullApplicationDetails } from './fetchService';

// Download as CSV directly generating it from application data
export const downloadFullCsv = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📊 Generating full CSV for applications:', applicationIds);
    
    if (!applicationIds.length) {
      console.error('❌ No application IDs provided for CSV generation');
      toast.error('No applications selected for download.');
      return;
    }
    
    // Use rpcCall helper for better debugging
    const { data, error } = await rpcCall('export_applications_as_csv', {
      app_ids: applicationIds
    });

    if (error) {
      console.error('❌ Error from Supabase export_applications_as_csv:', error);
      console.log('⚠️ Falling back to local CSV generation method');
      
      // Fetch the full application details as fallback
      const applications = await fetchFullApplicationDetails(applicationIds);
      
      if (!applications.length) {
        console.error('❌ No application data found for CSV generation');
        toast.error('Could not find application data.');
        return;
      }
      
      console.log(`✅ Fetched ${applications.length} applications for CSV generation`);
      
      // Get column headers (keys from the first application)
      const headers = Object.keys(applications[0]);
      
      // Create CSV content with headers
      let csvContent = headers.join(',') + '\n';
      
      // Add a row for each application
      applications.forEach(app => {
        const row = headers.map(header => {
          const value = app[header];
          // Handle different data types for CSV compatibility
          if (value === null || value === undefined) {
            return '';
          }
          if (typeof value === 'string') {
            // Escape quotes and wrap in quotes if it contains comma or quotes
            const escaped = value.replace(/"/g, '""');
            return escaped.includes(',') || escaped.includes('"') ? `"${escaped}"` : escaped;
          }
          if (typeof value === 'object') {
            // Convert objects to JSON strings
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          return value;
        });
        
        csvContent += row.join(',') + '\n';
      });
      
      // Create blob and save as CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Simple filename generation
      const fileName = applicationIds.length === 1 
        ? `application_${applicationIds[0]}.csv`
        : `applications_${new Date().getTime()}.csv`;
      
      saveAs(blob, fileName);
      console.log('✅ CSV file saved successfully via fallback method');
      toast.success('CSV downloaded successfully (via fallback method)');
      return;
    }
    
    if (!data) {
      console.error('❌ No data returned from export_applications_as_csv function');
      toast.error('Error generating CSV');
      return;
    }
    
    console.log('✅ CSV data received from Supabase via rpcCall:', data.substring(0, 200) + '...');
    
    // Create blob directly from the CSV data
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    
    // Generate filename based on number of applications
    const fileName = applicationIds.length === 1 
      ? `application_${applicationIds[0]}.csv`
      : `applications_${new Date().getTime()}.csv`;
    
    saveAs(blob, fileName);
    console.log('✅ CSV file saved successfully via direct method');
    toast.success('CSV downloaded successfully');
  } catch (error) {
    console.error('❌ Error generating CSV:', error);
    toast.error('Error generating CSV');
  }
};
