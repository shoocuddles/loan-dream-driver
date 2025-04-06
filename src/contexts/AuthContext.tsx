
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
    console.log("Starting signUp with:", { email, password: '****', userData });

    // Create the proper metadata structure expected by the trigger function
    const userMetadata = {
      full_name: userData.fullName,
      role: userData.role || 'dealer',
      company_id: userData.company_id || '11111111-1111-1111-1111-111111111111',
      company_name: userData.companyName || '',
    };

    console.log("Sending metadata to Supabase:", userMetadata);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userMetadata
      }
    });

    // Log full response
    console.log("Supabase signUp response:", { data, error });

    // If there's an error, log detailed context
    if (error) {
      console.error("Supabase signUp error details:", {
        message: error.message,
        code: error.code,
        status: error.status,
        context: error,
      });

      toast({
        title: "Registration Failed",
        description: error.message || "Signup failed with an unknown error.",
        variant: "destructive",
      });

      throw error;
    }

    toast({
      title: "Registration Successful",
      description: "Your account has been created. You can now log in.",
    });

    navigate('/dealers');
  } catch (err: any) {
    console.error("Unhandled signup error:", err);

    toast({
      title: "Signup Error",
      description: err.message || "An unknown error occurred.",
      variant: "destructive",
    });

    throw err;
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
