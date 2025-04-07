
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

// Helper function to format application data for display
export const formatApplicationData = async (application: ApplicationData) => {
  const columnMetadata = await getColumnMetadata();
  const formattedData: Record<string, any> = {};
  
  // Check if this is a downloaded application (has different field structure)
  const isDownloadedApp = 'downloadId' in application || 'applicationId' in application;
  
  // Log the application data for debugging
  console.log('Raw application data (first 300 chars):', JSON.stringify(application).substring(0, 300) + '...');
  
  // Format dates - handle different date field locations based on application type
  let createdDate = 'N/A';
  if (isDownloadedApp) {
    const downloadedApp = application as any;
    if (downloadedApp.downloadDate) {
      createdDate = format(new Date(downloadedApp.downloadDate), 'MMM d, yyyy');
    } else if (downloadedApp.created_at) {
      createdDate = format(new Date(downloadedApp.created_at), 'MMM d, yyyy');
    }
  } else {
    const standardApp = application as any;
    if ('created_at' in standardApp && standardApp.created_at) {
      createdDate = format(new Date(standardApp.created_at), 'MMM d, yyyy');
    }
  }
    
  // Get updated date (only for standard applications)
  const updatedDate = !isDownloadedApp && ('updated_at' in application) && (application as any).updated_at 
    ? format(new Date((application as any).updated_at), 'MMM d, yyyy')
    : 'N/A';
  
  // Handle nullable fields - more lenient to accept various data formats
  const getValueOrNA = (value: any) => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  };
  
  const getBooleanValue = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'string') {
      value = value.toLowerCase();
      if (value === 'true' || value === 't' || value === 'yes' || value === 'y' || value === '1') {
        return 'Yes';
      }
      if (value === 'false' || value === 'f' || value === 'no' || value === 'n' || value === '0') {
        return 'No';
      }
    }
    if (typeof value === 'number') {
      return value === 1 ? 'Yes' : 'No';
    }
    return 'N/A';
  };
  
  // Log the application object keys to help with debugging
  console.log('Application object keys:', Object.keys(application));
  
  // Create a unified object with different case versions of the field names to handle inconsistencies
  const unifiedApp: Record<string, any> = {};
  
  // Add all properties with original case
  Object.entries(application).forEach(([key, value]) => {
    unifiedApp[key] = value;
    
    // Also add camelCase and snake_case versions
    const camelCase = key.charAt(0).toLowerCase() + key.slice(1).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const snakeCase = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    if (camelCase !== key) unifiedApp[camelCase] = value;
    if (snakeCase !== key) unifiedApp[snakeCase] = value;
  });
  
  // Debug log the unified object
  console.log('Unified application object with multiple case versions:', Object.keys(unifiedApp));
  
  // IMPORTANT: For Excel and CSV exports, preserve the original field names from the database
  // This ensures data is passed through with minimal transformation
  Object.keys(application).forEach(key => {
    // Use the original key name but with nice formatting for display
    const displayKey = formatColumnName(key);
    formattedData[displayKey] = getValueOrNA(application[key]);
  });
  
  // Add some computed/special fields that might be needed
  formattedData['Submission Date'] = createdDate;
  
  if (isDownloadedApp) {
    formattedData['Download Date'] = getValueOrNA(unifiedApp.downloadDate);
  }
  
  // Ensure Application ID is always included
  if (!formattedData['Application ID'] && !formattedData['Id']) {
    const id = unifiedApp.id || unifiedApp.applicationId;
    if (id) {
      formattedData['Application ID'] = id;
    }
  }
  
  // Log the formatted data for all key fields to confirm values are being properly assigned
  console.log('Formatted data:', formattedData);
  return formattedData;
};

// Format database column names to display names
const formatColumnName = (columnName: string): string => {
  // Replace underscores with spaces and capitalize each word
  return columnName
    .split(/(?=[A-Z])|_/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Convert snake_case to camelCase for property matching
const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

// Get a formatted date string from application data
export const getDateFromApplication = (application: ApplicationData): string => {
  // Check application type and use appropriate date field
  if ('downloadDate' in application && application.downloadDate) {
    return format(new Date(application.downloadDate), 'MMMM d, yyyy');
  }
  
  if ('created_at' in application && application.created_at) {
    return format(new Date(application.created_at), 'MMMM d, yyyy');
  }
  
  return format(new Date(), 'MMMM d, yyyy');
};

// Generate a filename for download
export const generateFilename = (application: ApplicationData, extension: string): string => {
  // Use appropriate ID field depending on the application type
  const id = 'applicationId' in application ? application.applicationId : application.id;
  return `application_${id}.${extension}`;
};
