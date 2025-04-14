
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface LogEntry {
  timestamp: number;
  message: string;
  type: 'client' | 'server';
}

interface EmailDebuggerProps {
  visible: boolean;
}

const EmailDebugger: React.FC<EmailDebuggerProps> = ({ visible }) => {
  const [clientLogs, setClientLogs] = useState<LogEntry[]>([]);
  const [serverLogs, setServerLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchLogs();
    }
  }, [visible]);

  const fetchLogs = async () => {
    if (!visible) return;
    
    setIsLoading(true);
    
    try {
      // Fetch server logs from Supabase Edge Functions
      console.log("Fetching edge function logs");
      const response = await fetch(
        'https://kgtfpuvksmqyaraijoal.supabase.co/functions/v1/send-test-email/logs?minutes=5',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Error fetching logs: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        console.error('Error fetching edge function logs:', result.error);
        setLastError(result.error);
      } else {
        // Format server logs
        const formattedServerLogs = (result.data || [])
          .filter((log: any) => {
            // Only include logs related to send-test-email function
            return log.function_id === '6fc74bdd-22d9-4cc0-8751-9400bf63c307';
          })
          .map((log: any) => ({
            timestamp: log.timestamp / 1000,
            message: log.event_message,
            type: 'server' as const
          }));

        setServerLogs(formattedServerLogs);
      }

      // Get client logs from console
      const fiveMinutesAgo = Date.now() - 300000;
      
      // Filter for email-related logs in the browser's console
      if (window._emailDebugLogs) {
        const recentLogs = window._emailDebugLogs.filter((log: any) => 
          log.timestamp > fiveMinutesAgo && 
          (log.message.includes('email') || 
           log.message.includes('Resend') || 
           log.message.includes('Mailgun') ||
           log.message.includes('send-test-email'))
        );
        
        setClientLogs(recentLogs);
      }
    } catch (err) {
      console.error('Error in fetchLogs:', err);
      setLastError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLogs = (type: 'client' | 'server') => {
    const logs = type === 'client' ? clientLogs : serverLogs;
    const logText = logs.map(log => {
      const date = new Date(log.timestamp);
      return `[${date.toLocaleString()}] ${log.message}`;
    }).join('\n');
    
    navigator.clipboard.writeText(logText)
      .then(() => {
        toast.success(`${type === 'client' ? 'Client' : 'Server'} logs copied to clipboard`);
      })
      .catch(err => {
        console.error('Failed to copy logs:', err);
        toast.error('Failed to copy logs');
      });
  };

  const handleRefreshLogs = () => {
    fetchLogs();
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="flex justify-end mb-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefreshLogs}
          disabled={isLoading}
        >
          Refresh Logs
        </Button>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md font-medium">Client-side Logs</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleCopyLogs('client')}
            disabled={clientLogs.length === 0}
          >
            <Copy className="h-4 w-4 mr-1" /> Copy
          </Button>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-3 rounded-md max-h-96 overflow-y-auto font-mono text-xs">
            {clientLogs.length > 0 ? (
              <ul className="space-y-2">
                {clientLogs.map((log, i) => (
                  <li key={i} className="border-b border-gray-100 pb-2">
                    <span className="text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                    <pre className="whitespace-pre-wrap break-words mt-1">{log.message}</pre>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center py-4">
                {isLoading ? 'Loading logs...' : 'No client logs found in the last 5 minutes'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md font-medium">Edge Function Logs</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleCopyLogs('server')}
            disabled={serverLogs.length === 0}
          >
            <Copy className="h-4 w-4 mr-1" /> Copy
          </Button>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-3 rounded-md max-h-96 overflow-y-auto font-mono text-xs">
            {serverLogs.length > 0 ? (
              <ul className="space-y-2">
                {serverLogs.map((log, i) => (
                  <li key={i} className="border-b border-gray-100 pb-2">
                    <span className="text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                    <pre className="whitespace-pre-wrap break-words mt-1">{log.message}</pre>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center py-4">
                {isLoading ? 'Loading logs...' : lastError ? 
                  `Error fetching logs: ${lastError}` : 
                  'No edge function logs found in the last 5 minutes'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailDebugger;
