
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="bg-ontario-blue text-white py-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Ontario Loans Logo" className="h-10 w-auto" />
          <span className="text-2xl font-bold">Ontario Loans</span>
        </Link>
        <div className="flex gap-4">
          <Button asChild variant="outline" className="text-white bg-transparent border-white hover:bg-white/10">
            <Link to="/apply">Apply Now</Link>
          </Button>
          <Button asChild variant="ghost" className="text-white hover:bg-white/10">
            <Link to="/dealers" className="text-sm">Dealers</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
