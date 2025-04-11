
import { format, isValid, parseISO, differenceInDays } from 'date-fns';

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

// Calculate age of lead in days
export const calculateLeadAge = (submissionDate: string): number => {
  try {
    if (!submissionDate) return 0;
    
    // Handle numeric values
    if (!isNaN(Number(submissionDate))) {
      console.log(`Numeric submission date: ${submissionDate}, treating as new lead`);
      return 0;
    }
    
    const date = parseISO(submissionDate);
    if (!isValid(date)) {
      console.log(`Invalid submission date: ${submissionDate}, treating as new lead`);
      return 0;
    }
    
    const ageInDays = differenceInDays(new Date(), date);
    console.log(`Lead age calculation: ${ageInDays} days (submitted: ${submissionDate})`);
    return ageInDays;
  } catch (error) {
    console.error('Error calculating lead age:', error, 'for date:', submissionDate);
    return 0;
  }
};
