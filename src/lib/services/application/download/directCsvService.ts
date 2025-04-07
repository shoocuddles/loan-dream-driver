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

// New function to completely clean up the CSV data
const cleanCsvData = (rawData: string): string => {
  if (!rawData) return '';
  
  console.log('🔄 Starting CSV cleaning process');
  
  // Replace literal '\n' with actual line breaks
  rawData = rawData.replace(/\\n/g, '\n');
  
  // Split into header and data parts (now using actual line breaks)
  const lines = rawData.split('\n');
  if (lines.length < 2) {
    console.log('⚠️ CSV data didn\'t contain multiple lines, returning as is');
    return rawData;
  }
  
  // Get the header row
  const header = lines[0];
  console.log('📋 Header row:', header);
  
  // Join all data rows
  let dataContent = lines.slice(1).join('\n');
  console.log('📊 Data rows length before processing:', dataContent.length);
  
  // Remove surrounding parentheses if present
  if (dataContent.startsWith('(') && dataContent.endsWith(')')) {
    dataContent = dataContent.substring(1, dataContent.length - 1);
    console.log('🔄 Removed surrounding parentheses');
  } else {
    // Try more aggressively to remove all parentheses
    dataContent = dataContent.replace(/\(/g, '').replace(/\)/g, '');
    console.log('🔄 Removed all parentheses');
  }
  
  // Apply thorough cleaning to remove all quotes and backslashes
  dataContent = cleanAllSpecialCharacters(dataContent);
  console.log('🔄 Cleaned all special characters');
  
  // Return the properly formatted CSV
  return header + '\n' + dataContent;
};

// Comprehensive function to clean all special characters while preserving data integrity
const cleanAllSpecialCharacters = (csvContent: string): string => {
  // First, parse the CSV to understand the structure
  const rows = csvContent.split('\n');
  const cleanedRows = rows.map(row => {
    // Skip empty rows
    if (!row.trim()) return '';
    
    let inQuotes = false;
    let currentField = '';
    const fields = [];
    
    // Process each character in the row
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      // Handle quotes (toggle quote state)
      if (char === '"' && (i === 0 || row[i-1] !== '\\')) {
        inQuotes = !inQuotes;
        // Skip adding the quote character
        continue;
      }
      
      // Handle commas - only treat as field separator if not inside quotes
      if (char === ',' && !inQuotes) {
        fields.push(currentField);
        currentField = '';
        continue;
      }
      
      // Skip backslashes that are escaping characters
      if (char === '\\' && i < row.length - 1) {
        // Skip the backslash but keep the next character
        continue;
      }
      
      // For all other characters, add to current field
      currentField += char;
    }
    
    // Don't forget to add the last field
    fields.push(currentField);
    
    // Join fields back with commas
    return fields.join(',');
  });
  
  return cleanedRows.filter(row => row.length > 0).join('\n');
};
