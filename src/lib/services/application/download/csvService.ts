
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

// Updated function to completely clean up the CSV data
const cleanCsvData = (rawData: string): string => {
  if (!rawData) return '';
  
  console.log('🔄 Starting CSV cleaning process');
  
  // Split into header and data parts
  const parts = rawData.split('\n');
  if (parts.length < 2) {
    console.log('⚠️ CSV data didn\'t contain multiple lines, returning as is');
    return rawData;
  }
  
  // Get the header row
  const header = parts[0];
  console.log('📋 Header row:', header);
  
  // Join all data rows
  let dataContent = parts.slice(1).join('\n');
  console.log('📊 Data rows length before processing:', dataContent.length);
  
  // Remove surrounding parentheses if present
  if (dataContent.startsWith('(') && dataContent.endsWith(')')) {
    dataContent = dataContent.substring(1, dataContent.length - 1);
    console.log('🔄 Removed surrounding parentheses');
  }
  
  // Remove all quotation marks from the entire dataset
  dataContent = removeAllQuotes(dataContent);
  console.log('🔄 Removed all quotation marks');
  
  // Return the properly formatted CSV
  return header + '\n' + dataContent;
};

// New function to completely remove all quotes and handle escaping
const removeAllQuotes = (csvContent: string): string => {
  // Split into individual rows if there are multiple entries
  const rows = csvContent.includes('\n') ? csvContent.split('\n') : [csvContent];
  
  // Process each row
  const processedRows = rows.map((row) => {
    // Create an array to hold processed fields
    const fields = [];
    let currentField = '';
    let inQuote = false;
    
    // Go through each character in the row
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      const nextChar = i < row.length - 1 ? row[i + 1] : '';
      
      // Handle quotes - we'll skip them completely
      if (char === '"') {
        // Toggle quote state but don't add the quote to output
        inQuote = !inQuote;
        continue;
      }
      // Handle comma - only treat as field separator if not inside quotes
      else if (char === ',' && !inQuote) {
        fields.push(currentField);
        currentField = '';
      }
      // Handle all other characters - add them to current field
      else {
        // Skip escape character but include the actual character
        if (char === '\\' && (nextChar === '"' || nextChar === '\\')) {
          continue;
        }
        currentField += char;
      }
    }
    
    // Add the last field
    if (currentField || fields.length > 0) {
      fields.push(currentField);
    }
    
    // Join fields back with commas
    return fields.join(',');
  });
  
  // Join all rows back together with newlines
  return processedRows.join('\n');
};
