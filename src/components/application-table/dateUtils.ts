
import { format, isValid, parseISO } from 'date-fns';

export const safeFormatDate = (dateString: string) => {
  try {
    if (!dateString) return 'N/A';
    
    const date = parseISO(dateString);
    
    if (!isValid(date)) return 'Invalid date';
    
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return 'Invalid date';
  }
};
