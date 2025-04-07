
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateFilename } from './formatUtils';
import { SupabaseCSVResponse } from './types';

// Download as CSV directly from Supabase
export const downloadFullCsv = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📊 Generating full CSV directly from Supabase for applications:', applicationIds);
    
    if (!applicationIds.length) {
      console.error('❌ No application IDs provided for full CSV generation');
      toast.error('No applications selected for download.');
      return;
    }
    
    // Create a comma-separated string of UUIDs in single quotes
    const idList = applicationIds.map(id => `'${id}'`).join(',');
    
    // Query to get all applications data in CSV format directly from Supabase
    // Use the correct generic type syntax for rpc
    const { data, error } = await supabase.rpc<string>('export_applications_as_csv', {
      p_application_ids: applicationIds
    });
    
    if (error) {
      console.error('❌ Supabase CSV export error:', error);
      toast.error('Failed to generate full CSV export.');
      return;
    }
    
    if (!data) {
      console.error('❌ No CSV data returned from Supabase');
      toast.error('No data found for CSV export.');
      return;
    }
    
    // Create blob from the returned CSV string
    // Fix: Explicitly cast data to string before creating the Blob
    const blob = new Blob([data as string], { type: 'text/csv;charset=utf-8;' });
    
    // Generate filename - use a different approach since we don't have ApplicationData
    const fileName = applicationIds.length === 1 
      ? `full_${applicationIds[0]}.csv`
      : `full_applications_${new Date().getTime()}.csv`;
    
    // Save the file
    saveAs(blob, fileName);
    console.log('✅ Full CSV generated successfully via Supabase');
    toast.success('Full CSV downloaded successfully');
    
  } catch (error) {
    console.error('❌ Error generating full CSV:', error);
    toast.error('Error generating full CSV');
  }
};
