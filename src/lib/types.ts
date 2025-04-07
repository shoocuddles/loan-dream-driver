
export type ApplicationForm = {
  // Step 1: Personal Info
  fullName: string;
  phoneNumber: string;
  email: string;
  streetAddress: string;
  city: string;
  province: 'Ontario' | 'Quebec';
  postalCode: string;
  
  // Step 2: Desired Vehicle
  vehicleType: 'Car' | 'SUV' | 'Truck' | 'Van' | '';
  requiredFeatures: string;
  unwantedColors: string;
  preferredMakeModel: string;
  
  // Step 3: Existing Car Loan
  hasExistingLoan: boolean;
  currentPayment?: string;
  amountOwed?: string;
  currentVehicle?: string;
  mileage?: string;
  
  // Step 4: Income Details
  employmentStatus: 'Employed' | 'Unemployed' | 'Self-Employed' | 'Student' | 'Retired' | 'Disability' | '';
  monthlyIncome: string;
  employerName?: string; // New field for employer name
  jobTitle?: string; // New field for job title
  employmentDuration?: string; // New field for employment duration
  additionalNotes: string;
  
  // Metadata
  submissionDate?: string;
  applicationId?: string;
  isLocked?: boolean;
  lockExpiresAt?: string;
  lockedBy?: string;
}

export type Dealer = {
  id: string;
  email: string;
  name: string;
  company: string;
  isAdmin: boolean;
  isActive: boolean;
  passwordHash: string;
  stripeCustomerId?: string;
}

export type ApplicationDownload = {
  id: string;
  applicationId: string;
  dealerId: string;
  downloadDate: string;
  paymentAmount: number;
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentId?: string;
  isDiscounted: boolean;
}

export type SystemSettings = {
  standardPrice: number;
  discountedPrice: number;
  lockoutPeriodHours: number;
}
