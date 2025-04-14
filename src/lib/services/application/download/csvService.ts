
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
    
    // Create SQL migration to fix the export function on the server side
    console.log('⚠️ Using client-side CSV formatting as a fallback');
    
    // Clean up CSV formatting issues
    csvData = processCSV(csvData);
    
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

// Process CSV data to fix formatting issues
const processCSV = (rawData: string): string => {
  if (!rawData) return '';
  
  console.log('🔄 Starting CSV repair process');
  
  // Split into lines
  const lines = rawData.trim().split('\n');
  if (lines.length < 1) {
    return 'No data';
  }
  
  // Extract the header row - this is the correct column order
  const header = lines[0];
  const headerColumns = header.split(',');
  
  console.log('📋 Header columns:', headerColumns);
  
  // Process data rows
  let processedLines = [header]; // Start with the header
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue; // Skip empty lines
    
    // For data rows, we need to reorder the values to match the header
    let values: string[] = [];
    
    // Check if the line contains a UUID (application ID)
    if (line.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/)) {
      // Try to parse this as a complete row with data in wrong order
      const rowData = parseApplicationRow(line, headerColumns);
      if (rowData) {
        // Create correctly ordered CSV row
        const orderedValues = headerColumns.map(column => {
          const value = rowData[column] || '';
          return escapeCsvValue(value);
        });
        processedLines.push(orderedValues.join(','));
      } else {
        console.log('⚠️ Could not parse row:', line);
        // If parsing fails, include the row as-is
        processedLines.push(line);
      }
    } else {
      // This might be a continuation of the previous line
      // For now, just include it as-is
      processedLines.push(line);
    }
  }
  
  // Join all lines back together
  const result = processedLines.join('\n');
  console.log('🔄 CSV data processed successfully');
  return result;
};

// Parse an application row into a key-value object
const parseApplicationRow = (line: string, headers: string[]): Record<string, string> | null => {
  try {
    // Split the line into values
    const values = splitCsvLine(line);
    
    // Check if this line contains an application ID (UUID)
    const uuidPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/;
    const uuidMatch = line.match(uuidPattern);
    
    if (!uuidMatch) {
      return null; // No UUID found, cannot reliably parse
    }
    
    // Extract the application ID
    const applicationId = uuidMatch[0];
    
    // Basic parsing based on expected structure
    // The example shows the ID first, then other fields
    const result: Record<string, string> = {};
    
    // Map known fields based on their relative positions or patterns
    result['id'] = applicationId;
    
    // Try to identify fields based on patterns
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      
      // Look for phone number pattern
      if (value.match(/^\+?[0-9\-\(\)\s]{10,15}$/)) {
        result['phonenumber'] = value;
        continue;
      }
      
      // Look for email pattern
      if (value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        result['email'] = value;
        continue;
      }
      
      // Look for name (two or more words)
      if (value.split(' ').length >= 2 && !result['fullname']) {
        result['fullname'] = value;
        continue;
      }
      
      // Look for province (Canadian provinces)
      if (['Ontario', 'Quebec', 'Alberta', 'Manitoba', 'Saskatchewan', 'British Columbia', 'Nova Scotia', 'New Brunswick', 'PEI', 'Newfoundland', 'Yukon', 'Northwest Territories', 'Nunavut'].includes(value)) {
        result['province'] = value;
        continue;
      }
      
      // Look for vehicle type
      if (['Car', 'Truck', 'SUV', 'Van', 'Motorcycle'].includes(value)) {
        result['vehicletype'] = value;
        continue;
      }
      
      // Look for status
      if (['submitted', 'draft', 'completed', 'pending'].includes(value)) {
        result['status'] = value;
        continue;
      }
      
      // Look for boolean values
      if (value === 't' || value === 'true' || value === 'f' || value === 'false') {
        // This could be hasexistingloan or iscomplete, assign it to hasexistingloan as a guess
        if (!result['hasexistingloan']) {
          result['hasexistingloan'] = value;
        } else if (!result['iscomplete']) {
          result['iscomplete'] = value;
        }
        continue;
      }
      
      // Look for dates (ISO format)
      if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) || value.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)) {
        // This could be created_at or updated_at
        if (!result['created_at']) {
          result['created_at'] = value;
        } else if (!result['updated_at']) {
          result['updated_at'] = value;
        }
        continue;
      }
      
      // Look for currency values ($ format)
      if (value.startsWith('$')) {
        if (!result['monthlyincome']) {
          result['monthlyincome'] = value;
        } else if (!result['currentpayment']) {
          result['currentpayment'] = value;
        } else if (!result['amountowed']) {
          result['amountowed'] = value;
        }
        continue;
      }
    }
    
    // For columns we haven't identified yet, use the remaining unassigned values
    let valueIndex = 0;
    for (const header of headers) {
      if (!result[header] && valueIndex < values.length) {
        // Skip values we've already assigned
        while (valueIndex < values.length && Object.values(result).includes(values[valueIndex])) {
          valueIndex++;
        }
        
        if (valueIndex < values.length) {
          result[header] = values[valueIndex];
          valueIndex++;
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing application row:', error);
    return null;
  }
};

// Properly split a CSV line handling quoted values
const splitCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let currentValue = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Toggle quote state
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // End of value
      values.push(currentValue);
      currentValue = '';
    } else {
      // Part of the current value
      currentValue += char;
    }
  }
  
  // Add the last value
  values.push(currentValue);
  
  return values;
};

// Escape CSV values (wrap in quotes if needed)
const escapeCsvValue = (value: string): string => {
  if (!value) return '';
  
  // If the value contains a comma, newline, or quote, wrap it in quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    // Replace any quotes in the value with double quotes
    value = value.replace(/"/g, '""');
    return `"${value}"`;
  }
  
  return value;
};
