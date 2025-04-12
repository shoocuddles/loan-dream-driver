
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoadingPage from "@/components/LoadingPage";
import ContentProtection from "@/components/ContentProtection";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Apply from "./pages/Apply";
import Dealers from "./pages/Dealers";
import DealerDashboard from "./pages/DealerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PasswordReset from "./pages/PasswordReset";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/terms" element={<Terms />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/apply" element={<Apply />} />
    <Route path="/dealers" element={<Dealers />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    {/* New route for the password reset after email link */}
    <Route path="/PasswordReset" element={<PasswordReset />} />
    <Route 
      path="/dealer-dashboard" 
      element={
        <ProtectedRoute>
          <DealerDashboard />
        </ProtectedRoute>
      } 
    />
    <Route 
      path="/admin-dashboard" 
      element={
        <ProtectedRoute requireAdmin={true}>
          <AdminDashboard />
        </ProtectedRoute>
      } 
    />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  // Only show loading screen on first visit
  useEffect(() => {
    const hasVisited = sessionStorage.getItem("hasVisitedBefore");
    const isPasswordResetRoute = window.location.pathname.includes("/reset-password") || 
                                window.location.pathname.includes("/PasswordReset");
    
    if (hasVisited || isPasswordResetRoute) {
      setIsLoading(false);
    } else {
      sessionStorage.setItem("hasVisitedBefore", "true");
    }
  }, []);
  
  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ContentProtection>
          <Toaster />
          <Sonner />
          {isLoading ? (
            <LoadingPage onLoadComplete={handleLoadingComplete} />
          ) : (
            <BrowserRouter>
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </BrowserRouter>
          )}
        </ContentProtection>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
