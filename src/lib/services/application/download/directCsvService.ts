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
    return rawData;
  }
  
  const header = lines[0];
  console.log('📋 Header row:', header);
  
  // Process the data rows (everything after the header)
  let dataContent = lines.slice(1).join('\n');
  
  // Remove surrounding parentheses from the data
  dataContent = dataContent.replace(/^\(|\)$/g, '');
  
  // Process the CSV using the enhanced processing function
  const processedCSV = processCSVData(header, dataContent);
  
  console.log('🔄 CSV data cleaned successfully');
  return processedCSV;
};

// Enhanced function to process CSV data properly
const processCSVData = (header: string, dataContent: string): string => {
  // First, split the data into rows by actual newlines 
  const dataRows = dataContent.split('\n');
  console.log(`📊 Processing ${dataRows.length} data rows`);
  
  // Process each row to properly handle CSV formatting
  const processedRows = dataRows.map(row => {
    if (!row.trim()) return '';
    
    // Remove all parentheses
    row = row.replace(/[\(\)]/g, '');
    
    // Split by commas, but respect quoted fields
    return processCSVRow(row);
  }).filter(row => row.length > 0);
  
  // Combine header with processed data rows
  return header + '\n' + processedRows.join('\n');
};

// Process a single CSV row correctly
const processCSVRow = (row: string): string => {
  const result = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < row.length) {
    const char = row[i];
    
    // Handle quotes
    if (char === '"') {
      // If we see a quote and we're not in a quoted field, start a quoted field
      // If we see a quote and we're in a quoted field, check if it's an escaped quote
      if (i + 1 < row.length && row[i + 1] === '"' && inQuotes) {
        // This is an escaped quote within a quoted field, add a single quote
        field += '';  // Skip the quote character
        i += 2;  // Skip both quote characters
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    }
    
    // Handle commas
    if (char === ',' && !inQuotes) {
      // End of field
      result.push(field);
      field = '';
      i++;
      continue;
    }
    
    // Handle backslashes - skip them
    if (char === '\\') {
      i++;
      if (i < row.length) {
        // Keep the character after the backslash
        field += row[i];
      }
      i++;
      continue;
    }
    
    // Regular character - add to field
    field += char;
    i++;
  }
  
  // Add the last field
  result.push(field);
  
  return result.join(',');
};
