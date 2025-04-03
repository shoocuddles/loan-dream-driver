
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { signOutDealer, supabase } from "@/lib/supabase";

const DealerHeader = () => {
  const [dealerName, setDealerName] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadDealerInfo = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setDealerName(data.user.user_metadata.name || "Dealer");
        }
      } catch (error) {
        console.error("Error loading dealer info:", error);
      }
    };
    
    loadDealerInfo();
  }, []);

  const handleLogout = async () => {
    try {
      await signOutDealer();
      navigate('/dealers');
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Failed",
        description: "There was a problem logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-ontario-blue">Dealer Dashboard</h1>
        <p className="text-gray-600">Welcome, {dealerName}</p>
      </div>
      <Button 
        variant="outline" 
        onClick={handleLogout}
        className="text-ontario-blue border-ontario-blue hover:bg-ontario-blue/10"
      >
        Logout
      </Button>
    </div>
  );
};

export default DealerHeader;
