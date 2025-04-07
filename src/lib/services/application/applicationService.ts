
import { ApplicationItem, DownloadedApplication } from '@/lib/types/dealer-dashboard';
import { supabase, rpcCall } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Fetches available applications for the dealer
 */
export const fetchAvailableApplications = async (): Promise<ApplicationItem[]> => {
  try {
    console.log('🔍 Fetching available applications for dealer');
    
    const { data: userId } = await supabase.auth.getUser();
    if (!userId.user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await rpcCall<ApplicationItem[]>('get_applications_for_dealer', {
      p_dealer_id: userId.user.id
    });
    
    if (error) throw error;
    
    console.log('Raw application data from database:', data);
    
    // Map the data to ensure all expected properties exist and field names match
    const formattedData = data?.map(app => {
      // First make a copy of the application data
      const formattedApp = { ...app };
      
      // Handle vehicletype/vehicleType mapping
      if ((app as any).vehicletype !== undefined) {
        formattedApp.vehicleType = (app as any).vehicletype;
        console.log(`Mapped vehicletype -> vehicleType: ${(app as any).vehicletype}`);
      } else if (!formattedApp.vehicleType) {
        // Default value if neither exists
        formattedApp.vehicleType = 'N/A';
        console.log('No vehicle type found, defaulting to N/A');
      }

      // Handle status field mapping
      if ((app as any).status !== undefined) {
        formattedApp.status = (app as any).status;
        console.log(`Mapped status: ${(app as any).status}`);
      } else if (!formattedApp.status) {
        formattedApp.status = 'unknown';
        console.log('No status found, defaulting to "unknown"');
      }

      // Ensure all required fields exist
      return {
        id: formattedApp.id,
        applicationId: formattedApp.applicationId,
        fullName: formattedApp.fullName || 'Unknown',
        city: formattedApp.city || '',
        submissionDate: formattedApp.submissionDate,
        status: formattedApp.status,
        lockInfo: formattedApp.lockInfo || { isLocked: false },
        isDownloaded: formattedApp.isDownloaded || false,
        standardPrice: formattedApp.standardPrice,
        discountedPrice: formattedApp.discountedPrice,
        vehicleType: formattedApp.vehicleType || 'N/A'
      };
    }) || [];
    
    console.log('Formatted applications with vehicleType and status:', formattedData);
    
    return formattedData;
  } catch (error: any) {
    console.error('❌ Error fetching available applications:', error.message);
    toast.error('Failed to load applications');
    return [];
  }
};

/**
 * Fetches downloaded applications for the dealer
 */
export const fetchDownloadedApplications = async (): Promise<DownloadedApplication[]> => {
  try {
    console.log('🔍 Fetching downloaded applications for dealer');
    
    const { data: userId } = await supabase.auth.getUser();
    if (!userId.user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await rpcCall<DownloadedApplication[]>('get_dealer_downloads', {
      p_dealer_id: userId.user.id
    });
    
    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('❌ Error fetching downloaded applications:', error.message);
    toast.error('Failed to load your purchased applications');
    return [];
  }
};

/**
 * Records an application download
 */
export const recordDownload = async (applicationId: string, paymentId?: string, paymentAmount?: number): Promise<boolean> => {
  try {
    console.log(`📥 Recording download for application ${applicationId}`);
    
    const { data: userId } = await supabase.auth.getUser();
    if (!userId.user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await rpcCall<{ success: boolean, alreadyDownloaded: boolean }>('record_application_download', {
      p_application_id: applicationId,
      p_dealer_id: userId.user.id,
      p_payment_id: paymentId,
      p_payment_amount: paymentAmount
    });
    
    if (error) throw error;
    return data?.success || false;
  } catch (error: any) {
    console.error('❌ Error recording download:', error.message);
    toast.error(`Failed to record download: ${error.message}`);
    return false;
  }
};

/**
 * Checks if an application has been downloaded by the current dealer
 */
export const isApplicationDownloaded = async (applicationId: string): Promise<boolean> => {
  try {
    console.log(`🔍 Checking if application ${applicationId} is downloaded`);
    
    const { data: userId } = await supabase.auth.getUser();
    if (!userId.user) {
      return false;
    }
    
    const { data, error } = await rpcCall<boolean>('is_application_downloaded_by_dealer', {
      p_application_id: applicationId,
      p_dealer_id: userId.user.id
    });
    
    if (error) throw error;
    return !!data;
  } catch (error: any) {
    console.error('❌ Error checking download status:', error.message);
    return false;
  }
};
