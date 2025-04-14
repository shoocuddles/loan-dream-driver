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
const originalConsoleWarn = console.warn;

// Format any type of value for logging
const formatLogValue = (value: any): string => {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  
  try {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  } catch (e) {
    return String(value);
  }
};

// Function to capture console logs related to emails
export const setupEmailLogCapture = () => {
  if (typeof window === 'undefined') return;
  
  console.log = function(...args) {
    originalConsoleLog.apply(console, args);
    
    const message = args.map(formatLogValue).join(' ');
    
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
      if (window._emailDebugLogs.length > 200) {
        window._emailDebugLogs.shift();
      }
    }
  };
  
  console.error = function(...args) {
    originalConsoleError.apply(console, args);
    
    const message = args.map(formatLogValue).join(' ');
    
    window._emailDebugLogs.push({
      timestamp: Date.now(),
      message: `ERROR: ${message}`,
      type: 'client'
    });
    
    // Keep log size manageable
    if (window._emailDebugLogs.length > 200) {
      window._emailDebugLogs.shift();
    }
  };
  
  console.warn = function(...args) {
    originalConsoleWarn.apply(console, args);
    
    const message = args.map(formatLogValue).join(' ');
    
    // Always capture warnings related to emails
    if (
      message.includes('email') || 
      message.includes('Resend') || 
      message.includes('Mailgun') || 
      message.includes('send-test-email')
    ) {
      window._emailDebugLogs.push({
        timestamp: Date.now(),
        message: `WARNING: ${message}`,
        type: 'client'
      });
      
      // Keep log size manageable
      if (window._emailDebugLogs.length > 200) {
        window._emailDebugLogs.shift();
      }
    }
  };
};

// Function to restore original console behavior
export const restoreConsole = () => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
};

// Explicitly log an email-related message
export const logEmailDebug = (message: string, data?: any) => {
  if (data) {
    console.log(message, data);
  } else {
    console.log(message);
  }
};
