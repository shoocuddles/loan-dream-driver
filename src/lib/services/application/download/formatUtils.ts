
import { format } from 'date-fns';
import { ApplicationData, ColumnMetadata } from './types';
import { fetchApplicationColumnMetadata } from './fetchService';

// Generate column metadata one time and cache it
let columnMetadataCache: ColumnMetadata[] | null = null;

// Helper function to get column metadata (from cache or fetch new)
export const getColumnMetadata = async (): Promise<ColumnMetadata[]> => {
  if (!columnMetadataCache) {
    columnMetadataCache = await fetchApplicationColumnMetadata();
  }
  return columnMetadataCache;
};

// Generate a filename for download
export const generateFilename = (application: ApplicationData, extension: string): string => {
  // Use appropriate ID field depending on the application type
  const id = 'applicationId' in application ? application.applicationId : application.id;
  return `application_${id}.${extension}`;
};

// Format application data for export formats (Excel, CSV)
export const formatApplicationData = async (application: ApplicationData): Promise<Record<string, any>> => {
  try {
    console.log('Formatting application data for export:', application.id || application.applicationId);
    
    // Fetch column metadata to ensure consistent formatting
    const columnMetadata = await getColumnMetadata();
    
    // Create a formatted object with all available fields
    const formattedData: Record<string, any> = {};
    
    // Process all known fields from metadata
    columnMetadata.forEach(column => {
      // Try to find the value using various field name formats
      let value = getFieldValue(application, column.name);
      
      // Format specific field types
      if (typeof value === 'boolean') {
        value = value ? 'Yes' : 'No';
      }
      else if (column.name === 'created_at' || column.name === 'updated_at' || 
               column.name === 'downloadDate' || column.name === 'downloaded_at') {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            value = format(date, 'yyyy-MM-dd HH:mm:ss');
          }
        } catch (e) {
          console.error(`Error formatting date for ${column.name}:`, e);
        }
      }
      
      // Add to formatted data with display name as the key
      formattedData[column.displayName] = value || 'N/A';
    });
    
    console.log('Formatted data sample:', Object.keys(formattedData).slice(0, 5).map(key => `${key}: ${formattedData[key]}`));
    return formattedData;
  } catch (error) {
    console.error('Error formatting application data:', error);
    
    // Return basic data if error occurs
    return {
      'ID': application.id || application.applicationId || 'Unknown',
      'Full Name': application.fullname || application.fullName || 'Unknown',
      'Error': 'Failed to format complete application data'
    };
  }
};

// Helper function to get field value with fallback to different casing patterns
const getFieldValue = (application: ApplicationData, fieldName: string): any => {
  // Direct match
  if (fieldName in application) {
    return application[fieldName];
  }
  
  // Try camelCase
  const camelCase = fieldName.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
  if (camelCase in application) {
    return application[camelCase];
  }
  
  // Try snake_case
  const snakeCase = fieldName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  if (snakeCase in application) {
    return application[snakeCase];
  }
  
  // Case insensitive search
  const lowerFieldName = fieldName.toLowerCase();
  for (const key in application) {
    if (key.toLowerCase() === lowerFieldName) {
      return application[key];
    }
  }
  
  // Handle special cases
  if (fieldName === 'fullName' && 'fullname' in application) {
    return application.fullname;
  }
  if (fieldName === 'fullname' && 'fullName' in application) {
    return application.fullName;
  }
  if (fieldName === 'phoneNumber' && 'phonenumber' in application) {
    return application.phonenumber;
  }
  if (fieldName === 'downloadDate' && 'downloaded_at' in application) {
    return application.downloaded_at;
  }
  
  return null;
};
