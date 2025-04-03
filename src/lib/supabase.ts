
import { createClient } from '@supabase/supabase-js';
import { ApplicationForm, Dealer, ApplicationDownload } from './types';

// Check for environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a mock client if environment variables are missing
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      // Mock implementation for development without Supabase credentials
      from: () => ({
        insert: async () => ({ data: null, error: null }),
        select: async () => ({ data: [], error: null }),
        eq: () => ({ single: async () => ({ data: null, error: null }) }),
        order: () => ({ data: [], error: null }),
      }),
      auth: {
        signUp: async () => ({ data: null, error: null }),
        signInWithPassword: async () => ({ data: null, error: null }),
        signOut: async () => ({ error: null }),
      },
    };

// Application form functions
export const submitApplication = async (formData: ApplicationForm) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Running in mock mode.');
    const applicationId = `MOCK-APP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const submissionDate = new Date().toISOString();
    return { applicationId, submissionDate };
  }

  const applicationId = `APP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const submissionDate = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('applications')
    .insert([
      { 
        ...formData, 
        applicationId, 
        submissionDate 
      }
    ]);
    
  if (error) throw error;
  return { applicationId, submissionDate };
};

// Dealer authentication functions
export const signUpDealer = async (email: string, password: string, name: string, company: string) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Running in mock mode.');
    return { user: { id: 'mock-user-id' } };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        company,
        isAdmin: false
      }
    }
  });
  
  if (error) throw error;
  return data;
};

export const signInDealer = async (email: string, password: string) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Running in mock mode.');
    return { user: { id: 'mock-user-id' } };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return data;
};

export const signOutDealer = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Running in mock mode.');
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Application retrieval functions
export const getApplicationsList = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Running in mock mode.');
    return [
      { 
        applicationId: 'MOCK-APP-1', 
        fullName: 'John D.', 
        submissionDate: new Date().toISOString() 
      },
      { 
        applicationId: 'MOCK-APP-2', 
        fullName: 'Jane S.', 
        submissionDate: new Date(Date.now() - 86400000).toISOString() 
      }
    ];
  }

  const { data, error } = await supabase
    .from('applications')
    .select('applicationId, fullName, submissionDate')
    .order('submissionDate', { ascending: false });
    
  if (error) throw error;
  
  // Format names to show only first name and last initial
  return data.map((app: any) => {
    const nameParts = app.fullName.split(' ');
    const firstName = nameParts[0];
    const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1].charAt(0) + '.' : '';
    
    return {
      ...app,
      fullName: `${firstName} ${lastInitial}`
    };
  });
};

export const getApplicationDetails = async (applicationId: string) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Running in mock mode.');
    return {
      applicationId,
      fullName: 'John Doe',
      phoneNumber: '555-123-4567',
      email: 'john.doe@example.com',
      streetAddress: '123 Main St',
      city: 'Toronto',
      province: 'Ontario',
      postalCode: 'M1M 1M1',
      vehicleType: 'SUV',
      requiredFeatures: 'Leather seats, Backup camera',
      unwantedColors: 'Beige, Yellow',
      preferredMakeModel: 'Honda CR-V',
      hasExistingLoan: true,
      currentPayment: '$350',
      amountOwed: '$12,000',
      currentVehicle: 'Toyota Corolla',
      mileage: '75,000',
      employmentStatus: 'Employed',
      monthlyIncome: '$4,500',
      additionalNotes: 'Looking for low interest rate',
      submissionDate: new Date().toISOString()
    };
  }

  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('applicationId', applicationId)
    .single();
    
  if (error) throw error;
  return data;
};

// Download tracking functions
export const recordDownload = async (applicationId: string, dealerId: string, paymentAmount: number) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Running in mock mode.');
    return null;
  }

  const { data, error } = await supabase
    .from('downloads')
    .insert([
      {
        applicationId,
        dealerId,
        downloadDate: new Date().toISOString(),
        paymentAmount,
        paymentStatus: 'completed'
      }
    ]);
    
  if (error) throw error;
  return data;
};

// Admin functions
export const checkIsAdmin = async (userId: string) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Running in mock mode.');
    return userId === '6352910@gmail.com';
  }

  const { data, error } = await supabase
    .from('dealers')
    .select('isAdmin')
    .eq('id', userId)
    .single();
    
  if (error) throw error;
  return data?.isAdmin || false;
};

export const getAllApplications = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Running in mock mode.');
    return [
      {
        applicationId: 'MOCK-APP-1',
        fullName: 'John Doe',
        submissionDate: new Date().toISOString(),
        province: 'Ontario',
        vehicleType: 'SUV'
      },
      {
        applicationId: 'MOCK-APP-2',
        fullName: 'Jane Smith',
        submissionDate: new Date(Date.now() - 86400000).toISOString(),
        province: 'Quebec',
        vehicleType: 'Car'
      }
    ];
  }

  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .order('submissionDate', { ascending: false });
    
  if (error) throw error;
  return data;
};
