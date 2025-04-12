
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, UserCog, Lock } from 'lucide-react';
import { updateUserPassword } from '@/lib/auth';
import { Separator } from '@/components/ui/separator';

const DealerProfile = () => {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [formData, setFormData] = useState<{
    full_name: string;
    phone: string;
    company_name: string;
  }>({
    full_name: '',
    phone: '',
    company_name: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        company_name: profile.company_name || ''
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          company_name: formData.company_name,
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success('Profile updated successfully!');
      
      // Refresh profile data by forcing a page reload
      // This is a simpler approach than implementing a refresh function
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Error updating profile:', error.message);
      toast.error(`Failed to update profile: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (!passwordData.currentPassword) {
      toast.error("Current password is required");
      return;
    }

    setIsChangingPassword(true);
    try {
      // First verify the current password
      const { error } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.currentPassword
      });

      if (error) {
        throw new Error("Current password is incorrect");
      }

      // Then update to the new password
      await updateUserPassword(passwordData.newPassword);
      toast.success('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(`Failed to update password: ${error.message}`);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!profile && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dealer Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p>Please sign in to view your profile.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dealer Profile Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <UserCog className="h-5 w-5 text-ontario-blue" />
              <h3 className="font-medium text-lg">Dealer Profile</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-sm text-gray-500">Email cannot be changed</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Your full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  placeholder="Your phone number"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company_name">Dealership Name</Label>
                <Input
                  id="company_name"
                  name="company_name"
                  value={formData.company_name || ''}
                  onChange={handleChange}
                  placeholder="Your dealership name"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-ontario-blue hover:bg-ontario-blue/90"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
            </form>
          </div>
          
          {/* Vertical Separator for desktop view */}
          <div className="hidden md:block md:absolute md:left-1/2 md:top-[88px] md:bottom-6 md:-ml-px">
            <Separator orientation="vertical" className="bg-gray-200" />
          </div>
          
          {/* Horizontal Separator for mobile view */}
          <div className="md:hidden">
            <Separator className="my-6 bg-gray-200" />
          </div>
          
          {/* Change Password Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-ontario-blue" />
              <h3 className="font-medium text-lg">Change Password</h3>
            </div>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter current password"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <Button 
                type="submit" 
                variant="outline"
                className="w-full border-ontario-blue text-ontario-blue hover:bg-ontario-blue/10"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating Password...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DealerProfile;
