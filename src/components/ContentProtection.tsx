
import { useEffect } from 'react';
import { 
  disableContextMenu, 
  disableTextSelection, 
  disableImageDragging,
  disableKeyboardShortcuts
} from '@/lib/protectionUtils';

interface ContentProtectionProps {
  children: React.ReactNode;
}

/**
 * Component that adds various content protection measures to prevent copying
 */
const ContentProtection = ({ children }: ContentProtectionProps) => {
  useEffect(() => {
    // Apply all protection measures
    const cleanupContextMenu = disableContextMenu();
    const cleanupTextSelection = disableTextSelection();
    const cleanupImageDragging = disableImageDragging();
    const cleanupKeyboardShortcuts = disableKeyboardShortcuts();
    
    // Remove watermark message that might give away protection methods
    const consoleMessage = `
%cWebsite Protected
%cThis website is protected against unauthorized copying and distribution.
    `;
    console.log(consoleMessage, 'font-size:20px;color:#003366;font-weight:bold;', 'font-size:14px;color:#666;');
    
    // Clean up all event listeners when component unmounts
    return () => {
      cleanupContextMenu();
      cleanupTextSelection();
      cleanupImageDragging();
      cleanupKeyboardShortcuts();
    };
  }, []);

  return <>{children}</>;
};

export default ContentProtection;
