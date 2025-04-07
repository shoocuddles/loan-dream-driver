
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
    
    // Fix CSV formatting issues
    csvData = formatCsvData(csvData);
    
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

// Helper function to correctly format CSV data from Supabase
const formatCsvData = (rawData: string): string => {
  // Replace literal "\n" with actual line breaks
  let formattedData = rawData.replace(/\\n/g, '\n');
  
  // Split the data into header and content parts
  const parts = formattedData.split('\n', 2);
  if (parts.length < 2) {
    console.warn('⚠️ CSV data doesn\'t contain expected format with headers');
    return formattedData;
  }
  
  const headers = parts[0];
  let content = parts.slice(1).join('\n');
  
  // Remove surrounding parentheses
  if (content.startsWith('(') && content.endsWith(')')) {
    content = content.substring(1, content.length - 1);
  }
  
  // Clean up escape characters while preserving properly quoted fields
  content = cleanupCsvEscapes(content);
  
  return headers + '\n' + content;
};

// Helper function to clean up CSV escaping issues
const cleanupCsvEscapes = (csvContent: string): string => {
  let inQuote = false;
  let result = '';
  let i = 0;
  
  while (i < csvContent.length) {
    const char = csvContent[i];
    
    if (char === '"') {
      // Check if this is an escaped quote (double quote inside a quoted field)
      if (inQuote && i + 1 < csvContent.length && csvContent[i + 1] === '"') {
        result += '"';
        i += 2; // Skip both quotes
        continue;
      }
      
      // Toggle the quote state
      inQuote = !inQuote;
      result += char;
    } 
    else if (char === '\\' && i + 1 < csvContent.length && csvContent[i + 1] === '"') {
      // Handle escaped quotes from the database
      if (!inQuote) {
        result += '"';
        i += 2;
        continue;
      }
      result += char;
    }
    else {
      result += char;
    }
    
    i++;
  }
  
  return result;
};
