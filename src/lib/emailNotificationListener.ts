
import { supabase } from "@/integrations/supabase/client";
import { sendDealerNotifications } from "@/lib/emailService";
import { toast } from "sonner";

/**
 * Sets up a realtime listener for new application submissions
 * and triggers dealer email notifications automatically
 */
export const setupEmailNotificationListener = () => {
  console.log("🔔 Setting up realtime notification listener for new application submissions");
  
  try {
    // Create a subscription to the applications table for INSERT events
    const channel = supabase
      .channel('application-submissions')
      .on(
        'postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'applications',
          filter: 'status=eq.submitted'
        }, 
        async (payload) => {
          console.log("📬 New submitted application detected via realtime:", payload.new);
          
          // Check if the new application has 'submitted' status
          if (payload.new && payload.new.status === 'submitted') {
            console.log("🔔 Triggering dealer notifications for new application:", payload.new.id);
            
            try {
              // Send notifications only to dealers with email_notifications=true
              const result = await sendDealerNotifications(payload.new.id);
              
              if (result.success) {
                console.log("✅ Email notifications sent successfully:", result);
                toast.success(`Email notifications sent to ${result.dealersNotified} dealers`);
              } else {
                console.error("❌ Failed to send email notifications:", result.error);
                toast.error("Failed to send dealer notifications automatically");
              }
            } catch (error) {
              console.error("❌ Error in notification listener:", error);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 Realtime subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to application submissions");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Error subscribing to application submissions");
          toast.error("Failed to set up automatic dealer notifications");
        }
      });

    // Return unsubscribe function for cleanup
    return () => {
      console.log("🛑 Removing realtime notification listener");
      supabase.removeChannel(channel);
    };
  } catch (error) {
    console.error("❌ Error setting up notification listener:", error);
    toast.error("Failed to initialize automatic notifications");
    return () => {}; // Return empty function for consistent API
  }
};

/**
 * Set up a diagnostic test to check if Supabase realtime is working
 */
export const testRealtimeConnection = async () => {
  try {
    console.log("🧪 Testing Supabase realtime connection...");
    
    // Make sure realtime is enabled for the table
    const { data: realtimeEnabled, error: realtimeError } = await supabase
      .rpc('is_realtime_enabled_for_table', { 
        table_name: 'applications' 
      });
    
    if (realtimeError) {
      console.warn("⚠️ Could not check realtime configuration:", realtimeError);
    } else {
      console.log("📋 Is realtime enabled for applications table:", realtimeEnabled);
      
      if (!realtimeEnabled) {
        console.error("❌ Realtime is not enabled for the applications table!");
        return false;
      }
    }
    
    // Test the connection by setting up a test channel
    const channel = supabase.channel('test-connection');
    
    const subscription = channel
      .on('presence', { event: 'sync' }, () => {
        console.log("✅ Realtime sync event received - connection working");
      })
      .subscribe(status => {
        console.log("🔄 Realtime test status:", status);
      });
    
    // Cleanup after a short delay
    setTimeout(() => {
      supabase.removeChannel(channel);
    }, 5000);
    
    return true;
  } catch (error) {
    console.error("❌ Error testing realtime connection:", error);
    return false;
  }
};

/**
 * Force test the database trigger functionality
 */
export const testDatabaseTrigger = async () => {
  console.log("🧪 Testing database trigger for dealer notifications...");
  
  try {
    // Use direct RPC call to test the trigger function
    const { data, error } = await supabase.functions.invoke("send-dealer-notification", {
      body: {
        trigger_source: "direct_test",
        test_trigger: true
      }
    });
    
    if (error) {
      console.error("❌ Error testing database trigger:", error);
      return false;
    }
    
    console.log("✅ Database trigger test result:", data);
    return true;
  } catch (error) {
    console.error("❌ Error testing database trigger:", error);
    return false;
  }
};
