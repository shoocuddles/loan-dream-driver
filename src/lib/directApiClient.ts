/**
 * Direct API client for Supabase with alternative fetch implementation
 * This provides a backup method when normal Supabase client connections fail
 */

import { toast } from "sonner";

const SUPABASE_URL = "https://kgtfpuvksmqyaraijoal.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtndGZwdXZrc21xeWFyYWlqb2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MjAxMjksImV4cCI6MjA1OTM5NjEyOX0._fj5EqjZBmS_fHB5Z2p2lDJdXilePMUrbf3If_wGBz0";

/**
 * Get auth token from localStorage if available
 */
const getAuthToken = (): string | null => {
  try {
    const supabaseSession = localStorage.getItem('supabase.auth.token');
    if (supabaseSession) {
      const session = JSON.parse(supabaseSession);
      return session?.currentSession?.access_token || null;
    }
    return null;
  } catch (err) {
    console.error('Error getting auth token:', err);
    return null;
  }
};

/**
 * Create auth headers for API requests
 */
const createHeaders = (customHeaders = {}): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Prefer': 'return=representation',
    ...customHeaders
  };

  // For applications, we always use the anon key to avoid RLS issues
  headers['Authorization'] = `Bearer ${SUPABASE_KEY}`;

  return headers;
};

/**
 * Direct fetch for application details to be used as a fallback
 */
export async function directFetchApplicationDetails(applicationIds: string[]): Promise<any[]> {
  try {
    console.log("🔌 Using direct API fetch method for application details");
    
    // Try multiple endpoint formats to increase chances of success
    const endpoints = [
      // Standard format
      `${SUPABASE_URL}/rest/v1/applications?id=in.(${applicationIds.join(',')})`,
      // Alternative format
      `${SUPABASE_URL}/rest/v1/applications?select=*&id=in.(${applicationIds.join(',')})`,
      // Yet another alternative
      `${SUPABASE_URL}/rest/v1/applications?select=*&id=in.(${applicationIds.join('.')})`
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: createHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            console.log(`✅ Direct API fetch successful from ${endpoint}`);
            return data;
          }
        } else {
          console.warn(`⚠️ Direct API fetch failed at ${endpoint}: ${response.status}`);
        }
      } catch (error) {
        console.warn(`⚠️ Error with endpoint ${endpoint}:`, error);
      }
    }
    
    console.error('❌ All direct API fetch attempts failed');
    return [];
  } catch (error) {
    console.error("❌ Direct API fetch exception:", error);
    return [];
  }
}

/**
 * Direct insert method that bypasses the Supabase client for more reliability
 */
export async function directInsertApplication(data: any): Promise<any> {
  try {
    console.log("🔌 Using direct API insert method as fallback");
    
    // Ensure user_id is null to avoid RLS issues with anonymous submissions
    const payload = { ...data };
    payload.user_id = null;
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/applications`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Direct API insert failed: ${response.status}`, errorText);
      
      // Try again with explicit anon auth if previous request failed
      if (response.status === 401) {
        console.log("🔄 Retrying with explicit anonymous authentication");
        const retryResponse = await fetch(`${SUPABASE_URL}/rest/v1/applications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`, 
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(payload)
        });
        
        if (!retryResponse.ok) {
          const retryErrorText = await retryResponse.text();
          console.error(`❌ Retry API insert failed: ${retryResponse.status}`, retryErrorText);
          throw new Error(`Retry API error ${retryResponse.status}: ${retryErrorText}`);
        }
        
        const result = await retryResponse.json();
        console.log("✅ Retry API insert successful:", result);
        return result;
      }
      
      throw new Error(`API error ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log("✅ Direct API insert successful:", result);
    return result;
  } catch (error) {
    console.error("❌ Direct API insert exception:", error);
    throw error;
  }
}

/**
 * Direct update method that bypasses the Supabase client for more reliability
 */
export async function directUpdateApplication(id: string, data: any): Promise<any> {
  try {
    console.log(`🔌 Using direct API update method as fallback for ID: ${id}`);
    
    // Ensure user_id is null to avoid RLS issues with anonymous submissions
    const payload = { ...data };
    payload.user_id = null;
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/applications?id=eq.${id}`, {
      method: 'PATCH',
      headers: createHeaders(),
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Direct API update failed: ${response.status}`, errorText);
      
      // Try again with explicit anon auth if previous request failed
      if (response.status === 401) {
        console.log("🔄 Retrying update with explicit anonymous authentication");
        const retryResponse = await fetch(`${SUPABASE_URL}/rest/v1/applications?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(payload)
        });
        
        if (!retryResponse.ok) {
          const retryErrorText = await retryResponse.text();
          console.error(`❌ Retry API update failed: ${retryResponse.status}`, retryErrorText);
          throw new Error(`Retry API error ${retryResponse.status}: ${retryErrorText}`);
        }
        
        const result = await retryResponse.json();
        console.log("✅ Retry API update successful:", result);
        return result;
      }
      
      throw new Error(`API error ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log("✅ Direct API update successful:", result);
    return result;
  } catch (error) {
    console.error("❌ Direct API update exception:", error);
    throw error;
  }
}

/**
 * Test the direct connection to Supabase
 */
export async function testDirectConnection(): Promise<boolean> {
  try {
    console.log("🔍 Testing direct API connection...");
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/applications?count=exact&limit=1`, {
      method: 'HEAD',
      headers: createHeaders(),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log("✅ Direct API connection successful");
      return true;
    } else {
      console.error(`❌ Direct API connection failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error("❌ Direct API connection exception:", error);
    return false;
  }
}
