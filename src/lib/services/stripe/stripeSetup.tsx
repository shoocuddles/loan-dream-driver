
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface StripeSetupProps {
  onComplete?: () => void;
}

const StripeSetup = ({ onComplete }: StripeSetupProps) => {
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    if (!webhookSecret.trim()) return;
    
    try {
      setIsSubmitting(true);
      setStatus('idle');
      setErrorMessage('');
      
      // Fix the error: Call the invoke function with a single object parameter containing body
      const { error } = await supabase.functions.invoke('save-webhook-secret', {
        body: { webhookSecret }
      });
      
      if (error) throw error;
      
      setStatus('success');
      if (onComplete) onComplete();
    } catch (error: any) {
      console.error('Error saving webhook secret:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Failed to save webhook secret');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Stripe Webhook Setup</h2>
      
      <div className="text-sm text-gray-600">
        <p>To complete Stripe integration, you need to set up a webhook to notify your application when payments are completed.</p>
        <ol className="list-decimal list-inside space-y-1 mt-2">
          <li>Go to your <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Stripe Dashboard</a> and create a new webhook</li>
          <li>Set the endpoint URL to: <code className="bg-gray-100 px-1.5 py-0.5 rounded">https://kgtfpuvksmqyaraijoal.supabase.co/functions/v1/stripe-webhook</code></li>
          <li>Select the event <code className="bg-gray-100 px-1.5 py-0.5 rounded">checkout.session.completed</code></li>
          <li>Once created, copy the signing secret and paste it below</li>
        </ol>
      </div>
      
      <div className="flex gap-2">
        <Input
          value={webhookSecret}
          onChange={(e) => setWebhookSecret(e.target.value)}
          placeholder="Webhook signing secret (whsec_...)"
          className="flex-1"
          type="password"
        />
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !webhookSecret.trim()}
        >
          {isSubmitting ? 'Saving...' : 'Save Secret'}
        </Button>
      </div>
      
      {status === 'success' && (
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>
            Webhook secret saved successfully. Your Stripe integration is now complete.
          </AlertDescription>
        </Alert>
      )}
      
      {status === 'error' && (
        <Alert className="bg-red-50 text-red-800 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error!</AlertTitle>
          <AlertDescription>
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default StripeSetup;
