
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
  
  // DIRECT MAPPING FROM DATABASE FIELDS - more robust to handle different field name formats
  // First try exact database field name, then try camelCase and variations
  formattedData['Full Name'] = getValueOrNA(unifiedApp.fullname || unifiedApp.fullName);
  formattedData['City'] = getValueOrNA(unifiedApp.city);
  formattedData['Address'] = getValueOrNA(unifiedApp.streetaddress || unifiedApp.streetAddress || unifiedApp.address);
  formattedData['Province'] = getValueOrNA(unifiedApp.province);
  formattedData['Postal Code'] = getValueOrNA(unifiedApp.postalcode || unifiedApp.postalCode);
  formattedData['Email'] = getValueOrNA(unifiedApp.email);
  formattedData['Phone Number'] = getValueOrNA(unifiedApp.phonenumber || unifiedApp.phoneNumber);
  
  // Vehicle information - using the specific field names from Supabase as specified by the user
  formattedData['Vehicle Type'] = getValueOrNA(unifiedApp.vehicletype || unifiedApp.vehicleType);
  formattedData['Unwanted Colors'] = getValueOrNA(unifiedApp.unwantedcolors || unifiedApp.unwantedColors);
  formattedData['Required Features'] = getValueOrNA(unifiedApp.requiredfeatures || unifiedApp.requiredFeatures);
  formattedData['Preferred Make/Model'] = getValueOrNA(unifiedApp.preferredmakemodel || unifiedApp.preferredMakeModel);
  
  // Loan information - directly use the database field names as specified
  formattedData['Has Existing Loan'] = getBooleanValue(unifiedApp.hasexistingloan || unifiedApp.hasExistingLoan);
  formattedData['Current Vehicle'] = getValueOrNA(unifiedApp.currentvehicle || unifiedApp.currentVehicle);
  formattedData['Current Payment'] = getValueOrNA(unifiedApp.currentpayment || unifiedApp.currentPayment);
  formattedData['Amount Owed'] = getValueOrNA(unifiedApp.amountowed || unifiedApp.amountOwed);
  formattedData['Mileage'] = getValueOrNA(unifiedApp.mileage);
  
  // Income information - directly use the database field names as specified
  formattedData['Employment Status'] = getValueOrNA(unifiedApp.employmentstatus || unifiedApp.employmentStatus);
  formattedData['Monthly Income'] = getValueOrNA(unifiedApp.monthlyincome || unifiedApp.monthlyIncome);
  formattedData['Employer Name'] = getValueOrNA(unifiedApp.employer_name || unifiedApp.employerName);
  formattedData['Job Title'] = getValueOrNA(unifiedApp.job_title || unifiedApp.jobTitle);
  formattedData['Employment Duration'] = getValueOrNA(unifiedApp.employment_duration || unifiedApp.employmentDuration);
  
  // Additional information
  formattedData['Additional Notes'] = getValueOrNA(unifiedApp.additionalnotes || unifiedApp.additionalNotes);
  formattedData['Submission Date'] = createdDate;
  formattedData['Application ID'] = getValueOrNA(unifiedApp.id || unifiedApp.applicationId);
  
  // Add download date if it exists
  if (unifiedApp.downloadDate) {
    formattedData['Download Date'] = unifiedApp.downloadDate;
  }
  
  // Log the formatted data for all key fields to confirm values are being properly assigned
  console.log('Formatted data for key fields:');
  [
    'Full Name', 'City', 'Address', 'Province', 'Postal Code', 'Email', 'Phone Number',
    'Vehicle Type', 'Unwanted Colors', 'Required Features', 'Preferred Make/Model',
    'Has Existing Loan', 'Current Vehicle', 'Current Payment', 'Amount Owed', 'Mileage',
    'Employment Status', 'Monthly Income', 'Employer Name', 'Job Title', 'Employment Duration',
    'Additional Notes', 'Submission Date', 'Application ID'
  ].forEach(key => {
    console.log(`${key}: '${formattedData[key]}'`);
  });
  
  // Final fallback to ensure we include ALL fields from the application with proper display names
  // We'll only add fields that haven't been explicitly added above
  columnMetadata.forEach(column => {
    const displayName = column.displayName;
    const columnName = column.name;
    
    // Skip fields we've explicitly removed
    const excludedFields = [
      'payment amount',
      'status',
      'application id',
      'id',
      'user id',
      'street address',
      'is complete',
      'last updated',
      'download id'
    ];
    
    if (excludedFields.some(excluded => 
      columnName.toLowerCase() === excluded.toLowerCase() ||
      displayName.toLowerCase() === excluded.toLowerCase()
    )) {
      return;
    }
    
    // Check if we already have this field (using case-insensitive comparison)
    const hasField = Object.keys(formattedData).some(key => 
      key.toLowerCase() === displayName.toLowerCase() || 
      key.replace(/\s+/g, '').toLowerCase() === displayName.replace(/\s+/g, '').toLowerCase()
    );
    
    if (!hasField) {
      // Try to find the value using different case versions of the field name
      let value = unifiedApp[columnName];
      
      if (value === undefined) {
        // Try camelCase version
        const camelCase = toCamelCase(columnName);
        value = unifiedApp[camelCase];
        
        if (value === undefined) {
          // Try Pascal case (first letter uppercase)
          const pascalCase = columnName.charAt(0).toUpperCase() + toCamelCase(columnName).slice(1);
          value = unifiedApp[pascalCase];
        }
      }
      
      if (value !== undefined) {
        const isBooleanField = typeof value === 'boolean';
        formattedData[displayName] = isBooleanField ? getBooleanValue(value) : getValueOrNA(value);
      }
    }
  });
  
  console.log('Final formatted data object:', formattedData);
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
