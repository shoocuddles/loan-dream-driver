
import { supabase } from "@/integrations/supabase/client";
import { UserProfile, Company } from "@/lib/types/auth";
import { Database } from "@/lib/types/supabase-types";
import { safeUserProfile, safeCompany, safeUserProfiles, safeParam } from "./typeUtils";

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', safeParam(userId))
    .single();
  
  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
  
  return safeUserProfile(data);
}

export async function getCompany(companyId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', safeParam(companyId))
    .single();
  
  if (error) {
    console.error("Error fetching company:", error);
    return null;
  }
  
  return safeCompany(data);
}

export async function getCompanyUsers(companyId: string): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('company_id', safeParam(companyId));
  
  if (error) {
    console.error("Error fetching company users:", error);
    return [];
  }
  
  return safeUserProfiles(data || []);
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

export async function resetPasswordWithToken(token: string, newPassword: string) {
  const { error } = await supabase.auth.verifyOtp({
    token,
    type: 'recovery',
    newPassword
  });
  
  if (error) {
    throw error;
  }
  
  return true;
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  return profile?.role === 'admin';
}
