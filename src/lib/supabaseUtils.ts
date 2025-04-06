
import { supabase } from "@/integrations/supabase/client";

/**
 * Utility function to check if Supabase is connected
 */
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log("🔍 Testing Supabase connection...");
    const { error } = await supabase.from('applications').select('id').limit(1);
    
    if (error) {
      console.error("❌ Supabase connection test failed:", error.message);
      return false;
    }
    
    console.log("✅ Supabase connection test successful");
    return true;
  } catch (error: any) {
    console.error("❌ Supabase connection exception:", error.message);
    return false;
  }
};

/**
 * Check for any remaining Firebase dependencies
 */
export const detectFirebaseDependencies = (): void => {
  console.log("🔍 Checking for Firebase dependencies...");
  
  // Look for Firebase in global window object
  const hasFirebaseSDK = 
    typeof window !== 'undefined' && 
    (
      // @ts-ignore - Check for Firebase SDK
      window.firebase || 
      // @ts-ignore - Check for Firebase v9 SDK
      window.firebaseApp || 
      // @ts-ignore - Check for older Firebase
      window.firestore
    );
  
  if (hasFirebaseSDK) {
    console.warn("⚠️ Firebase SDK detected in window object - this should be removed");
  } else {
    console.log("✅ No Firebase SDK detected in window object");
  }
  
  console.log("✅ Firebase dependency check complete");
};
