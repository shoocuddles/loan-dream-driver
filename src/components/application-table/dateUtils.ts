
import { format, isValid, parseISO, differenceInDays } from 'date-fns';

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

export const calculateLeadAge = (dateString: string): number => {
  try {
    if (!dateString) return 0;
    
    const date = parseISO(dateString);
    
    if (!isValid(date)) {
      console.error('Invalid date provided for age calculation:', dateString);
      return 0;
    }
    
    const today = new Date();
    const ageInDays = differenceInDays(today, date);
    
    return ageInDays;
  } catch (error) {
    console.error('Error calculating lead age:', dateString, error);
    return 0;
  }
};
