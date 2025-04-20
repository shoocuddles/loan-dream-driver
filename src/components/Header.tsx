
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Header = () => {
  const { user, isAdmin } = useAuth();
  const isLoggedIn = !!user;
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  
  return (
    <header className="bg-ontario-blue text-white py-4 shadow-md fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto flex justify-between items-center px-4 md:px-0">
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity pl-[75px]">
          <img 
            src="/lovable-uploads/06403d44-3c3b-4d15-9e8d-a397fdfb1c97.png" 
            alt="Ontario Loans Logo" 
            className="h-10 w-auto object-contain invert" 
            onError={(e) => {
              console.error("Logo failed to load");
              e.currentTarget.style.display = 'none';
            }}
          />
          <span className="text-2xl font-bold tracking-tight sr-only">Ontario Loans</span>
        </Link>
        
        {isLoggedIn && !isHomePage ? (
          <div className="flex-1 text-center">
            <h2 className="text-xl font-semibold">Dealer Zone</h2>
          </div>
        ) : (
          <div className="flex gap-4">
            <Button asChild variant="outline" className="text-white bg-transparent border-white hover:bg-white/10 hover:scale-105 transition-all">
              <Link to="/apply">Apply Now</Link>
            </Button>
            <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:scale-105 transition-all">
              <Link to="/dealers" className="text-sm">Dealers</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
            <!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1785916508807201');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=1785916508807201&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->
};

export default Header;
