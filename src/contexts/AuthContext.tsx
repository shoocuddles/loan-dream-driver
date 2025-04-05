
import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { AuthState, UserProfile } from "@/lib/types/auth";

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAdmin: false,
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          setAuthState({
            user: session.user,
            session,
            profile,
            isLoading: false,
            isAdmin: profile?.role === 'admin' || false,
          });
        } else {
          setAuthState({
            user: null,
            session: null,
            profile: null,
            isLoading: false,
            isAdmin: false,
          });
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        setAuthState({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
          isAdmin: false,
        });
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event);
        
        if (session) {
          try {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            setAuthState({
              user: session.user,
              session,
              profile,
              isLoading: false,
              isAdmin: profile?.role === 'admin' || false,
            });
          } catch (error) {
            console.error("Error getting user profile:", error);
          }
        } else {
          setAuthState({
            user: null,
            session: null,
            profile: null,
            isLoading: false,
            isAdmin: false,
          });
        }
      }
    );

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.session) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        // Redirect based on role
        if (profile?.role === 'admin') {
          navigate('/admin-dashboard');
        } else {
          navigate('/dealer-dashboard');
        }

        toast({
          title: "Login Successful",
          description: `Welcome back, ${profile?.full_name || email}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "An error occurred while signing in",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      // Add debug log to check userData structure
      console.log("Signing up user with data:", { email, userData });
      
      // Prepare metadata with proper company_id format
      const userMetadata = {
        full_name: userData.fullName,
        role: userData.role || 'dealer',
        company_id: userData.companyId || '11111111-1111-1111-1111-111111111111'
      };
      
      console.log("User metadata being sent:", userMetadata);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userMetadata
        }
      });

      if (error) {
        console.error("Signup error:", error);
        throw error;
      }

      console.log("Signup successful:", data);

      toast({
        title: "Registration Successful",
        description: "Your account has been created. You can now log in.",
      });

      // Navigate to login page
      navigate('/dealers');
    } catch (error: any) {
      console.error("Registration error details:", error);
      
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred while signing up",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/dealers');
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to log out.",
        variant: "destructive",
      });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });

      if (error) throw error;

      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for the password reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!authState.user) {
      toast({
        title: "Error",
        description: "You must be logged in to update your profile.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(data)
        .eq('id', authState.user.id);

      if (error) throw error;

      // Update local state with new profile data
      setAuthState(prev => ({
        ...prev,
        profile: prev.profile ? {
          ...prev.profile,
          ...data
        } : null
      }));

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
