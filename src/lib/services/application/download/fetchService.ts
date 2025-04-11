
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
    
    // Try to fetch directly from applications table first (with ALL fields)
    const { data: applications, error } = await supabase
      .from('applications')
      .select('*')
      .in('id', applicationIds);
    
    // Log raw data from Supabase for debugging purposes
    console.log('🔍 APPLICATIONS QUERY RESPONSE:', error || 'Success');
    
    if (applications && applications.length > 0) {
      console.log(`✅ Retrieved ${applications.length} applications from applications table`);
      console.log('🔍 SAMPLE DATA STRUCTURE:', Object.keys(applications[0]));
      
      // Log every field from the first application for debugging
      const app = applications[0];
      console.log('📄 COMPLETE APPLICATION FIELDS:');
      Object.keys(app).forEach(key => {
        console.log(`Field: ${key} | Value: ${JSON.stringify(app[key])} | Type: ${typeof app[key]}`);
      });
      
      return applications;
    }
    
    console.log('🔄 Applications not found in applications table, checking dealer_purchases');
    
    // If applications not found directly, try getting through dealer_purchases
    // Get the current user's ID
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated');
    }
    
    // First check if these applications are actually purchased by the dealer
    const { data: purchasesData } = await supabase
      .from('dealer_purchases')
      .select('application_id, purchase_date')
      .in('application_id', applicationIds)
      .eq('dealer_id', userData.user.id)
      .eq('is_active', true);
    
    if (purchasesData && purchasesData.length > 0) {
      console.log(`✅ Found ${purchasesData.length} purchased applications`);
      
      // Now try to get the full application details for each purchased application
      const appDetails = [];
      for (const purchase of purchasesData) {
        const { data: appData } = await supabase
          .from('applications')
          .select('*')
          .eq('id', purchase.application_id)
          .single();
          
        if (appData) {
          appDetails.push({
            ...appData,
            purchaseDate: purchase.purchase_date,
            applicationId: purchase.application_id
          });
        }
      }
      
      if (appDetails.length > 0) {
        console.log(`✅ Retrieved ${appDetails.length} application details from purchases`);
        return appDetails;
      }
    }
    
    // Try the RPC function as a fallback
    try {
      const { data: downloadedApps, error: downloadError } = await supabase
        .rpc('get_dealer_downloads', {
          p_dealer_id: userData.user.id
        });
      
      if (downloadError) {
        console.error('❌ Error fetching from get_dealer_downloads:', downloadError);
      }
      else if (downloadedApps) {
        console.log('✅ Retrieved data from downloads RPC');
        console.log('📄 Downloaded apps raw data:', downloadedApps);
        
        // The response is now directly a JSON array, no need to parse
        const downloads = Array.isArray(downloadedApps) ? downloadedApps : [downloadedApps];
        console.log('📄 DOWNLOADS DATA STRUCTURE:', downloads.length > 0 ? Object.keys(downloads[0]) : 'Empty array');
        
        const filteredDownloads = downloads.filter((app: any) => 
          applicationIds.includes(app.applicationId || app.id)
        );
        
        if (filteredDownloads.length > 0) {
          console.log(`✅ Found ${filteredDownloads.length} matching downloaded applications`);
          console.log('📄 SAMPLE DOWNLOAD DATA:', filteredDownloads[0]);
          
          // With the enhanced SQL function, we now get all application fields directly
          return filteredDownloads as ApplicationData[];
        }
      }
    } catch (error) {
      console.error('❌ Error in download application fetch:', error);
    }
    
    // Fall back to direct join query
    console.log('🔄 Attempting direct join query');
    try {
      // Get download records
      const { data: downloadRecords } = await supabase
        .from('application_downloads')
        .select('*')
        .in('application_id', applicationIds);
      
      if (downloadRecords && downloadRecords.length > 0) {
        console.log(`✅ Found ${downloadRecords.length} download records`);
        
        // For each download, fetch the full application
        const fullData = await Promise.all(
          downloadRecords.map(async (record) => {
            const { data: appDetails } = await supabase
              .from('applications')
              .select('*')
              .eq('id', record.application_id)
              .single();
            
            if (!appDetails) {
              console.warn(`⚠️ No application details found for ${record.application_id}`);
              return {
                id: record.application_id,
                downloadId: record.id,
                downloadDate: record.downloaded_at
              };
            }
            
            // Merge all data from both tables
            return {
              ...appDetails,
              downloadId: record.id,
              downloadDate: record.downloaded_at,
              applicationId: record.application_id
            };
          })
        );
        
        const validData = fullData.filter(Boolean) as ApplicationData[];
        console.log(`✅ Processed ${validData.length} applications with download data`);
        return validData;
      }
    } catch (error) {
      console.error('❌ Error in fallback query:', error);
    }
    
    console.error('❌ Could not find application data in any table');
    toast.error('Could not find application data. Please try again.');
    return [];
  } catch (error) {
    console.error('❌ Error in fetchFullApplicationDetails:', error);
    toast.error(`Error retrieving application details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
};

// Fetch column metadata for applications table
export const fetchApplicationColumnMetadata = async (): Promise<ColumnMetadata[]> => {
  try {
    console.log('🔍 Fetching column metadata for applications table');
    
    // Query Postgres system catalog for column information
    const { data: columnsData, error } = await supabase
      .rpc('get_applications_columns');
    
    if (error) {
      console.error('❌ Error fetching column metadata:', error);
      return getDefaultColumnMetadata();
    }
    
    if (columnsData && columnsData.length > 0) {
      console.log(`✅ Retrieved ${columnsData.length} columns from applications table`);
      
      // Map the column data to our metadata format
      const metadata = columnsData.map((col: any) => ({
        name: col.column_name,
        displayName: formatColumnName(col.column_name)
      }));
      
      // Add any additional virtual columns that might be needed
      metadata.push({ name: 'downloadDate', displayName: 'Download Date' });
      metadata.push({ name: 'applicationId', displayName: 'Application ID' });
      metadata.push({ name: 'paymentAmount', displayName: 'Payment Amount' });
      
      return metadata;
    }
    
    // Fallback to hardcoded list if no columns returned
    console.log('⚠️ No column metadata returned, using fallback column list');
    return getDefaultColumnMetadata();
  } catch (error) {
    console.error('❌ Error in fetchApplicationColumnMetadata:', error);
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
  // Include ALL known database columns
  return [
    // Standard application fields
    { name: 'id', displayName: 'ID' },
    { name: 'user_id', displayName: 'User ID' },
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
    { name: 'employer_name', displayName: 'Employer Name' },
    { name: 'job_title', displayName: 'Job Title' },
    { name: 'employment_duration', displayName: 'Employment Duration' },
    { name: 'status', displayName: 'Status' },
    { name: 'iscomplete', displayName: 'Is Complete' },
    { name: 'created_at', displayName: 'Submission Date' },
    { name: 'updated_at', displayName: 'Last Updated' },
    { name: 'payment_amount', displayName: 'Payment Amount' },
    
    // Virtual fields from download processing
    { name: 'downloadId', displayName: 'Download ID' },
    { name: 'downloadDate', displayName: 'Download Date' },
    { name: 'applicationId', displayName: 'Application ID' },
    { name: 'paymentAmount', displayName: 'Payment Amount' }
  ];
};
