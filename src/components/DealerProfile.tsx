
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  const [emailNotifications, setEmailNotifications] = useState<boolean>(false);
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
      // Here we make sure to use the exact value from the profile
      // instead of defaulting to true
      setEmailNotifications(profile.email_notifications === undefined ? false : profile.email_notifications);
      console.log('Email notifications setting loaded:', profile.email_notifications);
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
      const { error } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.currentPassword
      });

      if (error) {
        throw new Error("Current password is incorrect");
      }

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

  const handleEmailNotificationToggle = async (checked: boolean) => {
    if (!user) return;

    try {
      console.log('Updating email notifications to:', checked);
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ email_notifications: checked })
        .eq('id', user.id);

      if (error) throw error;

      setEmailNotifications(checked);
      toast.success(`Email notifications ${checked ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      console.error('Error updating email notifications:', error.message);
      toast.error(`Failed to update email notifications: ${error.message}`);
      // Revert UI state on error
      setEmailNotifications(!checked);
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
    <Card className="relative">
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          
          <div className="md:hidden">
            <Separator className="my-6 bg-gray-200" />
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <Label htmlFor="email-notifications">
                Notify me by email when new leads are received
              </Label>
              <Switch
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={handleEmailNotificationToggle}
              />
            </div>

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
