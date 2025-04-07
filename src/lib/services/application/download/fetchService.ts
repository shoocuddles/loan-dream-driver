
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Application } from '@/lib/types/supabase';
import { DownloadedApplication } from '@/lib/types/dealer-dashboard';
import { ApplicationData } from './types';

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
            fullName: appDetails?.fullname || 'Unknown',
            email: appDetails?.email,
            phoneNumber: appDetails?.phonenumber || appDetails?.phone,
            address: appDetails?.streetaddress || appDetails?.address,
            city: appDetails?.city,
            province: appDetails?.province,
            postalCode: appDetails?.postalcode,
            vehicleType: appDetails?.vehicletype
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
