
import { supabase } from '@/integrations/supabase/client';
import { ApplicationItem, LockType, LockInfo, DownloadedApplication, DealerPurchase } from '@/lib/types/dealer-dashboard';
import { formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

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

    // Fetch dealer purchases to identify which applications have been purchased
    const { data: purchasesData, error: purchasesError } = await supabase.rpc('get_dealer_purchases', { 
      p_dealer_id: dealerId 
    });
    
    if (purchasesError) {
      console.error("Error fetching dealer purchases:", purchasesError);
    } else if (purchasesData && Array.isArray(purchasesData)) {
      // Mark applications as purchased/downloaded
      const purchasedAppIds = purchasesData.map((purchase: any) => purchase.applicationId);
      console.log(`Dealer has ${purchasedAppIds.length} purchased applications`);
      
      applications.forEach(app => {
        if (purchasedAppIds.includes(app.applicationId)) {
          app.isDownloaded = true;
          app.isPurchased = true;
        }
      });
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
    
    const { data, error } = await supabase.rpc('lock_application', {
      p_application_id: applicationId,
      p_dealer_id: dealerId,
      p_lock_type: lockType
    });
    
    if (error) {
      console.error("Error locking application:", error);
      return false;
    }
    
    return data?.success || false;
  } catch (error) {
    console.error("Error locking application:", error);
    return false;
  }
};

export const unlockApplication = async (applicationId: string, dealerId: string): Promise<boolean> => {
  try {
    console.log(`Unlocking application ${applicationId} for dealer ${dealerId}`);
    
    const { data, error } = await supabase.rpc('unlock_application', {
      p_application_id: applicationId,
      p_dealer_id: dealerId
    });
    
    if (error) {
      console.error("Error unlocking application:", error);
      return false;
    }
    
    return data?.success || false;
  } catch (error) {
    console.error("Error unlocking application:", error);
    return false;
  }
};

export const downloadApplication = async (applicationId: string, dealerId: string): Promise<boolean> => {
  try {
    console.log(`Recording download for application ${applicationId} for dealer ${dealerId}`);
    
    // First check if application has been purchased
    const isPurchased = await isApplicationPurchased(applicationId, dealerId);
    
    if (!isPurchased) {
      console.warn("Attempt to download application that hasn't been purchased");
      return false;
    }
    
    // Record the download
    const { data, error } = await supabase.rpc('mark_purchase_downloaded', {
      p_dealer_id: dealerId,
      p_application_id: applicationId
    });
    
    if (error) {
      console.error("Error recording download:", error);
      return false;
    }
    
    return data?.success || false;
  } catch (error) {
    console.error("Error downloading application:", error);
    return false;
  }
};

export const getDownloadedApplications = async (dealerId: string): Promise<DownloadedApplication[]> => {
  try {
    console.log(`Fetching downloaded applications for dealer ${dealerId}`);
    
    // Use the new get_dealer_purchases function
    const { data, error } = await supabase.rpc('get_dealer_purchases', {
      p_dealer_id: dealerId
    });
    
    if (error) {
      console.error("Error fetching dealer purchases:", error);
      throw error;
    }
    
    if (!data || !Array.isArray(data)) {
      return [];
    }
    
    console.log(`Retrieved ${data.length} purchased applications from database`);
    
    // Fetch full application details for each purchased application
    const applicationIds = data.map((purchase: any) => purchase.applicationId);
    
    if (applicationIds.length === 0) {
      return [];
    }
    
    const { data: applicationsData, error: applicationsError } = await supabase
      .from('applications')
      .select('*')
      .in('id', applicationIds);
    
    if (applicationsError) {
      console.error("Error fetching application details:", applicationsError);
      return [];
    }
    
    // Map purchases to application details
    return data.map((purchase: any) => {
      const appDetails = applicationsData?.find((app: any) => app.id === purchase.applicationId) || {};
      
      return {
        id: purchase.id,
        purchaseId: purchase.id,
        applicationId: purchase.applicationId,
        downloadDate: purchase.downloadedAt || purchase.purchaseDate,
        purchaseDate: purchase.purchaseDate,
        paymentAmount: purchase.paymentAmount,
        fullName: appDetails.fullname || 'Unknown',
        phoneNumber: appDetails.phonenumber,
        email: appDetails.email,
        address: appDetails.streetaddress,
        city: appDetails.city,
        province: appDetails.province,
        postalCode: appDetails.postalcode,
        vehicleType: appDetails.vehicletype,
        requiredFeatures: appDetails.requiredfeatures,
        unwantedColors: appDetails.unwantedcolors,
        preferredMakeModel: appDetails.preferredmakemodel,
        hasExistingLoan: appDetails.hasexistingloan,
        currentVehicle: appDetails.currentvehicle,
        currentPayment: appDetails.currentpayment,
        amountOwed: appDetails.amountowed,
        mileage: appDetails.mileage,
        employmentStatus: appDetails.employmentstatus,
        monthlyIncome: appDetails.monthlyincome,
        employerName: appDetails.employer_name,
        jobTitle: appDetails.job_title,
        employmentDuration: appDetails.employment_duration,
        additionalNotes: appDetails.additionalnotes,
        createdAt: appDetails.created_at,
        updatedAt: appDetails.updated_at
      };
    });
  } catch (error) {
    console.error("Error fetching downloaded applications:", error);
    toast.error("Failed to load purchased applications");
    return [];
  }
};

export const isApplicationPurchased = async (applicationId: string, dealerId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('dealer_purchases')
      .select('id')
      .eq('dealer_id', dealerId)
      .eq('application_id', applicationId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) {
      console.error("Error checking purchase status:", error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error("Error checking purchase status:", error);
    return false;
  }
};

export const getDealerPurchases = async (dealerId: string): Promise<DealerPurchase[]> => {
  try {
    const { data, error } = await supabase.rpc('get_dealer_purchases', {
      p_dealer_id: dealerId
    });
    
    if (error) {
      console.error("Error fetching dealer purchases:", error);
      return [];
    }
    
    if (!data || !Array.isArray(data)) {
      return [];
    }
    
    return data.map((purchase: any) => ({
      id: purchase.id,
      applicationId: purchase.applicationId,
      purchaseDate: purchase.purchaseDate,
      paymentId: purchase.paymentId,
      paymentAmount: purchase.paymentAmount,
      downloadedAt: purchase.downloadedAt,
      downloadCount: purchase.downloadCount,
      discountApplied: purchase.discountApplied,
      discountType: purchase.discountType,
      discountAmount: purchase.discountAmount
    }));
  } catch (error) {
    console.error("Error fetching dealer purchases:", error);
    return [];
  }
};

export const recordPurchase = async (
  dealerId: string, 
  applicationId: string, 
  paymentId: string, 
  paymentAmount: number,
  stripeSessionId?: string,
  discountApplied?: boolean,
  discountType?: string,
  discountAmount?: number
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('record_dealer_purchase', {
      p_dealer_id: dealerId,
      p_application_id: applicationId,
      p_payment_id: paymentId,
      p_payment_amount: paymentAmount,
      p_stripe_session_id: stripeSessionId,
      p_discount_applied: discountApplied || false,
      p_discount_type: discountType,
      p_discount_amount: discountAmount
    });
    
    if (error) {
      console.error("Error recording purchase:", error);
      return false;
    }
    
    return data?.success || false;
  } catch (error) {
    console.error("Error recording purchase:", error);
    return false;
  }
};
