
import { Application, UserProfile } from './supabase';

export interface LockInfo {
  isLocked: boolean;
  lockedBy?: string;
  expiresAt?: string;
  lockType?: string;
  isOwnLock?: boolean;
}

// Removed extending Partial<Application> since it causes type conflicts
export interface ApplicationItem {
  id: string;
  applicationId: string;
  fullName: string;
  city?: string;
  submissionDate: string;
  status: string; // Changed from specific union type to string to accommodate any status from the backend
  lockInfo?: LockInfo;
  isDownloaded?: boolean;
  standardPrice?: number;
  discountedPrice?: number;
  vehicleType?: string; // This field is now properly handled in the mapping function
  isAgeDiscounted?: boolean; // Added to track if an application has age-based discount
}

export interface DownloadedApplication {
  downloadId: string;
  applicationId: string;
  fullName: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  vehicleType?: string;
  downloadDate: string; // This field is used instead of submissionDate
  paymentAmount?: number;
  // Allow any other fields that might be returned from the database
  [key: string]: any;
}

export interface LockoutPeriod {
  id: number;
  name: string;
  hours: number;
  fee: number;
  isActive: boolean;
}

export interface SystemSettings {
  id: number;
  standardPrice: number;
  discountedPrice: number;
  temporaryLockMinutes: number;
  ageDiscountEnabled?: boolean;
  ageDiscountThreshold?: number;
  ageDiscountPercentage?: number;
}

export type LockType = 'temporary' | '24hours' | '1week' | 'permanent';
