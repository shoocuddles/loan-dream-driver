
export type SystemSettings = {
  id: number;
  standardPrice: number;
  discountedPrice: number;
  lockoutPeriodHours: number;
  updated_at: string;
}

export type Application = {
  id: string;
  created_at: string;
  updated_at: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  vehicleType: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  income: number;
  employmentStatus: string;
  creditScore: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  isLocked?: boolean;
  lockExpiresAt?: string;
  lockedBy?: string;
}

export type ApplicationLock = {
  id: string;
  application_id: string;
  dealer_id: string;
  locked_at: string;
  expires_at: string;
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
  name: string;
  company: string;
  isActive: boolean;
  isAdmin: boolean;
  created_at: string;
}
