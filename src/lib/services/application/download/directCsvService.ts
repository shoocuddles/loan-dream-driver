
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
    
    // Clean up CSV formatting issues
    csvData = cleanCsvData(csvData);
    
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

// Improved CSV data cleaning function
const cleanCsvData = (rawData: string): string => {
  if (!rawData) return '';
  
  console.log('🔄 Starting CSV cleaning process');
  
  // Replace literal '\n' with actual line breaks
  rawData = rawData.replace(/\\n/g, '\n');
  
  // Get the header row (first line)
  const lines = rawData.split('\n');
  if (lines.length < 2) {
    console.log('⚠️ CSV data didn\'t contain multiple lines, returning as is');
    return removeAllQuotes(rawData);
  }
  
  const header = lines[0];
  console.log('📋 Header row:', header);
  
  // Process the data rows (everything after the header)
  let dataContent = lines.slice(1).join('\n');
  
  // Process the CSV using the enhanced processing function
  const processedCSV = processMultipleApplications(header, dataContent);
  
  console.log('🔄 CSV data cleaned successfully');
  return processedCSV;
};

// Process multiple applications with proper line breaks
const processMultipleApplications = (header: string, dataContent: string): string => {
  // Clean the header (remove quotes)
  const cleanHeader = removeAllQuotes(header);
  
  // First remove surrounding parentheses
  dataContent = dataContent.replace(/^\(|\)$/g, '');
  
  // Look for UUID patterns that indicate the start of a new application record
  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi;
  
  // First split by any existing line breaks
  let rows = dataContent.split('\n');
  
  // Process each row to clean up formatting characters
  const processedRows = rows.map(row => {
    // Skip empty rows
    if (!row.trim()) return '';
    
    // Remove any remaining parentheses
    row = row.replace(/[\(\)]/g, '');
    
    // Remove all quotes
    row = removeAllQuotes(row);
    
    // Remove all backslashes
    row = row.replace(/\\/g, '');
    
    return row;
  }).filter(row => row.trim().length > 0);

  // Now ensure each application record starts with a line break
  let result = '';
  for (let i = 0; i < processedRows.length; i++) {
    const row = processedRows[i];
    
    // If this isn't the first row and starts with a UUID, add a line break before it
    const matches = row.match(uuidPattern);
    if (i > 0 && matches && matches.length && row.trimStart().startsWith(matches[0])) {
      result += '\n';
    }
    
    result += row + '\n';
  }
  
  console.log('🔄 CSV data cleaned with proper application line breaks');
  return cleanHeader + '\n' + result.trim();
};

// Remove all quotation marks from the text
const removeAllQuotes = (text: string): string => {
  return text.replace(/"/g, '');
};
