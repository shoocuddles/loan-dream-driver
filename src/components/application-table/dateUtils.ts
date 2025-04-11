
import { format, isValid, parseISO } from 'date-fns';

export const safeFormatDate = (dateString: string) => {
  try {
    if (!dateString) return 'N/A';
    
    // Handle numeric values that might be mistakenly included
    if (!isNaN(Number(dateString))) {
      console.log(`Ignoring numeric date: ${dateString}`);
      return 'N/A';
    }
    
    const date = parseISO(dateString);
    
    if (!isValid(date)) return 'Invalid date';
    
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return 'Invalid date';
  }
};

// Format date for Supabase - handles various date formats
export const formatDateForSupabase = (dateStr: string): string => {
  if (!dateStr || dateStr.trim() === '') {
    return new Date().toISOString();
  }

  try {
    // Handle numeric values that might be mistakenly included (e.g., "600")
    if (!isNaN(Number(dateStr))) {
      console.log(`Converting numeric date "${dateStr}" to current date`);
      return new Date().toISOString();
    }

    // Try parsing as ISO format
    const parsedDate = parseISO(dateStr);
    
    if (isValid(parsedDate)) {
      return parsedDate.toISOString();
    } else {
      // If not valid ISO format, fall back to current date
      console.log(`Unable to parse date "${dateStr}", using current date`);
      return new Date().toISOString();
    }
  } catch (error) {
    console.error(`Error formatting date "${dateStr}":`, error);
    return new Date().toISOString();
  }
};
