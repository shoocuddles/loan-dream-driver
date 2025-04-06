
import { supabase } from "@/integrations/supabase/client";
import { UserProfile, Company } from "@/lib/types/auth";
import { Database } from "@/lib/types/supabase-types";

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId as string)
    .single();
  
  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
  
  return data as UserProfile;
}

export async function getCompany(companyId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId as string)
    .single();
  
  if (error) {
    console.error("Error fetching company:", error);
    return null;
  }
  
  return data as Company;
}

export async function getCompanyUsers(companyId: string): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('company_id', companyId as string);
  
  if (error) {
    console.error("Error fetching company users:", error);
    return [];
  }
  
  return (data || []) as UserProfile[];
}

export async function updateUserEmail(newEmail: string) {
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) {
    throw error;
  }
  return true;
}

export async function updateUserPassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    throw error;
  }
  return true;
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  return profile?.role === 'admin';
}
