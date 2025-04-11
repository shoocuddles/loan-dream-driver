
import { ApplicationItem } from '@/lib/types/dealer-dashboard';
import { calculateLeadAge } from './dateUtils';

export interface AgeDiscountSettings {
  isEnabled: boolean;
  daysThreshold: number;
  discountPercentage: number;
}

export const getPrice = (application: ApplicationItem, ageDiscountSettings?: AgeDiscountSettings) => {
  if (application.isPurchased) {
    return 'Free';
  }

  // Check if there's age-based discount
  if (application.isAgeDiscounted) {
    return `$${application.discountedPrice.toFixed(2)}`;
  }
  
  // Check if there's lock-based discount
  const lockInfo = application.lockInfo;
  const wasLocked = lockInfo?.isLocked && !lockInfo?.isOwnLock;
  
  return wasLocked ? 
    `$${application.discountedPrice.toFixed(2)}` : 
    `$${application.standardPrice.toFixed(2)}`;
};

export const getPriceValue = (application: ApplicationItem, ageDiscountSettings?: AgeDiscountSettings): number => {
  if (application.isPurchased) {
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
