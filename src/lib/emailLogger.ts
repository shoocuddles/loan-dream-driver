interface EmailDebugLog {
  timestamp: number;
  message: string;
  type: 'client' | 'server';
}

// Create a global array to store email debug logs
declare global {
  interface Window {
    _emailDebugLogs: EmailDebugLog[];
  }
}

// Initialize the global log array
if (typeof window !== 'undefined') {
  window._emailDebugLogs = window._emailDebugLogs || [];
}

// Original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Function to capture console logs related to emails
export const setupEmailLogCapture = () => {
  if (typeof window === 'undefined') return;
  
  console.log = function(...args) {
    originalConsoleLog.apply(console, args);
    
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
    
    // Check if the log is related to email functionality
    if (
      message.includes('email') || 
      message.includes('Resend') || 
      message.includes('Mailgun') || 
      message.includes('send-test-email')
    ) {
      window._emailDebugLogs.push({
        timestamp: Date.now(),
        message,
        type: 'client'
      });
      
      // Keep log size manageable
      if (window._emailDebugLogs.length > 100) {
        window._emailDebugLogs.shift();
      }
    }
  };
  
  console.error = function(...args) {
    originalConsoleError.apply(console, args);
    
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
    
    // Check if the error is related to email functionality
    if (
      message.includes('email') || 
      message.includes('Resend') || 
      message.includes('Mailgun') || 
      message.includes('send-test-email')
    ) {
      window._emailDebugLogs.push({
        timestamp: Date.now(),
        message: `ERROR: ${message}`,
        type: 'client'
      });
      
      // Keep log size manageable
      if (window._emailDebugLogs.length > 100) {
        window._emailDebugLogs.shift();
      }
    }
  };
};

// Function to restore original console behavior
export const restoreConsole = () => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
};

// Explicitly log an email-related message
export const logEmailDebug = (message: string) => {
  console.log(message);
};
