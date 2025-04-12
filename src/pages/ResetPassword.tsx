
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Extract token from URL or session storage
  useEffect(() => {
    console.log("Reset password page loaded");
    
    // Check URL for token in different formats
    const extractToken = () => {
      try {
        // Check for hash fragment (#access_token=...)
        if (window.location.hash) {
          console.log("Found hash in URL:", window.location.hash);
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          
          if (accessToken) {
            console.log("Successfully extracted access token from hash");
            sessionStorage.setItem('resetPasswordToken', accessToken);
            return true;
          }
        }
        
        // Check for query parameter (?token=...)
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        
        if (urlToken) {
          console.log("Found token in URL query parameters");
          // We don't need to store this as Supabase will handle it automatically
          return true;
        }
        
        return false;
      } catch (error) {
        console.error("Failed to parse URL for token:", error);
        setTokenError("Invalid password reset link. Please request a new one.");
        return false;
      }
    };
    
    const hasToken = extractToken();
    console.log("Token extraction result:", hasToken ? "token found" : "no token found");
    
    // Clean up the URL by removing the hash or query params
    if (hasToken) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords don't match. Please ensure both passwords match.");
      return;
    }
    
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    try {
      setIsProcessing(true);
      console.log("Attempting to reset password");
      
      // We don't need the token for updateUser - Supabase handles this
      // as long as the user has a valid session from the recovery link
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        console.error("Reset password error:", error);
        toast.error(error.message || "Password reset failed. Please try again or request a new reset link.");
        setTokenError("Password reset failed. Please try again or request a new reset link.");
        throw error;
      }
      
      console.log("Password reset successful");
      // Clear any stored token
      sessionStorage.removeItem('resetPasswordToken');
      
      toast.success("Your password has been reset successfully. Please sign in with your new password.");
      setTimeout(() => navigate("/dealers"), 2000); // Redirect after success message
    } catch (error: any) {
      console.error("Reset password error details:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-16 bg-ontario-gray">
        <div className="container mx-auto px-4">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Reset Your Password</CardTitle>
              <CardDescription className="text-center">
                Please enter your new password
              </CardDescription>
            </CardHeader>
            
            {tokenError ? (
              <CardContent className="space-y-4">
                <div className="bg-red-50 text-red-800 p-4 rounded-md">
                  <p>{tokenError}</p>
                </div>
                <div className="text-center mt-4">
                  <Button variant="outline" onClick={() => navigate("/forgot-password")}>
                    Request New Reset Link
                  </Button>
                </div>
              </CardContent>
            ) : (
              <form onSubmit={handleResetPassword}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-gray-500">Must be at least 8 characters long</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full bg-ontario-blue hover:bg-ontario-blue/90"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Resetting Password..." : "Reset Password"}
                  </Button>
                </CardFooter>
              </form>
            )}
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ResetPassword;
