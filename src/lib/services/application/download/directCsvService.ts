
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

// Directly access the URL and key from the environment variables
const SUPABASE_URL = "https://kgtfpuvksmqyaraijoal.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtndGZwdXZrc21xeWFyYWlqb2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MjAxMjksImV4cCI6MjA1OTM5NjEyOX0._fj5EqjZBmS_fHB5Z2p2lDJdXilePMUrbf3If_wGBz0";

// Download as CSV directly from Supabase with proper formatting
export const downloadFullCsv = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📊 Requesting full CSV directly from Supabase for applications:', applicationIds);
    
    if (!applicationIds.length) {
      console.error('❌ No application IDs provided for CSV generation');
      toast.error('No applications selected for download.');
      return;
    }
    
    // Direct fetch request to ensure proper binary data handling
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/export_applications_as_csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ app_ids: applicationIds })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error from Supabase export_applications_as_csv:', response.status, response.statusText);
      console.error('Error details:', errorText);
      toast.error('Error generating CSV');
      return;
    }
    
    // Get raw CSV data as text
    let csvData = await response.text();
    
    if (!csvData || csvData.trim() === '') {
      console.error('❌ No data returned from export_applications_as_csv function');
      toast.error('Error generating CSV');
      return;
    }
    
    console.log('✅ CSV data received from Supabase');
    console.log('📊 CSV data length:', csvData.length);
    console.log('📊 First 100 characters of CSV:', csvData.substring(0, 100));
    
    // Process the returned data to convert it to proper CSV format
    // The data comes in format: "header1,header2,header3\n(value1,value2,value3)"
    // We need to extract and reformat it properly
    
    // Check if the data follows the expected pattern
    const headerMatch = csvData.match(/^(.*?)\n/);
    if (headerMatch) {
      const headers = headerMatch[1]; // Extract headers
      
      // Extract data part (remove header row and parentheses)
      let dataRows = csvData.substring(csvData.indexOf('\n') + 1);
      if (dataRows.startsWith('(')) {
        dataRows = dataRows.substring(1);
      }
      if (dataRows.endsWith(')')) {
        dataRows = dataRows.substring(0, dataRows.length - 1);
      }
      
      // Reconstruct proper CSV with headers and data rows
      csvData = headers + '\n' + dataRows;
      
      console.log('✅ CSV data reformatted successfully');
      console.log('📊 Reformatted CSV first 100 chars:', csvData.substring(0, 100));
    } else {
      console.warn('⚠️ CSV format unexpected, using raw data');
    }
    
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
    console.error('❌ Error generating CSV:', error);
    toast.error('Error generating CSV');
  }
};
