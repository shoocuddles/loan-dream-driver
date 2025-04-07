
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateFilename } from './formatUtils';
import { SupabaseCSVResponse } from './types';
import { fetchFullApplicationDetails } from './fetchService';
import { directFetchApplicationDetails } from '@/lib/directApiClient';

// Download as CSV directly from Supabase
export const downloadFullCsv = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📊 Generating full CSV directly from Supabase for applications:', applicationIds);
    
    if (!applicationIds.length) {
      console.error('❌ No application IDs provided for full CSV generation');
      toast.error('No applications selected for download.');
      return;
    }
    
    // Try multiple approaches to get the data
    let applications = null;
    
    // Approach 1: Use fetchFullApplicationDetails which has better handling for downloaded applications
    try {
      applications = await fetchFullApplicationDetails(applicationIds);
      console.log('First attempt result count:', applications?.length || 0);
    } catch (error) {
      console.error('❌ Error in fetchFullApplicationDetails:', error);
    }
    
    // Approach 2: If no data yet, try direct query with lower case column names (DB standard)
    if (!applications || applications.length === 0) {
      try {
        const { data: directQueryData, error } = await supabase
          .from('applications')
          .select('*')
          .in('id', applicationIds);
        
        if (!error && directQueryData && directQueryData.length > 0) {
          applications = directQueryData;
          console.log('Direct query succeeded with', directQueryData.length, 'records');
        } else if (error) {
          console.error('❌ Supabase direct query error:', error);
        }
      } catch (directQueryError) {
        console.error('❌ Error in direct query attempt:', directQueryError);
      }
    }
    
    // Approach 3: Try the direct API client as a last resort
    if (!applications || applications.length === 0) {
      try {
        const response = await fetch(`${supabase.supabaseUrl}/rest/v1/applications?select=*&id=in.(${applicationIds.join(',')})`, {
          method: 'GET',
          headers: {
            'apikey': supabase.supabaseKey,
            'Authorization': `Bearer ${supabase.supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        });
        
        if (response.ok) {
          const directData = await response.json();
          if (directData && directData.length > 0) {
            applications = directData;
            console.log('Direct API fetch succeeded with', directData.length, 'records');
          }
        } else {
          console.error('❌ Direct API fetch failed:', response.status, await response.text());
        }
      } catch (directApiError) {
        console.error('❌ Error in direct API fetch attempt:', directApiError);
      }
    }
    
    // If we still don't have data, show an error
    if (!applications || applications.length === 0) {
      console.error('❌ No application data found after multiple attempts');
      
      // Create a simple CSV with just the IDs as a fallback
      const fallbackData = applicationIds.map(id => ({ id }));
      toast.warning('Could not retrieve full application data. Creating minimal CSV with IDs only.');
      processAndDownloadCsv(fallbackData, applicationIds, true);
      return;
    }
    
    // We have data, proceed with CSV generation
    processAndDownloadCsv(applications, applicationIds);
    
  } catch (error) {
    console.error('❌ Error generating full CSV:', error);
    toast.error('Error generating full CSV');
  }
};

// Helper function to process data and generate CSV
const processAndDownloadCsv = (data: any[], applicationIds: string[], isFallback = false) => {
  try {
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
    let fileName;
    if (isFallback) {
      fileName = applicationIds.length === 1 
        ? `application_id_${applicationIds[0]}.csv`
        : `applications_ids_${new Date().getTime()}.csv`;
    } else {
      fileName = applicationIds.length === 1 
        ? `full_${applicationIds[0]}.csv`
        : `full_applications_${new Date().getTime()}.csv`;
    }
    
    // Save the file
    saveAs(blob, fileName);
    console.log('✅ CSV generated successfully');
    toast.success(`CSV downloaded successfully${isFallback ? ' (limited data)' : ''}`);
  } catch (csvError) {
    console.error('❌ Error generating CSV content:', csvError);
    toast.error('Error creating CSV file');
  }
};
