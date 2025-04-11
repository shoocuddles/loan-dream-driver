
import { supabase } from '@/integrations/supabase/client';
import { ApplicationItem, DownloadedApplication } from '@/lib/types/dealer-dashboard';
import { fetchApplications } from '@/lib/dealerDashboardService';
import { isApplicationPurchased } from '@/lib/services/purchase/purchaseService';

/**
 * Fetch downloaded applications for a dealer
 */
export const fetchDownloadedApplications = async (dealerId: string): Promise<DownloadedApplication[]> => {
  try {
    console.log('🔍 Fetching downloaded applications for dealer');
    
    if (!dealerId) {
      console.error('Error: dealerId is required');
      return [];
    }
    
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

    // Only log the count, not the entire array
    console.log(`Retrieved ${data.length} downloaded applications from database`);
    
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
    
    if (!dealerId) {
      console.error('Error: dealerId is required');
      return [];
    }
    
    // Get all applications
    const applications = await fetchApplications(dealerId);
    
    // Get purchased application IDs
    const purchasedIds = await getPurchasedApplicationIds(dealerId);
    console.log(`Retrieved ${purchasedIds.length} purchased application IDs`);
    
    // Filter out purchased applications
    const availableApps = applications.filter(app => !purchasedIds.includes(app.applicationId));
    
    console.log(`Retrieved ${availableApps.length} available applications after filtering out purchased ones`);
    return availableApps;
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

/**
 * Get purchased application IDs for a dealer
 */
export const getPurchasedApplicationIds = async (dealerId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('dealer_purchases')
      .select('application_id')
      .eq('dealer_id', dealerId)
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching purchased application IDs:', error);
      throw error;
    }
    
    return (data || []).map(item => item.application_id);
  } catch (error) {
    console.error('Error fetching purchased application IDs:', error);
    return [];
  }
};
