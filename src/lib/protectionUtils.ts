
/**
 * Protection utilities to help prevent content duplication
 * These functions add various levels of protection against copying content
 */

// Disable right-click context menu
export const disableContextMenu = () => {
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    return false;
  };
  
  document.addEventListener('contextmenu', handleContextMenu);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('contextmenu', handleContextMenu);
  };
};

// Disable text selection
export const disableTextSelection = () => {
  // Add CSS class to body
  document.body.classList.add('no-select');
  
  // Return cleanup function
  return () => {
    document.body.classList.remove('no-select');
  };
};

// Disable image dragging
export const disableImageDragging = () => {
  const handleDragStart = (e: DragEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      e.preventDefault();
    }
  };
  
  document.addEventListener('dragstart', handleDragStart as EventListener);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('dragstart', handleDragStart as EventListener);
  };
};

// Disable keyboard shortcuts for copy/paste/save
export const disableKeyboardShortcuts = () => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Check for Ctrl+S, Ctrl+C, Ctrl+Shift+I, F12, etc.
    if (
      (e.ctrlKey && (e.key === 's' || e.key === 'c' || e.key === 'u')) ||
      (e.ctrlKey && e.shiftKey && e.key === 'i') ||
      e.key === 'F12' ||
      e.key === 'PrintScreen'
    ) {
      e.preventDefault();
      return false;
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
};
