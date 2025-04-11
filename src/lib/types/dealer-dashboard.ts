
// Add these to the existing types

export interface DealerPurchase {
  id: string;
  applicationId: string;
  purchaseDate: string;
  paymentId: string;
  paymentAmount: number;
  downloadedAt?: string;
  downloadCount: number;
  discountApplied: boolean;
  discountType?: string;
  discountAmount?: number;
}

// Extend ApplicationItem to include purchased state
export interface ApplicationItem {
  id: string;
  applicationId: string;
  fullName: string;
  city: string;
  submissionDate: string;
  status: string;
  lockInfo: LockInfo;
  isDownloaded: boolean;
  isPurchased?: boolean;
  standardPrice: number;
  discountedPrice: number;
  vehicleType: string;
  isAgeDiscounted?: boolean;
}

// Keep existing types for LockType, LockInfo, DownloadedApplication, etc.
export type LockType = '24hours' | '1week' | 'permanent' | 'temporary';

export interface LockInfo {
  isLocked: boolean;
  lockedBy?: string;
  expiresAt?: string;
  lockType?: LockType;
  isOwnLock?: boolean;
}

export interface DownloadedApplication {
  id: string;
  purchaseId?: string;
  applicationId: string;
  downloadDate?: string;
  purchaseDate?: string;
  paymentAmount?: number;
  fullName: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  vehicleType?: string;
  lockInfo?: LockInfo;
  // Include all other application fields
  requiredFeatures?: string;
  unwantedColors?: string;
  preferredMakeModel?: string;
  hasExistingLoan?: boolean;
  currentVehicle?: string;
  currentPayment?: string;
  amountOwed?: string;
  mileage?: string;
  employmentStatus?: string;
  monthlyIncome?: string;
  employerName?: string;
  jobTitle?: string;
  employmentDuration?: string;
  additionalNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LockoutPeriod {
  id: number;
  name: string;
  hours: number;
  fee: number;
  isActive: boolean;
}

export interface SystemSettings {
  standardPrice: number;
  discountedPrice: number;
  temporaryLockMinutes: number;
  ageDiscountEnabled: boolean;
  ageDiscountThreshold: number;
  ageDiscountPercentage: number;
}
