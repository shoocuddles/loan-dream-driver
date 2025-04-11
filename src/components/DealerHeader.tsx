
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface DealerHeaderProps {
  user?: any;
  onSignOut?: () => Promise<void>;
}

const DealerHeader = ({ user, onSignOut }: DealerHeaderProps) => {
  // Use props if provided, otherwise fallback to context
  const authContext = useAuth();
  const profile = authContext.profile;
  const handleSignOut = onSignOut || authContext.signOut;

  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-ontario-blue">Dealer Dashboard</h1>
        <p className="text-gray-600">Welcome, {profile?.full_name || "Dealer"}</p>
      </div>
      <Button 
        variant="outline" 
        onClick={handleSignOut}
        className="text-ontario-blue border-ontario-blue hover:bg-ontario-blue/10"
      >
        Logout
      </Button>
    </div>
  );
};

export default DealerHeader;
