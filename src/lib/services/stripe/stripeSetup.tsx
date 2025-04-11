
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StripeSetupProps {
  open: boolean;
  onClose: () => void;
}

export const StripeSetup = ({ open, onClose }: StripeSetupProps) => {
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  
  // Get the current URL to create the webhook URL
  useState(() => {
    const url = window.location.origin;
    const baseSupabaseUrl = 'https://kgtfpuvksmqyaraijoal.supabase.co/functions/v1';
    setWebhookUrl(`${baseSupabaseUrl}/stripe-webhook`);
  }, []);
  
  const handleSubmit = async () => {
    if (!webhookSecret) return;
    
    setIsSubmitting(true);
    
    try {
      // Save the webhook secret to Supabase edge function secrets
      const { error } = await supabase.functions.invoke('save-webhook-secret', {
        body: { webhookSecret }
      });
      
      if (error) throw error;
      
      onClose();
    } catch (error) {
      console.error('Error saving webhook secret:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stripe Webhook Setup</DialogTitle>
          <DialogDescription>
            To process Stripe payments, you need to set up a webhook in your Stripe dashboard.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <div className="flex items-center gap-2">
              <Input
                id="webhookUrl"
                value={webhookUrl}
                readOnly
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                }}
              >
                Copy
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Add this URL to your Stripe Dashboard under Developers &gt; Webhooks.
              Listen for the <code>checkout.session.completed</code> event.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="webhookSecret">Webhook Secret</Label>
            <Input
              id="webhookSecret"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="whsec_..."
            />
            <p className="text-sm text-gray-500">
              After creating the webhook, copy the signing secret from the Stripe dashboard.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!webhookSecret || isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
