
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Download as CSV directly from Supabase with proper formatting
export const downloadFullCsv = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📊 Requesting full CSV export for applications:', applicationIds);
    
    if (!applicationIds.length) {
      console.error('❌ No application IDs provided for CSV generation');
      toast.error('No applications selected for download.');
      return;
    }

    // First try using the RPC function method
    try {
      console.log('📊 Sending parameters to get_applications_csv:', { ids: applicationIds });
      
      const { data: csvData, error } = await supabase.rpc('get_applications_csv', { 
        ids: applicationIds 
      });
      
      if (error) {
        console.error('❌ Error from RPC get_applications_csv:', error);
        throw error;
      }
      
      if (csvData) {
        console.log('✅ CSV data received from Supabase RPC');
        console.log('📊 CSV data length:', csvData.length);
        console.log('📊 First 100 characters of CSV:', csvData.substring(0, 100));
        
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
        return;
      }
    } catch (rpcError) {
      console.error('❌ Error calling get_applications_csv:', rpcError);
      console.log('⚠️ Falling back to direct data fetch method...');
    }
    
    // Fallback to direct REST API call if the RPC method fails
    const supabaseUrl = "https://kgtfpuvksmqyaraijoal.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtndGZwdXZrc21xeWFyYWlqb2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MjAxMjksImV4cCI6MjA1OTM5NjEyOX0._fj5EqjZBmS_fHB5Z2p2lDJdXilePMUrbf3If_wGBz0";
    
    const response = await fetch(`${supabaseUrl}/rest/v1/applications?id=in.(${applicationIds.join(',')})&select=*`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error from direct applications fetch:', response.status, response.statusText);
      console.error('Error details:', errorText);
      toast.error('Error generating CSV');
      return;
    }
    
    // Get raw data as JSON
    const applications = await response.json();
    
    if (!applications || !Array.isArray(applications) || applications.length === 0) {
      console.error('❌ No data returned from direct applications fetch');
      toast.error('Error generating CSV');
      return;
    }
    
    console.log('✅ Application data received from direct fetch');
    console.log('📊 Applications count:', applications.length);
    
    // Convert JSON to CSV
    const csvData = convertApplicationsToCSV(applications);
    
    // Create blob directly from the CSV text data
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    
    // Generate filename based on number of applications
    const fileName = applicationIds.length === 1 
      ? `application_${applicationIds[0]}.csv`
      : `applications_${new Date().getTime()}.csv`;
    
    // Save the blob directly as a file without any manipulation
    saveAs(blob, fileName);
    console.log('✅ CSV file saved successfully using direct fetch method');
    toast.success('CSV downloaded successfully');
  } catch (error) {
    console.error('❌ Error generating CSV:', error);
    toast.error('Error generating CSV');
  }
};

// Convert array of application objects to CSV string
const convertApplicationsToCSV = (applications: any[]): string => {
  if (!applications || applications.length === 0) return '';
  
  // Get all column names from the first application
  const columnNames = Object.keys(applications[0]);
  
  // Create header row
  let csvContent = columnNames.join(',') + '\n';
  
  // Add data rows
  applications.forEach(app => {
    const row = columnNames.map(colName => {
      // Get the value for this column
      const value = app[colName];
      
      // Convert to string and handle special cases
      let cellValue = value === null || value === undefined ? '' : String(value);
      
      // Escape quotes and wrap in quotes if contains comma, newline or quote
      if (cellValue.includes(',') || cellValue.includes('\n') || cellValue.includes('"')) {
        cellValue = '"' + cellValue.replace(/"/g, '""') + '"';
      }
      
      return cellValue;
    }).join(',');
    
    csvContent += row + '\n';
  });
  
  return csvContent;
};
