
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

const PasswordReset = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Extract token from URL on component mount
  useEffect(() => {
    console.log("PasswordReset page loaded");
    console.log("Current URL:", window.location.href);
    
    const extractTokenFromUrl = () => {
      try {
        // Check for direct token in query param
        const urlParams = new URLSearchParams(window.location.search);
        const directToken = urlParams.get('token');
        
        if (directToken) {
          console.log("Found direct token in URL query parameters");
          setToken(directToken);
          return true;
        }
        
        // Check for Supabase format URLs (with type=recovery)
        const recoveryType = urlParams.get('type');
        if (recoveryType === 'recovery') {
          const recoveryToken = urlParams.get('token');
          if (recoveryToken) {
            console.log("Found recovery token in URL query parameters");
            setToken(recoveryToken);
            return true;
          }
        }
        
        // Check for hash fragment (#access_token=...)
        if (window.location.hash) {
          console.log("Found hash in URL:", window.location.hash);
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          
          if (accessToken) {
            console.log("Successfully extracted access token from hash");
            setToken(accessToken);
            return true;
          }
        }
        
        // No token found in URL
        console.error("No token found in URL");
        setTokenError("No password reset token found. Please request a new reset link.");
        return false;
      } catch (error) {
        console.error("Failed to parse URL for token:", error);
        setTokenError("Invalid password reset link. Please request a new one.");
        return false;
      }
    };
    
    // Extract token and clean up URL for security
    const hasToken = extractTokenFromUrl();
    if (hasToken && (window.location.hash || window.location.search)) {
      // Store token securely in session storage
      if (token) {
        sessionStorage.setItem('passwordResetToken', token);
      }
      
      // Clean up URL by removing sensitive parameters
      window.history.replaceState(null, '', '/PasswordReset');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
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
      console.log("Attempting to reset password with the token");

      // Retrieve token from state or session storage
      const resetToken = token || sessionStorage.getItem('passwordResetToken');
      
      if (!resetToken) {
        toast.error("Password reset token not found. Please request a new reset link.");
        setTokenError("Password reset token not found. Please request a new reset link.");
        return;
      }
      
      // Use Supabase API to verify the token and set the new password
      const { error } = await supabase.auth.verifyOtp({
        token: resetToken,
        type: 'recovery',
        newPassword: password
      });
      
      if (error) {
        console.error("Reset password error:", error);
        toast.error(error.message || "Password reset failed. Please try again or request a new reset link.");
        setTokenError("Password reset failed. Please try again or request a new reset link.");
        throw error;
      }
      
      console.log("Password reset successful");
      // Clear stored token
      sessionStorage.removeItem('passwordResetToken');
      
      toast.success("Your password has been reset successfully. Please sign in with your new password.");
      setTimeout(() => navigate("/dealers"), 2000); // Redirect to login page after success message
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
              <CardTitle className="text-2xl text-center">Enter Your New Password</CardTitle>
              <CardDescription className="text-center">
                Please choose a new password for your account
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
              <form onSubmit={handlePasswordReset}>
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
                    {isProcessing ? "Setting New Password..." : "Save New Password"}
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

export default PasswordReset;
