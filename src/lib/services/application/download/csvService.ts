
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

// Directly access the URL and key from the environment variables
const SUPABASE_URL = "https://kgtfpuvksmqyaraijoal.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtndGZwdXZrc21xeWFyYWlqb2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MjAxMjksImV4cCI6MjA1OTM5NjEyOX0._fj5EqjZBmS_fHB5Z2p2lDJdXilePMUrbf3If_wGBz0";

// Download as CSV directly from Supabase RPC function with proper formatting
export const downloadAsCSV = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📊 Requesting CSV directly from Supabase for applications:', applicationIds);
    
    if (!applicationIds.length) {
      console.error('❌ No application IDs provided for CSV generation');
      toast.error('No applications selected for download.');
      return;
    }
    
    // Direct fetch request to ensure proper handling of the CSV response
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
      console.error('❌ No data returned from Supabase CSV export');
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
    console.error('❌ Error during CSV download:', error);
    toast.error('Error generating CSV');
  }
};

// Improved CSV data cleaning function
const cleanCsvData = (rawData: string): string => {
  if (!rawData) return '';
  
  console.log('🔄 Starting CSV cleaning process');
  
  // Replace literal '\n' with actual line breaks
  rawData = rawData.replace(/\\n/g, '\n');
  
  // Get the header row and data content separately
  const lines = rawData.split('\n');
  if (lines.length < 2) {
    console.log('⚠️ CSV data didn\'t contain multiple lines, returning as is');
    return removeAllQuotes(rawData);
  }
  
  const header = lines[0];
  console.log('📋 Header row:', header);
  
  // Process the data rows (everything after the header)
  let dataContent = lines.slice(1).join('\n');
  
  // Remove all quotes, parentheses, and backslashes
  return processMultipleApplications(header, dataContent);
};

// Process multiple applications with proper line breaks
const processMultipleApplications = (header: string, dataContent: string): string => {
  // Clean the header (remove quotes) but preserve the structure
  const cleanHeader = removeAllQuotes(header);
  
  // First remove surrounding parentheses
  dataContent = dataContent.replace(/^\(|\)$/g, '');
  
  // Look for UUID patterns that indicate the start of a new application record
  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g;
  
  // First split by any existing line breaks
  let rows = dataContent.split('\n');
  
  // Process each row
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

  // Further processing for multiple applications - look for ID patterns
  let result = '';
  
  // Join all rows into a single string to check for IDs
  let combinedContent = processedRows.join('\n');
  
  // Find all UUIDs in the content
  const uuids = combinedContent.match(uuidPattern);
  
  if (uuids && uuids.length > 1) {
    console.log('🔍 Found multiple application IDs:', uuids.length);
    
    // For each UUID except the first one (which should be at the start of a row)
    for (let i = 1; i < uuids.length; i++) {
      // Insert a line break before each UUID that's in the middle of a row
      const uuid = uuids[i];
      const uuidPos = combinedContent.indexOf(uuid);
      
      // Check if UUID is at the start of a line
      const isAtStart = uuidPos === 0 || 
                        combinedContent[uuidPos - 1] === '\n' ||
                        combinedContent.substring(uuidPos - 10, uuidPos).includes('\n');
      
      if (!isAtStart) {
        // Replace the UUID with a line break + the UUID
        combinedContent = combinedContent.substring(0, uuidPos) + 
                          '\n' + 
                          combinedContent.substring(uuidPos);
        
        // Since we added a character, adjust positions of remaining UUIDs
        for (let j = i + 1; j < uuids.length; j++) {
          const nextPos = combinedContent.indexOf(uuids[j]);
          if (nextPos > uuidPos) {
            // This UUID comes after the one we just modified
            // No need to do anything as indexOf will find the new position
          }
        }
      }
    }
    
    result = combinedContent;
  } else {
    // If no multiple UUIDs found, just join the processed rows
    result = processedRows.join('\n');
  }
  
  console.log('🔄 CSV data cleaned successfully with proper application line breaks');
  return cleanHeader + '\n' + result.trim();
};

// Remove all quotation marks from the text
const removeAllQuotes = (text: string): string => {
  return text.replace(/"/g, '');
};
