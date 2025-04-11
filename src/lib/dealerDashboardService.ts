
import { supabase } from '@/integrations/supabase/client';
import { ApplicationItem, LockType, LockInfo, DownloadedApplication } from '@/lib/types/dealer-dashboard';
import { formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';

export const fetchApplications = async (dealerId: string): Promise<ApplicationItem[]> => {
  try {
    // Fetch applications for the dealer
    const { data, error } = await supabase.rpc('get_applications_for_dealer', {
      p_dealer_id: dealerId
    });

    if (error) throw error;

    // Clean log - only show count, not entire array
    console.log(`Loaded ${data?.length || 0} applications for dealer`);

    if (!data || !Array.isArray(data)) return [];

    // Transform the data to our ApplicationItem type
    const applications: ApplicationItem[] = data.map((app: any) => {
      // Transform lockInfo if it exists
      const lockInfo: LockInfo = app.lockInfo || { isLocked: false };
      
      return {
        id: app.id,
        applicationId: app.applicationId || app.id,
        fullName: app.fullName,
        city: app.city,
        submissionDate: app.submissionDate || app.created_at,
        status: app.status || 'unknown',
        lockInfo: lockInfo,
        isDownloaded: app.isDownloaded || false,
        standardPrice: app.standardPrice || 0,
        discountedPrice: app.discountedPrice || 0,
        vehicleType: app.vehicleType || 'N/A',
      };
    });

    // Calculate age-based discounts if settings are provided
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    const ageSettings = settingsData ? {
      isEnabled: settingsData.age_discount_enabled || false,
      daysThreshold: settingsData.age_discount_threshold || 0,
      discountPercentage: settingsData.age_discount_percentage || 0
    } : null;

    if (ageSettings?.isEnabled) {
      console.log('Age discount settings loaded and enabled');
      
      // Apply age discounts without logging every calculation
      let discountedCount = 0;
      let ageRanges = {
        "30-60 days": 0,
        "61-90 days": 0,
        "90+ days": 0
      };
      
      applications.forEach(app => {
        if (app.submissionDate) {
          const submissionDate = parseISO(app.submissionDate);
          const ageDays = differenceInDays(new Date(), submissionDate);
          
          if (ageDays >= ageSettings.daysThreshold) {
            app.isAgeDiscounted = true;
            discountedCount++;
            
            // Count applications in different age ranges
            if (ageDays <= 60) ageRanges["30-60 days"]++;
            else if (ageDays <= 90) ageRanges["61-90 days"]++;
            else ageRanges["90+ days"]++;
          }
        }
      });
      
      if (discountedCount > 0) {
        console.log(`Applied age discount to ${discountedCount} applications`);
        console.log(`Age distribution: `, ageRanges);
      }
    }

    return applications;
  } catch (error) {
    console.error('Error fetching applications:', error);
    return [];
  }
};

export const lockApplication = async (applicationId: string, dealerId: string, lockType: LockType): Promise<boolean> => {
  try {
    console.log(`Locking application ${applicationId} for dealer ${dealerId} with lock type: ${lockType}`);
    // Simulate successful lock
    return true;
  } catch (error) {
    console.error("Error locking application:", error);
    return false;
  }
};

export const unlockApplication = async (applicationId: string, dealerId: string): Promise<boolean> => {
  try {
    console.log(`Unlocking application ${applicationId} for dealer ${dealerId}`);
    // Simulate successful unlock
    return true;
  } catch (error) {
    console.error("Error unlocking application:", error);
    return false;
  }
};

export const downloadApplication = async (applicationId: string, dealerId: string): Promise<boolean> => {
  try {
    console.log(`Downloading application ${applicationId} for dealer ${dealerId}`);
    // Simulate successful download
    return true;
  } catch (error) {
    console.error("Error downloading application:", error);
    return false;
  }
};

export const getDownloadedApplications = async (dealerId: string): Promise<DownloadedApplication[]> => {
    try {
      console.log(`Fetching downloaded applications for dealer ${dealerId}`);
      // Simulate fetching downloaded applications
      return [];
    } catch (error) {
      console.error("Error fetching downloaded applications:", error);
      return [];
    }
  };
