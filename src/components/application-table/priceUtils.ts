
import { ApplicationItem } from '@/lib/types/dealer-dashboard';
import { calculateLeadAge } from './dateUtils';

export interface AgeDiscountSettings {
  isEnabled: boolean;
  daysThreshold: number;
  discountPercentage: number;
}

export const getPrice = (application: ApplicationItem, ageDiscountSettings?: AgeDiscountSettings) => {
  if (application.isDownloaded) {
    return 'Free';
  }

  const lockInfo = application.lockInfo;
  const wasLocked = lockInfo?.isLocked && lockInfo.lockedBy !== 'currentDealerId';
  
  // Get base price based on lock status
  let basePrice = wasLocked ? 
    application.discountedPrice : 
    application.standardPrice;
  
  // Reset the flag in case it was previously set
  application.isAgeDiscounted = false;
  
  // Calculate age-based discount if enabled
  if (ageDiscountSettings?.isEnabled && basePrice) {
    const leadAge = calculateLeadAge(application.submissionDate);
    
    if (leadAge >= ageDiscountSettings.daysThreshold) {
      const discountMultiplier = (100 - ageDiscountSettings.discountPercentage) / 100;
      const ageDiscountedPrice = basePrice * discountMultiplier;
      
      // Mark the application as age-discounted for UI highlighting
      application.isAgeDiscounted = true;
      
      return `$${ageDiscountedPrice.toFixed(2)}`;
    }
  }
  
  // No age-based discount applied
  return basePrice ? `$${basePrice.toFixed(2)}` : 'N/A';
};

export const getPriceValue = (application: ApplicationItem, ageDiscountSettings?: AgeDiscountSettings): number => {
  if (application.isDownloaded) {
    return 0;
  }
  
  const lockInfo = application.lockInfo;
  const wasLocked = lockInfo?.isLocked && lockInfo.lockedBy !== 'currentDealerId';
  
  // Get base price based on lock status
  let basePrice = wasLocked ? 
    application.discountedPrice : 
    application.standardPrice;
    
  if (!basePrice) return 0;
  
  // Calculate age-based discount if enabled
  if (ageDiscountSettings?.isEnabled) {
    const leadAge = calculateLeadAge(application.submissionDate);
    
    if (leadAge >= ageDiscountSettings.daysThreshold) {
      const discountMultiplier = (100 - ageDiscountSettings.discountPercentage) / 100;
      return basePrice * discountMultiplier;
    }
  }
  
  return basePrice;
};
