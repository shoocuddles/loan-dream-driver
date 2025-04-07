
import { ApplicationItem } from '@/lib/types/dealer-dashboard';

export const getPrice = (application: ApplicationItem) => {
  if (application.isDownloaded) {
    return 'Free';
  }
  const lockInfo = application.lockInfo;
  const wasLocked = lockInfo?.isLocked && lockInfo.lockedBy !== 'currentDealerId';
  return wasLocked ? 
    `$${application.discountedPrice?.toFixed(2)}` : 
    `$${application.standardPrice?.toFixed(2)}`;
};
