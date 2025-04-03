
import { createClient } from '@supabase/supabase-js';
import { ApplicationForm, Dealer, ApplicationDownload } from './types';

// This will be replaced with your Supabase URL and anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Application form functions
export const submitApplication = async (formData: ApplicationForm) => {
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return data;
};

export const signOutDealer = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Application retrieval functions
export const getApplicationsList = async () => {
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
  const { data, error } = await supabase
    .from('dealers')
    .select('isAdmin')
    .eq('id', userId)
    .single();
    
  if (error) throw error;
  return data?.isAdmin || false;
};

export const getAllApplications = async () => {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .order('submissionDate', { ascending: false });
    
  if (error) throw error;
  return data;
};
