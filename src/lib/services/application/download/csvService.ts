
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Download as CSV directly from Supabase RPC function with proper formatting
export const downloadAsCSV = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📊 Requesting CSV directly from Supabase for applications:', applicationIds);
    
    if (!applicationIds.length) {
      console.error('❌ No application IDs provided for CSV generation');
      toast.error('No applications selected for download.');
      return;
    }
    
    // Parameter name should be app_ids which matches the function definition
    // Log exact parameters being sent for debugging
    const params = { app_ids: applicationIds };
    console.log('📊 Sending parameters to export_applications_as_csv:', params);
    
    // Call the RPC function with the proper parameter format
    const { data: csvData, error } = await supabase.rpc('export_applications_as_csv', params);
    
    if (error) {
      console.error('❌ Error from Supabase export_applications_as_csv:', error);
      toast.error(`Error generating CSV: ${error.message}`);
      
      // Don't continue if there's an error with the RPC function
      return;
    }
    
    if (!csvData || typeof csvData !== 'string' || csvData.trim() === '') {
      console.error('❌ No data returned from Supabase CSV export');
      toast.error('Error generating CSV: No data returned');
      return;
    }

    console.log('✅ CSV data received from Supabase');
    console.log('📊 CSV data length:', csvData.length);
    console.log('📊 First 100 characters of CSV:', csvData.substring(0, 100));
    
    // Create blob directly from the CSV text data
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    
    // Generate filename based on number of applications
    const fileName = applicationIds.length === 1 
      ? `application_${applicationIds[0]}.csv`
      : `applications_${new Date().getTime()}.csv`;
    
    // Save the blob directly as a file without any manipulation
    saveAs(blob, fileName);
    console.log('✅ CSV file saved successfully');
    toast.success('CSV downloaded successfully');
    
  } catch (error) {
    console.error('❌ Error during CSV download:', error);
    toast.error('Error generating CSV');
  }
};
