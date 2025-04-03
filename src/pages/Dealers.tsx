
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { signInDealer, signUpDealer } from "@/lib/supabase";

const Dealers = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [dealerName, setDealerName] = useState("");
  const [company, setCompany] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginEmail || !loginPassword) {
      toast({
        title: "Missing Fields",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      // Special case for admin login
      if (loginEmail === "6352910@gmail.com" && loginPassword === "Ian123") {
        localStorage.setItem('isAdmin', 'true');
        navigate('/admin-dashboard');
        return;
      }
      
      await signInDealer(loginEmail, loginPassword);
      toast({
        title: "Login Successful",
        description: "Welcome back to Ontario Loans dealer portal.",
      });
      navigate('/dealer-dashboard');
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupEmail || !signupPassword || !dealerName || !company) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all fields to create your account.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      await signUpDealer(signupEmail, signupPassword, dealerName, company);
      toast({
        title: "Account Created",
        description: "Your dealer account has been created. You can now log in.",
      });
      // Clear form and switch to login tab
      setSignupEmail("");
      setSignupPassword("");
      setDealerName("");
      setCompany("");
    } catch (error) {
      console.error("Signup error:", error);
      toast({
        title: "Registration Failed",
        description: "There was a problem creating your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-16 bg-ontario-gray">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-center mb-10 text-ontario-blue">Ontario Loans Dealer Portal</h1>
          
          <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
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
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="loginPassword">Password</Label>
                    <Input
                      id="loginPassword"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-ontario-blue hover:bg-ontario-blue/90"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Logging in..." : "Login"}
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
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="company">Dealership Name</Label>
                    <Input
                      id="company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="signupEmail">Email</Label>
                    <Input
                      id="signupEmail"
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="signupPassword">Password</Label>
                    <Input
                      id="signupPassword"
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-ontario-blue hover:bg-ontario-blue/90"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dealers;
