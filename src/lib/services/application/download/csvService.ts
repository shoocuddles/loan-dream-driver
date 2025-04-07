
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { downloadFullCsv } from './directCsvService';

// Download as CSV using the Supabase export_applications_as_csv function
export const downloadAsCSV = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📊 Generating CSV using Supabase export function for applications:', applicationIds);
    
    if (!applicationIds.length) {
      console.error('❌ No application IDs provided for CSV generation');
      toast.error('No applications selected for download.');
      return;
    }
    
    // Call the Supabase function with UUID array
    const { data, error } = await supabase.rpc(
      'export_applications_as_csv', 
      { 
        p_application_ids: applicationIds 
      }
    );
    
    if (error) {
      console.error('❌ Supabase CSV export error:', error);
      
      // Fall back to direct CSV generation method if Supabase function fails
      console.log('🔀 Falling back to direct CSV generation method');
      await downloadFullCsv(applicationIds);
      return;
    }
    
    if (!data) {
      console.error('❌ No data returned from Supabase CSV export');
      toast.error('Error generating CSV');
      return;
    }
    
    console.log('✅ CSV data received from Supabase');
    
    // Create blob from the CSV data
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    
    // Generate filename based on number of applications
    const fileName = applicationIds.length === 1 
      ? `application_${applicationIds[0]}.csv`
      : `applications_${new Date().getTime()}.csv`;
    
    saveAs(blob, fileName);
    console.log('✅ CSV file saved successfully');
    toast.success('CSV downloaded successfully');
    
  } catch (error) {
    console.error('❌ Error generating CSV:', error);
    toast.error('Error generating CSV');
    
    // Attempt fallback to direct CSV generation
    try {
      console.log('🔀 Attempting fallback to direct CSV generation');
      await downloadFullCsv(applicationIds);
    } catch (fallbackError) {
      console.error('❌ Fallback CSV generation also failed:', fallbackError);
    }
  }
};
