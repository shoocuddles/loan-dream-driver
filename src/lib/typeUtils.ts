
/**
 * Utility functions for handling Supabase typings and error checking
 */

import { SelectQueryError } from '@supabase/supabase-js';
import { UserProfile, Company } from './types/auth';

/**
 * Helper to safely cast Supabase query response to UserProfile
 * Returns null if data is an error or invalid
 */
export function safeUserProfile(data: any): UserProfile | null {
  // Check if data is an error object
  if (!data || (data as any).error === true) {
    return null;
  }
  
  // Ensure required fields exist
  if (!data.id || !data.email) {
    return null;
  }
  
  return data as UserProfile;
}

/**
 * Helper to safely cast Supabase query response to Company
 * Returns null if data is an error or invalid
 */
export function safeCompany(data: any): Company | null {
  // Check if data is an error object
  if (!data || (data as any).error === true) {
    return null;
  }
  
  // Ensure required fields exist
  if (!data.id || !data.name) {
    return null;
  }
  
  return data as Company;
}

/**
 * Helper to safely cast Supabase query response to UserProfile array
 * Returns empty array if data is an error or invalid
 */
export function safeUserProfiles(data: any): UserProfile[] {
  // Check if data is an error object or not an array
  if (!data || !Array.isArray(data)) {
    return [];
  }
  
  // Filter out any items that don't have required fields
  return data.filter(item => item && item.id && item.email) as UserProfile[];
}

/**
 * Helper to safely cast parameters to string for Supabase filters
 */
export function safeParam(value: any): string {
  if (typeof value === 'string') {
    return value;
  }
  return String(value);
}

/**
 * Type guard to check if a value is a SelectQueryError
 */
export function isQueryError(value: any): value is SelectQueryError<string> {
  return value && (value as any).error === true;
}
