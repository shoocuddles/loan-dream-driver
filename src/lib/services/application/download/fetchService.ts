
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Application } from '@/lib/types/supabase';
import { DownloadedApplication } from '@/lib/types/dealer-dashboard';
import { ApplicationData, ColumnMetadata } from './types';

// Get full application details once purchased
export const fetchFullApplicationDetails = async (applicationIds: string[]): Promise<ApplicationData[]> => {
  try {
    console.log('🔍 Fetching full application details for:', applicationIds);
    
    if (!applicationIds.length) return [];
    
    // First attempt with lowercase column names (database standard)
    const { data: lowerCaseData, error: lowerCaseError } = await supabase
      .from('applications')
      .select('*')
      .in('id', applicationIds);
    
    if (lowerCaseError) {
      console.error('❌ Error fetching full application details with lowercase names:', lowerCaseError);
      // Don't throw yet, we'll try with the downloaded applications table
    }
    
    // If we got data from the regular applications table, return it
    if (lowerCaseData && lowerCaseData.length > 0) {
      console.log(`✅ Retrieved ${lowerCaseData.length} full application details from applications table`);
      return lowerCaseData as Application[];
    }
    
    // If we didn't get data from applications table, try fetching from downloaded applications
    console.log('🔄 Attempting to fetch from application_downloads and join with applications');
    
    // Get the current user's ID for the dealer_id parameter
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated');
    }
    
    // Try calling the RPC function first
    try {
      const { data: downloadedApps, error: downloadError } = await supabase
        .rpc('get_dealer_downloads', {
          p_dealer_id: userData.user.id
        });
      
      if (downloadError) throw downloadError;
      
      // If we got data, filter for requested application ids
      if (Array.isArray(downloadedApps) && downloadedApps.length > 0) {
        const filteredDownloads = downloadedApps.filter((app: any) => 
          applicationIds.includes(app.applicationId)
        );
        
        if (filteredDownloads.length > 0) {
          console.log(`✅ Retrieved ${filteredDownloads.length} application details from downloads`);
          return filteredDownloads as DownloadedApplication[];
        }
      }
    } catch (rpcError) {
      console.error('❌ Error fetching from get_dealer_downloads:', rpcError);
      // Continue to fallback query
    }
    
    // Attempt a direct join query as fallback
    try {
      // First get the download records
      const { data: downloadRecords, error: downloadError } = await supabase
        .from('application_downloads')
        .select('id, downloaded_at, application_id, payment_amount, dealer_id')
        .in('application_id', applicationIds)
        .eq('dealer_id', userData.user.id);
      
      if (downloadError) throw downloadError;
      
      if (downloadRecords && downloadRecords.length > 0) {
        console.log(`✅ Found ${downloadRecords.length} download records`);
        
        // Now fetch the full application details for each download
        const appData = await Promise.all(downloadRecords.map(async (record) => {
          const { data: appDetails, error: appError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', record.application_id)
            .single();
          
          if (appError) {
            console.error(`❌ Error fetching application details for ${record.application_id}:`, appError);
            return null;
          }
          
          return {
            downloadId: record.id,
            downloadDate: record.downloaded_at,
            applicationId: record.application_id,
            paymentAmount: record.payment_amount,
            ...appDetails // Include all fields from the application
          };
        }));
        
        // Filter out any null results
        const validAppData = appData.filter(item => item !== null) as DownloadedApplication[];
        
        if (validAppData.length > 0) {
          console.log(`✅ Transformed ${validAppData.length} application records`);
          return validAppData;
        }
      }
    } catch (fallbackError) {
      console.error('❌ Error with fallback query:', fallbackError);
    }
    
    console.error('❌ Could not find application data in any table');
    toast.error('Could not find application data. Please try downloading the application again.');
    return [];
  } catch (error) {
    console.error('❌ Error in fetchFullApplicationDetails:', error);
    toast.error('Error retrieving application details');
    return [];
  }
};

// Fetch all column metadata from the applications table
export const fetchApplicationColumnMetadata = async (): Promise<ColumnMetadata[]> => {
  try {
    console.log('🔍 Fetching column metadata for applications table');
    
    // Query Postgres system catalog for column information
    const { data: columnsData, error } = await supabase
      .rpc('get_applications_columns');
    
    if (error) {
      console.error('❌ Error fetching column metadata:', error);
      
      // Fallback to hardcoded list if RPC fails
      return getDefaultColumnMetadata();
    }
    
    if (columnsData && columnsData.length > 0) {
      console.log(`✅ Retrieved ${columnsData.length} columns from applications table`);
      
      // Map the column data to our metadata format
      return columnsData.map((col: any) => ({
        name: col.column_name,
        displayName: formatColumnName(col.column_name)
      }));
    }
    
    // Fallback to hardcoded list if no columns returned
    console.log('⚠️ No column metadata returned, using fallback column list');
    return getDefaultColumnMetadata();
  } catch (error) {
    console.error('❌ Error in fetchApplicationColumnMetadata:', error);
    // Fallback to hardcoded list on error
    return getDefaultColumnMetadata();
  }
};

// Format database column names to display names
const formatColumnName = (columnName: string): string => {
  // Replace underscores with spaces and capitalize each word
  return columnName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Fallback column metadata in case the database query fails
const getDefaultColumnMetadata = (): ColumnMetadata[] => {
  return [
    { name: 'id', displayName: 'ID' },
    { name: 'fullname', displayName: 'Full Name' },
    { name: 'email', displayName: 'Email' },
    { name: 'phonenumber', displayName: 'Phone Number' },
    { name: 'streetaddress', displayName: 'Street Address' },
    { name: 'city', displayName: 'City' },
    { name: 'province', displayName: 'Province' },
    { name: 'postalcode', displayName: 'Postal Code' },
    { name: 'vehicletype', displayName: 'Vehicle Type' },
    { name: 'requiredfeatures', displayName: 'Required Features' },
    { name: 'unwantedcolors', displayName: 'Unwanted Colors' },
    { name: 'preferredmakemodel', displayName: 'Preferred Make/Model' },
    { name: 'hasexistingloan', displayName: 'Has Existing Loan' },
    { name: 'currentpayment', displayName: 'Current Payment' },
    { name: 'amountowed', displayName: 'Amount Owed' },
    { name: 'currentvehicle', displayName: 'Current Vehicle' },
    { name: 'mileage', displayName: 'Mileage' },
    { name: 'employmentstatus', displayName: 'Employment Status' },
    { name: 'monthlyincome', displayName: 'Monthly Income' },
    { name: 'additionalnotes', displayName: 'Additional Notes' },
    { name: 'status', displayName: 'Status' },
    { name: 'created_at', displayName: 'Submission Date' },
    { name: 'updated_at', displayName: 'Last Updated' }
  ];
};
