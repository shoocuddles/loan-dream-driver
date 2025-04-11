import { supabase } from '@/integrations/supabase/client';
import { ApplicationItem, DownloadedApplication } from '@/lib/types/dealer-dashboard';
import { fetchApplications } from '@/lib/dealerDashboardService';

/**
 * Fetch downloaded applications for a dealer
 */
export const fetchDownloadedApplications = async (dealerId: string): Promise<DownloadedApplication[]> => {
  try {
    // Only log start of the operation
    console.log('🔍 Fetching downloaded applications for dealer');
    
    const { data, error } = await supabase.rpc('get_dealer_downloads', {
      p_dealer_id: dealerId
    });

    if (error) {
      console.error('Error fetching downloaded applications:', error);
      throw error;
    }

    if (!data || !Array.isArray(data)) {
      return [];
    }

    // Log the count but not the full data
    const downloadedApplicationIds = data.map((app: any) => app.applicationId);
    console.log(`Downloaded application IDs: ${downloadedApplicationIds.length} items`);
    
    return data as DownloadedApplication[];
  } catch (error) {
    console.error('Error fetching downloaded applications:', error);
    return [];
  }
};

/**
 * Fetch available applications for a dealer
 */
export const fetchAvailableApplications = async (dealerId: string): Promise<ApplicationItem[]> => {
  try {
    console.log('🔍 Fetching available applications for dealer');
    return await fetchApplications(dealerId);
  } catch (error) {
    console.error('Error fetching available applications:', error);
    return [];
  }
};

/**
 * Download an application
 */
export const downloadApplication = async (applicationId: string, dealerId: string): Promise<boolean> => {
  try {
    console.log(`Downloading application: ${applicationId}`);
    
    const { data, error } = await supabase.rpc('record_application_download', {
      p_application_id: applicationId,
      p_dealer_id: dealerId
    });

    if (error) throw error;
    
    // Success! Log outcome but not all details
    if (data?.success) {
      console.log(`Application ${applicationId} download ${data.alreadyDownloaded ? 'already existed' : 'recorded'}`);
    }
    
    return data?.success || false;
  } catch (error) {
    console.error(`Error downloading application ${applicationId}:`, error);
    return false;
  }
};

/**
 * Hide an application
 */
export const hideApplication = async (applicationId: string, dealerId: string): Promise<boolean> => {
  try {
    console.log(`Hiding application: ${applicationId}`);
    
    const { data, error } = await supabase
      .from('hidden_applications')
      .upsert(
        { application_id: applicationId, dealer_id: dealerId },
        { onConflict: 'application_id, dealer_id', ignoreDuplicates: false }
      )
      .select()
      .single();
    
    if (error) {
      console.error('Error hiding application:', error);
      return false;
    }
    
    console.log('Application hidden successfully:', data);
    return true;
  } catch (error) {
    console.error('Error hiding application:', error);
    return false;
  }
};

/**
 * Unhide an application
 */
export const unhideApplication = async (applicationId: string, dealerId: string): Promise<boolean> => {
  try {
    console.log(`Unhiding application: ${applicationId}`);
    
    const { data, error } = await supabase
      .from('hidden_applications')
      .delete()
      .eq('application_id', applicationId)
      .eq('dealer_id', dealerId);
    
    if (error) {
      console.error('Error unhiding application:', error);
      return false;
    }
    
    console.log('Application unhidden successfully:', data);
    return true;
  } catch (error) {
    console.error('Error unhiding application:', error);
    return false;
  }
};

/**
 * Check if an application is hidden by a dealer
 */
export const isApplicationHidden = async (applicationId: string, dealerId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('hidden_applications')
      .select('application_id')
      .eq('application_id', applicationId)
      .eq('dealer_id', dealerId)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking if application is hidden:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error checking if application is hidden:', error);
    return false;
  }
};
