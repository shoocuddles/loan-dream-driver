
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const MailgunSettings = () => {
  const [settings, setSettings] = useState({
    api_key: '',
    domain: '',
    from_email: '',
    from_name: 'Ontario Loans'
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchMailgunSettings();
  }, []);

  const fetchMailgunSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('mailgun_settings')
        .select('*')
        .single();

      if (data) {
        setSettings({
          api_key: data.api_key || '',
          domain: data.domain || '',
          from_email: data.from_email || '',
          from_name: data.from_name || 'Ontario Loans'
        });
      }
    } catch (error) {
      console.error('Error fetching Mailgun settings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('mailgun_settings')
        .upsert({
          api_key: settings.api_key,
          domain: settings.domain,
          from_email: settings.from_email,
          from_name: settings.from_name || 'Ontario Loans'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Mailgun settings updated successfully');
    } catch (error) {
      console.error('Error updating Mailgun settings:', error);
      toast.error('Failed to update Mailgun settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mailgun Email Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="text"
              value={settings.api_key}
              onChange={(e) => setSettings({...settings, api_key: e.target.value})}
              placeholder="Enter Mailgun API Key"
              required
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
  );
};

export default MailgunSettings;
