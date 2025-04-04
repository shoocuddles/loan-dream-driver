import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// System settings
export const getSystemSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .single();
      
    if (error) {
      console.error('Error fetching system settings:', error);
      // Return default values if we can't get the settings
      return {
        standardPrice: 9.99,
        discountedPrice: 4.99,
        lockoutPeriodHours: 24
      };
    }
    
    return data;
  } catch (error) {
    console.error('Exception in getSystemSettings:', error);
    // Return default values if we can't get the settings
    return {
      standardPrice: 9.99,
      discountedPrice: 4.99,
      lockoutPeriodHours: 24
    };
  }
};

// Update system settings
export const updateSystemSettings = async (settings: {
  standardPrice: number;
  discountedPrice: number;
  lockoutPeriodHours: number;
}) => {
  const { error } = await supabase
    .from('system_settings')
    .update(settings)
    .eq('id', 1);
    
  if (error) {
    console.error('Error updating system settings:', error);
    throw error;
  }
  
  return true;
};

// Applications
export const submitApplication = async (application: any) => {
  const { data, error } = await supabase
    .from('applications')
    .insert([application])
    .select();
    
  if (error) {
    console.error('Error submitting application:', error);
    throw error;
  }
  
  return data[0];
};

export const getApplications = async () => {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching applications:', error);
    throw error;
  }
  
  return data || [];
};

// Dealers
export const getDealers = async () => {
    const { data, error } = await supabase
        .from('dealers')
        .select('*');

    if (error) {
        console.error('Error fetching dealers:', error);
        return [];
    }

    return data || [];
};

export const getDealerById = async (id: string) => {
    const { data, error } = await supabase
        .from('dealers')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching dealer by ID:', error);
        return null;
    }

    return data || null;
};

export const createDealer = async (dealer: any) => {
    const { data, error } = await supabase
        .from('dealers')
        .insert([dealer])
        .select();

    if (error) {
        console.error('Error creating dealer:', error);
        throw error;
    }

    return data ? data[0] : null;
};

export const updateDealer = async (id: string, updates: any) => {
    const { data, error } = await supabase
        .from('dealers')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) {
        console.error('Error updating dealer:', error);
        throw error;
    }

    return data ? data[0] : null;
};

export const deleteDealer = async (id: string) => {
    const { error } = await supabase
        .from('dealers')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting dealer:', error);
        throw error;
    }

    return true;
};
