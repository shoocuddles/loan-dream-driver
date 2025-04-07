
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
  
  // Format dates - handle different date field locations based on application type
  let createdDate = 'N/A';
  if (isDownloadedApp) {
    const downloadedApp = application as any;
    if (downloadedApp.downloadDate) {
      createdDate = format(new Date(downloadedApp.downloadDate), 'MMM d, yyyy');
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
  
  // Handle nullable fields
  const getValueOrNA = (value: any) => value !== null && value !== undefined ? String(value) : 'N/A';
  const getBooleanValue = (value: boolean | null | undefined) => value === true ? 'Yes' : 'No';
  
  // For downloaded applications (which have already been processed)
  if (isDownloadedApp) {
    const downloadedApp = application as any;
    
    // Process all fields from the downloaded app object
    for (const key in downloadedApp) {
      if (key === 'downloadDate') {
        formattedData['Download Date'] = downloadedApp.downloadDate
          ? format(new Date(downloadedApp.downloadDate), 'MMM d, yyyy')
          : 'N/A';
      } else {
        // Convert keys to proper display format
        const displayKey = formatColumnName(key);
        formattedData[displayKey] = getValueOrNA(downloadedApp[key]);
      }
    }
    
    // Ensure Application ID is properly named
    if ('applicationId' in downloadedApp) {
      formattedData['Application ID'] = getValueOrNA(downloadedApp.applicationId);
    }
    
    // Make sure ALL columns from metadata are included, even if missing in the downloadedApp
    columnMetadata.forEach(column => {
      const displayName = column.displayName;
      if (!(displayName in formattedData)) {
        formattedData[displayName] = 'N/A';
      }
    });
  } 
  // For standard applications directly from the database
  else {
    const standardApp = application as any;
    
    // Process ALL database columns systematically, including all empty fields
    columnMetadata.forEach(column => {
      const key = column.name;
      const displayName = column.displayName;
      
      // Special handling for certain field types
      if (key === 'hasexistingloan' && key in standardApp) {
        formattedData[displayName] = getBooleanValue(standardApp[key]);
      } 
      else if (key === 'created_at') {
        formattedData['Submission Date'] = createdDate;
      }
      else if (key === 'updated_at') {
        formattedData['Last Updated'] = updatedDate;
      }
      // Handle mappings between camelCase and snake_case
      else if (key === 'monthlyincome' && 'monthlyIncome' in standardApp) {
        formattedData[displayName] = getValueOrNA(standardApp.monthlyIncome);
      }
      // Map the database column name to a display name and include the value
      else {
        // Handle both snake_case (from DB) and camelCase (from frontend)
        const camelCaseKey = toCamelCase(key);
        const value = key in standardApp 
          ? standardApp[key] 
          : camelCaseKey in standardApp 
            ? standardApp[camelCaseKey] 
            : null;
            
        formattedData[displayName] = key === 'id' || typeof value !== 'boolean'
          ? getValueOrNA(value) // Non-booleans should show as-is
          : getBooleanValue(value); // Booleans should show as Yes/No
      }
    });
    
    // Ensure these common fields have consistent naming
    if ('id' in standardApp) {
      formattedData['Application ID'] = getValueOrNA(standardApp.id);
    }
    if ('fullname' in standardApp) {
      formattedData['Full Name'] = getValueOrNA(standardApp.fullname);
    }
    if ('email' in standardApp) {
      formattedData['Email'] = getValueOrNA(standardApp.email);
    }
  }
  
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
