
export type SystemSettings = {
  id: number;
  standardPrice: number;
  discountedPrice: number;
  lockoutPeriodHours: number;
  updated_at: string;
}

export type Application = {
  id: string;
  applicationId?: string; // Added for compatibility with existing code
  created_at: string;
  updated_at: string;
  
  // Support both camelCase and lowercase (database style) properties 
  // for backwards compatibility during migration
  // camelCase versions (for frontend)
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  streetAddress?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  vehicleType?: string;
  requiredFeatures?: string;
  unwantedColors?: string;
  preferredMakeModel?: string;
  hasExistingLoan?: boolean;
  currentPayment?: string;
  amountOwed?: string;
  currentVehicle?: string;
  mileage?: string;
  employmentStatus?: string;
  monthlyIncome?: string;
  additionalNotes?: string;
  employerName?: string; // Added field
  jobTitle?: string; // Added field
  employmentDuration?: string; // Added field
  
  // lowercase versions (from database)
  fullname?: string;
  phone?: string;
  phonenumber?: string;
  address?: string;
  streetaddress?: string;
  postalcode?: string;
  vehicletype?: string;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  income?: number;
  employmentstatus?: string;
  requiredfeatures?: string;
  unwantedcolors?: string;
  preferredmakemodel?: string;
  hasexistingloan?: boolean;
  currentpayment?: string;
  amountowed?: string;
  currentvehicle?: string;
  additionalnotes?: string;
  employer_name?: string; // Added field
  job_title?: string; // Added field
  employment_duration?: string; // Added field
  creditScore?: string;
  
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  isLocked?: boolean;
  lockExpiresAt?: string;
  lockedBy?: string;
  wasLocked?: boolean; // Added for compatibility with existing code
  isComplete?: boolean;
}

export type ApplicationLock = {
  id: string;
  application_id: string;
  dealer_id: string;
  locked_at: string;
  expires_at: string;
  isLocked?: boolean; // Added for compatibility with existing code
}

export type ApplicationDownload = {
  id: string;
  application_id: string;
  dealer_id: string;
  downloaded_at: string;
}

export type UserDealer = {
  id: string;
  email: string;
  name: string;          // Maps to full_name in user_profiles
  company: string;       // Maps to company_name in user_profiles
  isActive: boolean;
  isAdmin: boolean;
  created_at: string;
  passwordHash: string;  // Required for the type but we don't actually use/store this
  
  // Additional fields for user_profiles compatibility
  full_name?: string;
  company_name?: string;
  role?: 'dealer' | 'admin';
  phone?: string;
  company_id?: string;
}

// Define profile interface for user_profiles table
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  role: 'dealer' | 'admin';
  company_id: string;
  created_at: string;
}

export type DealerPause = {
  id: string;
  dealerId: string;
  isPermanent: boolean;
  pinCode: string;
  pausedAt: string;
  pausedBy: string;
  resumedAt?: string;
  resumedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type PauseStatus = {
  isPaused: boolean;
  isPermanent?: boolean;
  pauseId?: string;
  pausedAt?: string;
}
