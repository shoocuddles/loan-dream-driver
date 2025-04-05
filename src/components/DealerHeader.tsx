
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const DealerHeader = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-ontario-blue">Dealer Dashboard</h1>
        <p className="text-gray-600">Welcome, {profile?.full_name || "Dealer"}</p>
      </div>
      <Button 
        variant="outline" 
        onClick={signOut}
        className="text-ontario-blue border-ontario-blue hover:bg-ontario-blue/10"
      >
        Logout
      </Button>
    </div>
  );
};

export default DealerHeader;
