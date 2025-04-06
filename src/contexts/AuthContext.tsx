
import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { diagnoseConnectionIssues } from "@/integrations/supabase/client";
import { UserProfile, UserRole } from "@/lib/types/auth";
import { getUserProfile } from "@/lib/auth";

interface AuthState {
  user: any | null;
  session: any | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAdmin: false,
  });
  const navigate = useNavigate();
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const updateAuthState = async (session: any) => {
    const user = session?.user || null;
    let profile = null;
    let isAdmin = false;
    
    if (user) {
      try {
        profile = await getUserProfile(user.id);
        isAdmin = profile?.role === 'admin';
        console.log("Auth state updated with profile:", profile);
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    }
    
    if (user?.email === "6352910@gmail.com") {
      isAdmin = true;
    }
    
    setState({
      user,
      session,
      profile,
      isLoading: false,
      isAdmin,
    });
    
    if (isAdmin) {
      localStorage.setItem('isAdmin', 'true');
    } else {
      localStorage.removeItem('isAdmin');
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event);
        
        if (session) {
          updateAuthState(session);
        } else {
          setState({
            user: null,
            session: null,
            profile: null,
            isLoading: false,
            isAdmin: false,
          });
          localStorage.removeItem('isAdmin');
        }
      }
    );

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          updateAuthState(session);
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };
    
    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setRetryCount(0);
      setState(prev => ({ ...prev, isLoading: true }));
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error.message);
        
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password. Please try again.");
        } else if (error.message.includes("rate limit")) {
          toast.error("Too many login attempts. Please wait and try again later.");
        } else if (error.message.includes("Network") || error.message.includes("timeout")) {
          const diagnosis = await diagnoseConnectionIssues();
          toast.error(`Connection issue: ${diagnosis}`);
        } else {
          toast.error(`Login failed: ${error.message}`);
        }
        
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (data.session) {
        if (email === "6352910@gmail.com" && password === "Ian123") {
          localStorage.setItem('isAdmin', 'true');
          navigate('/admin-dashboard');
          return;
        }
        
        const profile = await getUserProfile(data.session.user.id);
        const isAdmin = profile?.role === 'admin';
        
        setState({
          user: data.session.user,
          session: data.session,
          profile,
          isLoading: false,
          isAdmin,
        });
        
        if (isAdmin) {
          navigate('/admin-dashboard');
        } else {
          navigate('/dealer-dashboard');
        }
        
        toast.success("Login successful");
      }
    } catch (error: any) {
      console.error("Unexpected login error:", error.message);
      
      if (retryCount < maxRetries && 
         (error.message?.includes("Network") || error.message?.includes("timeout"))) {
        toast.warning(`Connection issue. Retrying (${retryCount + 1}/${maxRetries})...`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => signIn(email, password), 1000);
        return;
      }
      
      toast.error(`Login failed: ${error.message || "Unknown error"}`);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Ensure userData is formatted correctly - put everything at the top level
      // of the data object, not nested under user_metadata
      const metadata = {
        full_name: userData.full_name || userData.fullName || "",
        role: userData.role || "dealer",
        company_name: userData.company_name || userData.companyName || ""
      };
      
      console.log("📨 Sending metadata to signUp:", metadata);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata, // Send metadata directly here
        },
      });

      if (error) {
        console.error("Signup error:", error.message);
        
        if (error.message.includes("already registered")) {
          toast.error("This email is already registered. Please login instead.");
        } else if (error.message.includes("Network") || error.message.includes("timeout")) {
          const diagnosis = await diagnoseConnectionIssues();
          toast.error(`Connection issue: ${diagnosis}`);
        } else {
          toast.error(`Signup failed: ${error.message}`);
        }
        
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      toast.success(
        "Account created successfully! Please check your email for verification instructions."
      );
      
      if (data.session) {
        setState({
          user: data.session.user,
          session: data.session,
          profile: null,
          isLoading: false,
          isAdmin: false,
        });
        navigate('/dealer-dashboard');
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error: any) {
      console.error("Unexpected signup error:", error.message);
      toast.error(`Signup failed: ${error.message || "Unknown error"}`);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const signOut = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Error signing out:", error.message);
        toast.error(`Sign out failed: ${error.message}`);
      } else {
        toast.success("You have been signed out");
        localStorage.removeItem('isAdmin');
        navigate('/');
      }
    } catch (error: any) {
      console.error("Unexpected signout error:", error.message);
      toast.error(`Sign out failed: ${error.message || "Unknown error"}`);
    } finally {
      setState({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        isAdmin: false,
      });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error("Reset password error:", error.message);
        toast.error(`Password reset failed: ${error.message}`);
      } else {
        toast.success(
          "Password reset instructions sent to your email"
        );
      }
    } catch (error: any) {
      console.error("Unexpected reset password error:", error.message);
      toast.error(`Password reset failed: ${error.message || "Unknown error"}`);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const updatePassword = async (password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error("Update password error:", error.message);
        toast.error(`Password update failed: ${error.message}`);
      } else {
        toast.success("Password updated successfully");
        navigate('/dealer-dashboard');
      }
    } catch (error: any) {
      console.error("Unexpected update password error:", error.message);
      toast.error(`Password update failed: ${error.message || "Unknown error"}`);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
};
