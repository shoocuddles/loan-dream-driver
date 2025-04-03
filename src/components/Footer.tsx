
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-ontario-blue text-white py-6">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm">&copy; {new Date().getFullYear()} Ontario Loans. All rights reserved.</p>
          </div>
          <div className="flex gap-6">
            <Link to="/terms" className="text-sm hover:underline">Terms & Conditions</Link>
            <Link to="/privacy" className="text-sm hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
