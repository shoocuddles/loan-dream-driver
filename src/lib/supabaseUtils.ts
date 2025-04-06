
// Utilities for Supabase integration

import { supabase, testSupabaseConnection } from "@/integrations/supabase/client";

/**
 * Check Supabase connection and provide detailed error information
 */
export const checkSupabaseConnection = async () => {
  try {
    console.log("🔍 Testing Supabase connection...");
    const result = await testSupabaseConnection(2);
    
    if (!result.connected) {
      console.error(`❌ Supabase connection test failed: ${result.error || 'Unknown error'}`);
      console.error(`❌ Connection latency: ${result.latency}ms`);
      return false;
    }
    
    console.log(`✅ Supabase connection test successful (${result.latency}ms)`);
    return true;
  } catch (error) {
    console.error("❌ Error in checkSupabaseConnection:", error);
    return false;
  }
};

/**
 * Check if there are Firebase dependencies in the window object
 * (This helps us confirm we're fully migrated to Supabase)
 */
export const detectFirebaseDependencies = () => {
  console.log("🔍 Checking for Firebase dependencies...");
  
  // Check if Firebase SDK is present in window
  if ((window as any).firebase) {
    console.warn("⚠️ Firebase SDK detected in window object");
    return true;
  }
  
  console.log("✅ No Firebase SDK detected in window object");
  
  // Check for specific Firebase libraries
  const firebaseLibraries = [
    'firestore',
    'firebase-app',
    'firebase-auth',
    'firebase-storage',
    'firebase-analytics'
  ];
  
  const detectedLibraries = firebaseLibraries.filter(lib => 
    document.querySelector(`script[src*="${lib}"]`)
  );
  
  if (detectedLibraries.length > 0) {
    console.warn("⚠️ Firebase script tags detected:", detectedLibraries);
    return true;
  }
  
  console.log("✅ Firebase dependency check complete");
  return false;
};

/**
 * Pre-connect to Supabase to warm up the connection
 */
export const preconnectToSupabase = async () => {
  try {
    await supabase.from('applications').select('count').limit(1);
    console.log("🔌 Pre-connected to Supabase");
    return true;
  } catch (error) {
    console.error("❌ Failed to pre-connect to Supabase:", error);
    return false;
  }
};
