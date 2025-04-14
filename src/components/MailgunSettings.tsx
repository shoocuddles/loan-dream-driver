
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Send, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import EmailDebugger from './EmailDebugger';
import { setupEmailLogCapture, logEmailDebug } from '@/lib/emailLogger';

interface TestEmailFormData {
  to: string;
  subject: string;
  body: string;
}

const MailgunSettings = () => {
  const [settings, setSettings] = useState({
    api_key: '',
    domain: '',
    from_email: '',
    from_name: 'Ontario Loans'
  });
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [showDebugger, setShowDebugger] = useState(false);
  const { profile } = useAuth();
  
  const form = useForm<TestEmailFormData>({
    defaultValues: {
      to: profile?.email || '',
      subject: 'Test Email',
      body: 'This is just a test email to test the email sending system'
    }
  });

  useEffect(() => {
    fetchMailgunSettings();
    setupEmailLogCapture();
    
    return () => {
      // Optional: clean up console override when component unmounts
      // restoreConsole();
    };
  }, []);

  useEffect(() => {
    // Update the "to" field when profile loads
    if (profile?.email) {
      form.setValue('to', profile.email);
    }
  }, [profile, form]);

  const fetchMailgunSettings = async () => {
    logEmailDebug('Fetching Mailgun settings from database');
    try {
      const { data, error } = await supabase
        .from('mailgun_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        logEmailDebug('Loaded Mailgun settings: ' + data.id);
        setSettingsId(data.id);
        setSettings({
          api_key: data.api_key || '',
          domain: data.domain || '',
          from_email: data.from_email || '',
          from_name: data.from_name || 'Ontario Loans'
        });
      }
    } catch (error) {
      console.error('Error fetching Mailgun settings:', error);
      toast.error('Failed to load Mailgun settings');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let result;

      if (settingsId) {
        // Update existing record
        logEmailDebug(`Updating existing Mailgun settings: ${settingsId}`);
        result = await supabase
          .from('mailgun_settings')
          .update({
            api_key: settings.api_key,
            domain: settings.domain,
            from_email: settings.from_email,
            from_name: settings.from_name || 'Ontario Loans'
          })
          .eq('id', settingsId);
      } else {
        // Insert new record
        logEmailDebug('Creating new Mailgun settings');
        result = await supabase
          .from('mailgun_settings')
          .insert({
            api_key: settings.api_key,
            domain: settings.domain,
            from_email: settings.from_email,
            from_name: settings.from_name || 'Ontario Loans'
          });
      }

      if (result.error) throw result.error;

      toast.success('Mailgun settings updated successfully');
      
      // If we created a new record, fetch again to get the ID
      if (!settingsId) {
        fetchMailgunSettings();
      }
    } catch (error) {
      console.error('Error updating Mailgun settings:', error);
      toast.error('Failed to update Mailgun settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTestEmail = async (formData: TestEmailFormData) => {
    setSendingTest(true);
    setShowDebugger(true); // Automatically show debugger when sending a test
    
    try {
      logEmailDebug('Sending test email with data: ' + JSON.stringify({
        to: formData.to,
        subject: formData.subject,
        // Omitting body for privacy
      }));
      
      const response = await supabase.functions.invoke('send-test-email', {
        body: {
          to: formData.to,
          subject: formData.subject,
          body: formData.body || 'Test email body',
        }
      });

      logEmailDebug('Test email response: ' + JSON.stringify(response));
      
      // Dispatch a custom event with the response data for the debugger to capture
      const responseEvent = new CustomEvent('email-response-received', {
        detail: { response: response.data || response.error }
      });
      window.dispatchEvent(responseEvent);
      
      if (response.error) {
        logEmailDebug('Test email error details: ' + JSON.stringify(response.error));
        throw new Error(response.error.message || 'Unknown error occurred');
      }
      
      if (response.data?.success) {
        toast.success('Test email sent successfully! Check your inbox.');
        logEmailDebug('Test email sent successfully');
      } else {
        const errorMessage = response.data?.error || 'Unknown error';
        logEmailDebug('Test email error: ' + errorMessage);
        toast.error(`Failed to send test email: ${errorMessage}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error sending test email:', error);
      logEmailDebug('Test email error: ' + errorMessage);
      
      // Show a more detailed error message
      if (errorMessage.includes('non-2xx status code')) {
        toast.error('Email server returned an error. Check the debug logs for details.');
      } else {
        toast.error(`Failed to send test email: ${errorMessage}`);
      }
    } finally {
      setSendingTest(false);
    }
  };

  const toggleDebugger = () => {
    setShowDebugger(!showDebugger);
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Mailgun Email Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={settings.api_key}
                  onChange={(e) => setSettings({...settings, api_key: e.target.value})}
                  placeholder="Enter Mailgun API Key"
                  required
                  className="pr-10"
                />
              </div>
              <div className="space-y-2">
                <Label>Domain</Label>
                <Input
                  type="text"
                  value={settings.domain}
                  onChange={(e) => setSettings({...settings, domain: e.target.value})}
                  placeholder="Enter Mailgun Domain"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>From Email</Label>
                <Input
                  type="email"
                  value={settings.from_email}
                  onChange={(e) => setSettings({...settings, from_email: e.target.value})}
                  placeholder="Enter From Email Address"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>From Name</Label>
                <Input
                  type="text"
                  value={settings.from_name}
                  onChange={(e) => setSettings({...settings, from_name: e.target.value})}
                  placeholder="Enter From Name"
                />
              </div>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-ontario-blue hover:bg-ontario-blue/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save Mailgun Settings'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Test Email</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDebugger}
            >
              {showDebugger ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" /> Hide Debug
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" /> Show Debug
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSendTestEmail)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To</FormLabel>
                      <FormControl>
                        <Input placeholder="recipient@example.com" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Test Email" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="This is just a test email to test the email sending system" 
                          className="min-h-[120px]" 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  disabled={sendingTest}
                  className="w-full bg-ontario-blue hover:bg-ontario-blue/90"
                >
                  {sendingTest ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" /> Send Test Email
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <EmailDebugger visible={showDebugger} />
    </div>
  );
};

export default MailgunSettings;
