
import { supabase } from "@/integrations/supabase/client";

/**
 * A utility function to check if Supabase is properly connected
 * This can help identify Firebase vs Supabase issues
 */
export const checkSupabaseConnection = async () => {
  try {
    console.log("🔍 Testing Supabase connection...");
    
    // Simple test query to verify connection
    const { data, error } = await supabase
      .from('applications')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error("❌ Supabase connection test failed:", error);
      return false;
    }
    
    console.log("✅ Supabase connection successful");
    return true;
  } catch (err) {
    console.error("❌ Unexpected error testing Supabase connection:", err);
    return false;
  }
};

/**
 * Utility to help identify any Firebase dependencies
 */
export const detectFirebaseDependencies = () => {
  // Check for common Firebase globals
  const possibleFirebaseGlobals = [
    'firebase',
    'firestore',
    'FirebaseError'
  ];
  
  console.log("🔍 Checking for Firebase dependencies...");
  
  for (const global of possibleFirebaseGlobals) {
    // @ts-ignore - Intentional check for globals
    if (window[global]) {
      console.warn(`⚠️ Found potential Firebase dependency: ${global} exists in global scope`);
    }
  }
  
  // Check for scripts containing firebase
  const scripts = document.querySelectorAll('script');
  scripts.forEach(script => {
    if (script.src && script.src.includes('firebase')) {
      console.warn(`⚠️ Found Firebase script: ${script.src}`);
    }
  });
  
  console.log("✅ Firebase dependency check complete");
};
