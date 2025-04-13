
import { Application } from '../types/supabase';

export interface ApplicationItem {
  applicationId: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  city?: string;
  address?: string;
  province?: string;
  postalCode?: string;
  vehicleType?: string;
  submissionDate: string;
  status: string;
  isLocked?: boolean;
  lockExpiresAt?: string;
  lockedBy?: string;
  employmentStatus?: string;
  monthlyIncome?: string;
  employerName?: string;
  jobTitle?: string;
  employmentDuration?: string;
  hasExistingLoan?: boolean;
  currentPayment?: string;
  amountOwed?: string;
  currentVehicle?: string;
  mileage?: string;
  requiredFeatures?: string;
  unwantedColors?: string;
  preferredMakeModel?: string;
  additionalNotes?: string;
  isPurchased?: boolean;
  isDownloaded?: boolean;
  standardPrice?: number;
  discountedPrice?: number;
  lockInfo?: {
    isLocked: boolean;
    expiresAt?: string;
    lockedBy?: string;
    isOwnLock?: boolean;
    lockType?: string;
  };
  id?: string; // For compatibility with AdminDashboard
}

export interface DealerItem {
  id: string;
  email: string;
  name: string; 
  company: string;
  isActive: boolean;
  isAdmin: boolean;
  created_at: string;
  passwordHash: string;
  stripeCustomerId?: string;
  pauseStatus?: PauseStatus;
}

export interface PauseStatus {
  isPaused: boolean;
  isPermanent?: boolean;
  pauseId?: string;
  pausedAt?: string;
}
