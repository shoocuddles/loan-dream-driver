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
    
    // Get the current user's ID first
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      throw new Error('User not authenticated');
    }
    
    // Try the RPC function first as it's the most direct way
    try {
      const { data: downloadedApps, error: downloadError } = await supabase
        .rpc('get_dealer_downloads', {
          p_dealer_id: userData.user.id
        });
      
      if (downloadError) {
        console.error('❌ Error fetching from get_dealer_downloads RPC:', downloadError);
      }
      else if (downloadedApps) {
        console.log('✅ Retrieved data from downloads RPC');
        
        // The response is now directly a JSON array, no need to parse
        const downloads = Array.isArray(downloadedApps) ? downloadedApps : [downloadedApps];
        console.log('📄 Downloaded apps raw data structure:', downloads.length > 0 ? Object.keys(downloads[0] || {}) : 'Empty array');
        
        // Filter to just the requested application IDs
        const filteredDownloads = downloads.filter((app: any) => 
          applicationIds.includes(app.applicationId || app.id)
        );
        
        if (filteredDownloads.length > 0) {
          console.log(`✅ Found ${filteredDownloads.length} matching applications from RPC function`);
          return filteredDownloads as ApplicationData[];
        }
      }
    } catch (error) {
      console.error('❌ Error in download application RPC fetch:', error);
    }
    
    // Fallback: fetch directly from dealer_purchases and applications tables
    console.log('🔄 Falling back to direct table joins');
    try {
      // Get purchase records for the requested applications
      const { data: purchaseRecords, error: purchaseError } = await supabase
        .from('dealer_purchases')
        .select('*')
        .in('application_id', applicationIds)
        .eq('dealer_id', userData.user.id)
        .eq('is_active', true);
      
      if (purchaseError) {
        console.error('❌ Error fetching purchase records:', purchaseError);
        throw purchaseError;
      }
      
      if (!purchaseRecords || purchaseRecords.length === 0) {
        console.warn('⚠️ No purchase records found for application IDs:', applicationIds);
        return [];
      }
      
      console.log(`✅ Found ${purchaseRecords.length} purchase records`);
      
      // Use explicit DB queries to get application details for purchased applications
      const results = await Promise.all(purchaseRecords.map(async (purchase) => {
        // For each purchase, explicitly fetch the application with an RPC call 
        // that has the proper security context
        const { data: appData, error: appError } = await supabase
          .rpc('get_application_by_id', {
            p_application_id: purchase.application_id
          });
        
        if (appError) {
          console.error(`❌ Error fetching application ${purchase.application_id}:`, appError);
          return {
            id: purchase.application_id,
            applicationId: purchase.application_id,
            downloadId: purchase.id,
            downloadDate: purchase.downloaded_at,
            purchaseDate: purchase.purchase_date
          };
        }
        
        // Combine purchase and application data
        const app = appData || {};
        return {
          ...app,
          id: purchase.application_id,
          applicationId: purchase.application_id,
          downloadId: purchase.id,
          downloadDate: purchase.downloaded_at,
          purchaseDate: purchase.purchase_date,
          // Map fields with proper casing
          fullName: app.fullname || '',
          email: app.email || '',
          phoneNumber: app.phonenumber || '',
          address: app.streetaddress || '',
          city: app.city || '',
          province: app.province || '',
          postalCode: app.postalcode || '',
          vehicleType: app.vehicletype || ''
        };
      }));
      
      const validResults = results.filter(Boolean);
      console.log(`✅ Processed ${validResults.length} applications with purchase data`);
      return validResults as ApplicationData[];
    } catch (error) {
      console.error('❌ Error in direct table fetch:', error);
      throw error;
    }
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
