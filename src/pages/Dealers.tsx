import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const Dealers = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [dealerName, setDealerName] = useState("");
  const [company, setCompany] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    
    if (!loginEmail || !loginPassword) {
      setErrorMsg("Please enter both email and password.");
      toast.error("Please enter both email and password.");
      return;
    }
    
    try {
      setIsProcessing(true);
      await signIn(loginEmail, loginPassword);
    } catch (error: any) {
      console.error("Login error:", error);
      setErrorMsg(error.message || "Login failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    
    if (!signupEmail || !signupPassword || !dealerName || !company) {
      setErrorMsg("Please fill in all fields to create your account.");
      toast.error("Please fill in all fields to create your account.");
      return;
    }
    
    try {
      setIsProcessing(true);
      
      console.log("🔍 Starting signup with details:", {
        email: signupEmail,
        fullName: dealerName,
        companyName: company
      });
      
      await signUp(signupEmail, signupPassword, {
        full_name: dealerName,
        role: 'dealer',
        company_name: company,
      });
      
      setSignupEmail("");
      setSignupPassword("");
      setDealerName("");
      setCompany("");
      
      setIsProcessing(false);
    } catch (error: any) {
      console.error("Detailed signup error:", error);
      setErrorMsg(error.message || "Signup failed. Please try again.");
      
      console.error("🔍 [DEALERS] Additional signup error context:", {
        formState: {
          email: signupEmail,
          dealerName,
          company
        }
      });
    }
  };

  const showDebugInfo = process.env.NODE_ENV === 'development' && localStorage.getItem('showDebug') === 'true';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-16 bg-ontario-gray">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-center mb-10 text-ontario-blue pt-[75px]">Ontario Loans Dealer Portal</h1>
          
          {showDebugInfo && (
            <div className="max-w-md mx-auto mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-md">
              <h3 className="text-sm font-bold">🐞 Debug Mode Active</h3>
              <p className="text-xs">Check console for detailed signup logs.</p>
            </div>
          )}
          
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded">
                {errorMsg}
              </div>
            )}
            
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="loginEmail">Email</Label>
                    <Input
                      id="loginEmail"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="loginPassword">Password</Label>
                    <Input
                      id="loginPassword"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <div className="text-right">
                    <Link to="/forgot-password" className="text-sm text-ontario-blue hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-ontario-blue hover:bg-ontario-blue/90"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label htmlFor="dealerName">Your Name</Label>
                    <Input
                      id="dealerName"
                      value={dealerName}
                      onChange={(e) => setDealerName(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="company">Dealership Name</Label>
                    <Input
                      id="company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="signupEmail">Email</Label>
                    <Input
                      id="signupEmail"
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="signupPassword">Password</Label>
                    <Input
                      id="signupPassword"
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-ontario-blue hover:bg-ontario-blue/90"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
          
          {showDebugInfo && (
            <div className="max-w-md mx-auto mt-4 p-3 bg-slate-100 rounded-md">
              <p className="text-xs mb-1">Enable debug info in console:</p>
              <pre className="text-xs bg-slate-200 p-1 rounded">localStorage.setItem('showDebug', 'true')</pre>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dealers;
