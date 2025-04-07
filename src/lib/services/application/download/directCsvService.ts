
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateFilename } from './formatUtils';
import { SupabaseCSVResponse } from './types';
import { fetchFullApplicationDetails } from './fetchService';

// Download as CSV directly from Supabase
export const downloadFullCsv = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📊 Generating full CSV directly from Supabase for applications:', applicationIds);
    
    if (!applicationIds.length) {
      console.error('❌ No application IDs provided for full CSV generation');
      toast.error('No applications selected for download.');
      return;
    }
    
    // First try to fetch the application data using fetchFullApplicationDetails
    // which has better handling for downloaded applications
    const applications = await fetchFullApplicationDetails(applicationIds);
    
    if (!applications || applications.length === 0) {
      console.error('❌ No application data found using fetchFullApplicationDetails');
      
      // As a fallback, try direct query to applications table
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .in('id', applicationIds);
      
      if (error) {
        console.error('❌ Supabase direct query error:', error);
        toast.error('Failed to fetch application data for CSV export.');
        return;
      }
      
      if (!data || data.length === 0) {
        console.error('❌ No application data found via direct query either');
        toast.error('No application data found for CSV export.');
        return;
      }
      
      // Continue with the data from direct query
      processAndDownloadCsv(data, applicationIds);
      return;
    }
    
    // If we have data from fetchFullApplicationDetails, use it
    processAndDownloadCsv(applications, applicationIds);
    
  } catch (error) {
    console.error('❌ Error generating full CSV:', error);
    toast.error('Error generating full CSV');
  }
};

// Helper function to process data and generate CSV
const processAndDownloadCsv = (data: any[], applicationIds: string[]) => {
  // Get all unique headers from the data
  const allKeys = new Set<string>();
  data.forEach(row => {
    Object.keys(row).forEach(key => allKeys.add(key));
  });
  const headers = Array.from(allKeys);
  
  // Create CSV content
  let csvContent = headers.join(',') + '\n';
  
  data.forEach(row => {
    const rowValues = headers.map(header => {
      const value = row[header];
      // Handle different data types and ensure proper CSV formatting
      if (value === null || value === undefined) {
        return '';
      } else if (typeof value === 'string') {
        // Escape quotes and wrap in quotes if contains comma, quote or newline
        const needsQuotes = value.includes(',') || value.includes('"') || value.includes('\n');
        const escaped = value.replace(/"/g, '""');
        return needsQuotes ? `"${escaped}"` : escaped;
      } else if (typeof value === 'object') {
        // Convert objects to JSON strings
        const jsonStr = JSON.stringify(value);
        return `"${jsonStr.replace(/"/g, '""')}"`;
      }
      return String(value);
    });
    csvContent += rowValues.join(',') + '\n';
  });
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Generate filename
  const fileName = applicationIds.length === 1 
    ? `full_${applicationIds[0]}.csv`
    : `full_applications_${new Date().getTime()}.csv`;
  
  // Save the file
  saveAs(blob, fileName);
  console.log('✅ Full CSV generated successfully');
  toast.success('Full CSV downloaded successfully');
};
