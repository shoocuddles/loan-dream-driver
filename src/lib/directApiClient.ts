
/**
 * Direct API client for Supabase with alternative fetch implementation
 * This provides a backup method when normal Supabase client connections fail
 */

import { toast } from "sonner";

const SUPABASE_URL = "https://kgtfpuvksmqyaraijoal.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtndGZwdXZrc21xeWFyYWlqb2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MjAxMjksImV4cCI6MjA1OTM5NjEyOX0._fj5EqjZBmS_fHB5Z2p2lDJdXilePMUrbf3If_wGBz0";

/**
 * Direct insert method that bypasses the Supabase client for more reliability
 */
export async function directInsertApplication(data: any): Promise<any> {
  try {
    console.log("🔌 Using direct API insert method as fallback");
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Direct API insert failed: ${response.status}`, errorText);
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
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/applications?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Direct API update failed: ${response.status}`, errorText);
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
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
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
