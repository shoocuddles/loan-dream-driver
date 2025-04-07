
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { fetchFullApplicationDetails } from './fetchService';

// Download completely raw data from Supabase with no formatting
export const downloadRawData = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📊 Generating raw data download for applications:', applicationIds);
    
    const applications = await fetchFullApplicationDetails(applicationIds);
    if (!applications.length) {
      console.error('❌ No application data found for raw data download');
      toast.error('No application data found. Please try downloading again.');
      return;
    }
    
    // Log the raw application data exactly as received
    console.log('Raw Supabase data (first application):');
    console.log(JSON.stringify(applications[0], null, 2));
    
    // Create a JSON string with the exact data from Supabase
    const jsonContent = JSON.stringify(applications, null, 2);
    
    // Create blob and save as JSON file
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    
    // Simple filename generation
    const fileName = applications.length === 1 
      ? `raw_data_${applications[0].id}.json`
      : `raw_data_${new Date().getTime()}.json`;
    
    saveAs(blob, fileName);
    console.log('✅ Raw data downloaded successfully without any transformation');
    toast.success('Raw data downloaded successfully');
  } catch (error) {
    console.error('❌ Error downloading raw data:', error);
    toast.error('Error downloading raw data');
  }
};
