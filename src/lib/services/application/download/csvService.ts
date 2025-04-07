
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Download as CSV using the Supabase export_applications_as_csv function
export const downloadAsCSV = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📊 Generating CSV using Supabase export function for applications:', applicationIds);
    
    if (!applicationIds.length) {
      console.error('❌ No application IDs provided for CSV generation');
      toast.error('No applications selected for download.');
      return;
    }
    
    // The Supabase function expects an array of UUIDs, not bigints
    console.log('🔍 Calling Supabase export_applications_as_csv with IDs:', applicationIds);
    
    // Call the Supabase export_applications_as_csv function with UUID array
    const { data, error } = await supabase
      .rpc('export_applications_as_csv', { 
        p_application_ids: applicationIds 
      });
    
    if (error) {
      console.error('❌ Supabase CSV export error:', error);
      toast.error('Error generating CSV');
      return;
    }
    
    if (!data) {
      console.error('❌ No CSV data returned from Supabase');
      toast.error('No data returned from export function');
      return;
    }
    
    console.log('✅ Received CSV data from Supabase function');
    
    // Create blob and save as CSV file
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    
    // Simple filename generation
    const fileName = applicationIds.length === 1 
      ? `application_${applicationIds[0]}.csv`
      : `applications_${new Date().getTime()}.csv`;
    
    saveAs(blob, fileName);
    console.log('✅ CSV file saved successfully using Supabase export function');
    toast.success('CSV downloaded successfully');
  } catch (error) {
    console.error('❌ Error generating CSV:', error);
    toast.error('Error generating CSV');
  }
};
