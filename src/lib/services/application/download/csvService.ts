
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
    
    // Since the Supabase function expects bigint IDs but we have UUIDs,
    // let's use our direct CSV generation approach instead
    console.log('🔀 Redirecting to direct CSV generation since we have UUID application IDs');
    await downloadFullCsv(applicationIds);
    
  } catch (error) {
    console.error('❌ Error generating CSV:', error);
    toast.error('Error generating CSV');
  }
};
