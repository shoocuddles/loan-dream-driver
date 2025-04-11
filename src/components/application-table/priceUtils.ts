
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

  // Calculate the appropriate price based on discounts
  // Start with standard price as base
  let basePrice = application.standardPrice;
  let finalPrice = basePrice;
  let isDiscounted = false;
  
  // Check for age-based discount
  if (application.isAgeDiscounted && ageDiscountSettings?.isEnabled) {
    isDiscounted = true;
    const discountMultiplier = (100 - ageDiscountSettings.discountPercentage) / 100;
    finalPrice = basePrice * discountMultiplier;
  } 
  // Check for lock-based discount (only if not already discounted by age)
  else if (application.lockInfo?.isLocked && !application.lockInfo?.isOwnLock) {
    isDiscounted = true;
    finalPrice = application.discountedPrice;
  }
  
  return `$${finalPrice.toFixed(2)}`;
};

export const getPriceValue = (application: ApplicationItem, ageDiscountSettings?: AgeDiscountSettings): number => {
  if (application.isPurchased) {
    return 0;
  }
  
  // Start with standard price as base
  let basePrice = application.standardPrice;
  
  // Apply age discount if applicable
  if (application.isAgeDiscounted && ageDiscountSettings?.isEnabled) {
    const discountMultiplier = (100 - ageDiscountSettings.discountPercentage) / 100;
    return basePrice * discountMultiplier;
  }
  
  // Apply lock discount if applicable (and no age discount)
  if (application.lockInfo?.isLocked && !application.lockInfo?.isOwnLock) {
    return application.discountedPrice;
  }
  
  return basePrice;
};
