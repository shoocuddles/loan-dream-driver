
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { rpcCall, supabase } from '@/integrations/supabase/client';

// Download as CSV directly from Supabase RPC function with no processing
export const downloadAsCSV = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📊 Requesting CSV directly from Supabase for applications:', applicationIds);
    
    if (!applicationIds.length) {
      console.error('❌ No application IDs provided for CSV generation');
      toast.error('No applications selected for download.');
      return;
    }
    
    // Direct call to Supabase's export_applications_as_csv RPC function
    // Using direct supabase.rpc call to ensure we get the raw response
    const { data, error } = await supabase.rpc(
      'export_applications_as_csv',
      { app_ids: applicationIds }
    );
    
    if (error) {
      console.error('❌ Supabase CSV export error:', error);
      console.error('Error details:', error.details);
      console.error('Error message:', error.message);
      console.error('Error hint:', error.hint);
      toast.error('Error generating CSV');
      return;
    }
    
    if (!data) {
      console.error('❌ No data returned from Supabase CSV export');
      toast.error('Error generating CSV');
      return;
    }

    console.log('✅ CSV data received from Supabase');
    console.log('📊 CSV data length:', data.length);
    console.log('📊 First 100 characters of CSV:', data.substring(0, 100));
    
    // Create a blob directly from the raw data returned by Supabase
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    
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
