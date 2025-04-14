
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Function to manually trigger the dealer notification edge function
export const sendDealerNotifications = async () => {
  try {
    console.log("🔔 Manually triggering dealer notifications");
    
    const { data, error } = await supabase.functions.invoke("send-dealer-notification", {
      body: {}
    });
    
    console.log("📧 Dealer notification response:", data);
    
    if (error) throw error;
    
    if (data?.success) {
      return {
        success: true,
        applicationsProcessed: data.applicationsProcessed,
        dealersNotified: data.dealersNotified,
        results: data.results
      };
    } else {
      throw new Error("Function returned success: false");
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
