
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="bg-ontario-blue text-white py-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center px-4 md:px-0">
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <img 
            src="/lovable-uploads/06403d44-3c3b-4d15-9e8d-a397fdfb1c97.png" 
            alt="Ontario Loans Logo" 
            className="h-10 w-auto object-contain invert" 
            onError={(e) => {
              console.error("Logo failed to load");
              e.currentTarget.style.display = 'none';
            }}
          />
          <span className="text-2xl font-bold tracking-tight">Ontario Loans</span>
        </Link>
        <div className="flex gap-4">
          <Button asChild variant="outline" className="text-white bg-transparent border-white hover:bg-white/10 hover:scale-105 transition-all">
            <Link to="/apply">Apply Now</Link>
          </Button>
          <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:scale-105 transition-all">
            <Link to="/dealers" className="text-sm">Dealers</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
