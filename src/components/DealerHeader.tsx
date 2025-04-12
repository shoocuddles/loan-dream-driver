
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
    <div className="flex flex-col items-center pb-4">
      <div className="w-full flex justify-center mb-4">
        <img 
          src="/lovable-uploads/06403d44-3c3b-4d15-9e8d-a397fdfb1c97.png" 
          alt="Ontario Loans Logo" 
          className="h-20 object-contain"
        />
      </div>
      
      <div className="w-full flex justify-between items-center px-6 md:px-8">
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
    </div>
  );
};

export default DealerHeader;
