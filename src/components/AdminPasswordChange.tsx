
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

const AdminPasswordChange = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const { toast } = useToast();
  
  const handleChangePassword = async () => {
    try {
      setPasswordError("");
      setIsChanging(true);
      
      // Validate inputs
      if (!currentPassword || !newPassword || !confirmPassword) {
        setPasswordError("All fields are required");
        return;
      }
      
      if (newPassword !== confirmPassword) {
        setPasswordError("New passwords do not match");
        return;
      }
      
      if (newPassword.length < 6) {
        setPasswordError("New password must be at least 6 characters");
        return;
      }
      
      // In a real app, we would verify current password first
      
      // Update password
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        throw error;
      }
      
      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
    } catch (error) {
      console.error("Password change error:", error);
      setPasswordError("Failed to change password. Please try again.");
    } finally {
      setIsChanging(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Admin Password</CardTitle>
        <CardDescription>Update your administrator password</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        
        <div>
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        
        <div>
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        
        {passwordError && (
          <p className="text-red-500 text-sm">{passwordError}</p>
        )}
        
        <Button 
          onClick={handleChangePassword}
          disabled={isChanging}
          className="w-full bg-ontario-blue hover:bg-ontario-blue/90"
        >
          {isChanging ? "Updating..." : "Update Password"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminPasswordChange;
