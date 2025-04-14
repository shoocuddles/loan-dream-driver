
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Function to manually trigger the dealer notification edge function
export const sendDealerNotifications = async () => {
  try {
    console.log("🔔 Manually triggering dealer notifications");
    
    const { data, error } = await supabase.functions.invoke("send-dealer-notification", {
      body: {
        trigger_source: "manual_button"
      }
    });
    
    console.log("📧 Dealer notification response:", data);
    
    if (error) {
      console.error("❌ Error from dealer notification function:", error);
      throw error;
    }
    
    if (data?.success) {
      return {
        success: true,
        applicationsProcessed: data.applicationsProcessed,
        dealersNotified: data.dealersNotified,
        results: data.results
      };
    } else {
      throw new Error(data?.error || "Function returned success: false");
    }
  } catch (error) {
    console.error("❌ Error triggering dealer notifications:", error);
    toast.error(`Failed to send notifications: ${error.message || "Unknown error"}`);
    return {
      success: false,
      error: error.message
    };
  }
};

// Function to check notification status for an application
export const checkNotificationStatus = async (applicationId: string) => {
  try {
    const { data, error } = await supabase
      .from("application_notifications")
      .select("*")
      .eq("application_id", applicationId);
      
    if (error) throw error;
    
    return {
      success: true,
      notified: data && data.length > 0,
      notifications: data
    };
  } catch (error) {
    console.error("❌ Error checking notification status:", error);
    return {
      success: false,
      notified: false,
      error: error.message
    };
  }
};

// New function to test the database trigger
export const testNotificationTrigger = async () => {
  try {
    console.log("🧪 Testing notification database trigger");
    
    // Create a test application with "submitted" status to test the trigger
    const { data, error } = await supabase
      .from("applications")
      .insert({
        fullname: "Test Notification Trigger",
        status: "submitted",
        iscomplete: true
      })
      .select();
      
    if (error) throw error;
    
    console.log("✅ Created test application to verify trigger:", data);
    
    // Wait a moment for the trigger to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if notification was created
    if (data && data.length > 0) {
      const { data: notificationData, error: notificationError } = await supabase
        .from("application_notifications")
        .select("*")
        .eq("application_id", data[0].id)
        .limit(1);
        
      if (notificationError) throw notificationError;
      
      console.log("📋 Notification check result:", notificationData);
      
      return {
        success: true,
        triggered: notificationData && notificationData.length > 0,
        testApplicationId: data[0].id
      };
    }
    
    return {
      success: false,
      message: "Could not create test application"
    };
  } catch (error) {
    console.error("❌ Error testing notification trigger:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// New function to verify realtime is configured properly
export const checkRealtimeConfiguration = async () => {
  try {
    console.log("🔍 Checking if realtime is enabled for applications table");
    
    const { data, error } = await supabase
      .rpc('is_realtime_enabled_for_table', { 
        table_name: 'applications' 
      });
    
    if (error) {
      console.error("❌ Error checking realtime configuration:", error);
      return {
        success: false,
        isEnabled: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      isEnabled: !!data
    };
  } catch (error) {
    console.error("❌ Error checking realtime config:", error);
    return {
      success: false,
      isEnabled: false,
      error: error.message
    };
  }
};
