
import { supabase } from '@/integrations/supabase/client';
import { ApplicationItem, LockType, LockInfo, DownloadedApplication, DealerPurchase } from '@/lib/types/dealer-dashboard';
import { formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export const fetchApplications = async (dealerId: string): Promise<ApplicationItem[]> => {
  try {
    // Fetch applications for the dealer
    const { data, error } = await supabase.functions.invoke('get-applications-for-dealer', {
      body: { dealerId }
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
        isPurchased: app.isPurchased || false,
        purchaseCount: 0 // Initialize with 0, will be updated below
      };
    });

    // Apply age-based discounts if settings are provided
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
    // Use direct table query instead of RPC function
    const { data: purchasesData, error: purchasesError } = await supabase
      .from('dealer_purchases')
      .select('application_id')
      .eq('dealer_id', dealerId)
      .eq('is_active', true);
    
    if (purchasesError) {
      console.error("Error fetching dealer purchases:", purchasesError);
    } else if (purchasesData && Array.isArray(purchasesData)) {
      // Mark applications as purchased/downloaded
      const purchasedAppIds = purchasesData.map(purchase => purchase.application_id);
      console.log(`Dealer has ${purchasedAppIds.length} purchased applications`);
      
      applications.forEach(app => {
        if (purchasedAppIds.includes(app.applicationId)) {
          app.isDownloaded = true;
          app.isPurchased = true;
        }
      });
    }

    // Fetch purchase counts for all applications from dealer_purchases table
    const appIds = applications.map(app => app.applicationId);
    
    console.log("Fetching purchase counts for applications:", appIds.length);
    
    // Debugging purposes - let's check what's in the dealer_purchases table
    console.log("DEBUG: Querying dealer_purchases table for all purchases");
    
    const { data: allPurchases, error: allPurchasesError } = await supabase
      .from('dealer_purchases')
      .select('application_id, dealer_id')
      .eq('is_active', true);
      
    if (allPurchasesError) {
      console.error("Error fetching all purchases:", allPurchasesError);
    } else {
      console.log(`DEBUG: Found ${allPurchases?.length || 0} total active purchases in the system`);
      
      // Log some sample data if available
      if (allPurchases && allPurchases.length > 0) {
        console.log("DEBUG: Sample purchases:", allPurchases.slice(0, 5));
        
        // Count purchases per application
        const debugPurchaseMap: {[key: string]: number} = {};
        allPurchases.forEach(purchase => {
          const appId = purchase.application_id;
          debugPurchaseMap[appId] = (debugPurchaseMap[appId] || 0) + 1;
        });
        
        console.log("DEBUG: Purchase counts per application:", debugPurchaseMap);
        
        // Check if any of our applications have purchases
        const applicationsWithPurchases = appIds.filter(id => debugPurchaseMap[id] && debugPurchaseMap[id] > 0);
        console.log(`DEBUG: ${applicationsWithPurchases.length} of our applications have been purchased before`);
        if (applicationsWithPurchases.length > 0) {
          console.log("DEBUG: Applications with purchases:", applicationsWithPurchases);
        }
      }
    }
    
    // Query purchase counts for our specific application IDs
    const { data: purchaseCountsData, error: purchaseCountsError } = await supabase
      .from('dealer_purchases')
      .select('application_id')
      .in('application_id', appIds)
      .eq('is_active', true);
    
    if (purchaseCountsError) {
      console.error("Error getting purchase counts:", purchaseCountsError);
    } else if (purchaseCountsData && Array.isArray(purchaseCountsData)) {
      // Create a count map of purchases per application
      const purchaseCountMap: {[key: string]: number} = {};
      
      console.log("Raw purchase data received:", purchaseCountsData.length, "records");
      
      purchaseCountsData.forEach(purchase => {
        const appId = purchase.application_id;
        purchaseCountMap[appId] = (purchaseCountMap[appId] || 0) + 1;
      });
      
      console.log("Purchase count map created:", purchaseCountMap);
      
      // Update purchase counts in applications
      applications.forEach(app => {
        app.purchaseCount = purchaseCountMap[app.applicationId] || 0;
      });
      
      const purchasedCount = applications.filter(a => (a.purchaseCount || 0) > 0).length;
      console.log("Purchase counts loaded successfully:", 
        purchasedCount, "applications have been purchased before");
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
    
    // First attempt to get data via the RPC function
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_dealer_downloads', {
        p_dealer_id: dealerId
      });
    
    if (rpcError) {
      console.error("Error fetching from RPC function:", rpcError);
      // Fall back to direct query approach
    } else if (rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
      console.log(`Retrieved ${rpcData.length} downloaded applications from RPC function`);
      
      // Fetch lock information for each application
      const downloadedWithLocks = await Promise.all(
        rpcData.map(async (app) => {
          const lockInfo = await getApplicationLockInfo(app.applicationId, dealerId);
          return {
            ...app,
            lockInfo
          };
        })
      );
      
      return downloadedWithLocks as DownloadedApplication[];
    }
    
    // If RPC approach failed, try direct table queries
    console.log("Falling back to direct table queries");
    
    // Get purchase records
    const { data: purchasesData, error: purchasesError } = await supabase
      .from('dealer_purchases')
      .select(`
        id, 
        application_id, 
        payment_id,
        payment_amount,
        purchase_date,
        downloaded_at,
        download_count
      `)
      .eq('dealer_id', dealerId)
      .eq('is_active', true)
      .order('purchase_date', { ascending: false });
    
    if (purchasesError) {
      console.error("Error fetching dealer purchases:", purchasesError);
      throw purchasesError;
    }
    
    console.log(`Retrieved ${purchasesData?.length || 0} purchased applications from database`);
    
    if (!purchasesData || purchasesData.length === 0) {
      return [];
    }
    
    // For each purchase, get the application details and lock information
    const downloadedApplications: DownloadedApplication[] = await Promise.all(
      purchasesData.map(async (purchase) => {
        const { data: appData, error: appError } = await supabase
          .rpc('get_application_by_id', {
            p_application_id: purchase.application_id
          });
          
        if (appError) {
          console.error(`Error fetching application ${purchase.application_id}:`, appError);
          return {
            id: purchase.id,
            applicationId: purchase.application_id,
            fullName: 'Unknown',
            downloadDate: purchase.downloaded_at,
            purchaseDate: purchase.purchase_date
          };
        }
        
        const app = appData || {};
        
        // Get lock information for this application
        const lockInfo = await getApplicationLockInfo(purchase.application_id, dealerId);
        
        // Create a properly structured DownloadedApplication
        return {
          id: purchase.id,
          purchaseId: purchase.id,
          applicationId: purchase.application_id,
          downloadDate: purchase.downloaded_at,
          purchaseDate: purchase.purchase_date,
          paymentAmount: purchase.payment_amount,
          fullName: app.fullname || 'Unknown',
          phoneNumber: app.phonenumber,
          email: app.email,
          address: app.streetaddress,
          city: app.city,
          province: app.province,
          postalCode: app.postalcode,
          vehicleType: app.vehicletype,
          lockInfo: lockInfo,
          requiredFeatures: app.requiredfeatures,
          unwantedColors: app.unwantedcolors,
          preferredMakeModel: app.preferredmakemodel,
          hasExistingLoan: app.hasexistingloan,
          currentVehicle: app.currentvehicle,
          currentPayment: app.currentpayment,
          amountOwed: app.amountowed,
          mileage: app.mileage,
          employmentStatus: app.employmentstatus,
          monthlyIncome: app.monthlyincome,
          employerName: app.employer_name,
          jobTitle: app.job_title,
          employmentDuration: app.employment_duration,
          additionalNotes: app.additionalnotes,
          createdAt: app.created_at,
          updatedAt: app.updated_at
        } as DownloadedApplication;
      })
    );
    
    return downloadedApplications.filter(Boolean) as DownloadedApplication[];
  } catch (error: any) {
    console.error("Error fetching downloaded applications:", error);
    toast.error("Failed to load purchased applications");
    return [];
  }
};

async function getApplicationLockInfo(applicationId: string, dealerId: string): Promise<LockInfo> {
  try {
    const { data, error } = await supabase
      .from('application_locks')
      .select('*')
      .eq('application_id', applicationId)
      .order('locked_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error("Error fetching lock info:", error);
      return { isLocked: false };
    }
    
    if (!data || data.length === 0) {
      return { isLocked: false };
    }
    
    const lockRecord = data[0];
    const now = new Date();
    const expiresAt = new Date(lockRecord.expires_at);
    
    // Check if lock has expired
    if (expiresAt < now) {
      return { isLocked: false };
    }
    
    return {
      isLocked: true,
      lockedBy: lockRecord.dealer_id,
      expiresAt: lockRecord.expires_at,
      lockType: lockRecord.lock_type as LockType,
      isOwnLock: lockRecord.dealer_id === dealerId
    };
  } catch (error) {
    console.error("Error getting lock info:", error);
    return { isLocked: false };
  }
}

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

export const getDealerInvoices = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-dealer-invoices', {
      body: {}
    });
    
    if (error) {
      console.error('Error fetching invoices:', error);
      throw new Error('Failed to load invoices');
    }
    
    // Store invoices locally for persistent access
    if (Array.isArray(data?.invoices)) {
      try {
        const currentInvoices = JSON.parse(localStorage.getItem('dealerInvoices') || '[]');
        const mergedInvoices = mergeAndDeduplicateInvoices(currentInvoices, data.invoices);
        localStorage.setItem('dealerInvoices', JSON.stringify(mergedInvoices));
        
        console.log(`Retrieved ${data.invoices.length} invoices, merged with ${currentInvoices.length} local invoices.`);
        return mergedInvoices;
      } catch (e) {
        console.warn('Could not save invoices to local storage:', e);
        return data.invoices;
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error in getDealerInvoices:', error);
    
    // If the API fails, try to get invoices from local storage
    try {
      const localInvoices = JSON.parse(localStorage.getItem('dealerInvoices') || '[]');
      console.log('Returning invoices from local storage:', localInvoices.length);
      return localInvoices;
    } catch (e) {
      console.error('Could not retrieve local invoices:', e);
      return [];
    }
  }
};

// Helper function to merge and deduplicate invoices
const mergeAndDeduplicateInvoices = (existingInvoices: any[], newInvoices: any[]): any[] => {
  const invoicesMap = new Map();
  
  // Add existing invoices to map
  existingInvoices.forEach(invoice => {
    invoicesMap.set(invoice.id, invoice);
  });
  
  // Add or update with new invoices
  newInvoices.forEach(invoice => {
    invoicesMap.set(invoice.id, invoice);
  });
  
  // Convert map back to array and sort by created date (newest first)
  return Array.from(invoicesMap.values())
    .sort((a, b) => b.created - a.created);
};
