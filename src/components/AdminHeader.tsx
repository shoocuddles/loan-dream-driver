
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { signOutDealer } from "@/lib/supabase";

const AdminHeader = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    try {
      signOutDealer();
      localStorage.removeItem('isAdmin');
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
        <h1 className="text-3xl font-bold text-ontario-blue">Admin Dashboard</h1>
        <p className="text-gray-600">Manage dealers and applications</p>
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

export default AdminHeader;
