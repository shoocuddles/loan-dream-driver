
import { Application, UserProfile } from './supabase';

export interface LockInfo {
  isLocked: boolean;
  lockedBy?: string;
  expiresAt?: string;
  lockType?: string;
  isOwnLock?: boolean;
}

export interface ApplicationItem extends Partial<Application> {
  id: string;
  applicationId: string;
  fullName: string;
  city?: string;
  submissionDate: string;
  status: string;
  lockInfo?: LockInfo;
  isDownloaded?: boolean;
  standardPrice?: number;
  discountedPrice?: number;
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
  downloadDate: string;
  paymentAmount?: number;
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
}

export type LockType = 'temporary' | '24hours' | '1week' | 'permanent';
