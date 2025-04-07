
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
  
  // Common mapping function for both downloaded and standard applications
  const mapField = (fieldName: string, camelCaseName: string, snakeCaseName: string) => {
    // Try to find the value using various casing conventions
    const value = application[fieldName] ?? 
                 application[camelCaseName] ?? 
                 application[snakeCaseName] ?? 
                 application[fieldName.toLowerCase()] ?? 
                 application[camelCaseName.toLowerCase()] ?? 
                 application[snakeCaseName.toLowerCase()];
    
    console.log(`Field mapping - ${fieldName}:`, {
      fieldName: fieldName,
      camelCase: camelCaseName,
      snakeCase: snakeCaseName,
      value: value,
      type: value !== undefined ? typeof value : 'undefined'
    });
    
    return value;
  };
  
  // Map all fields explicitly using proper mappings from Supabase
  formattedData['Full Name'] = getValueOrNA(mapField('fullName', 'fullName', 'fullname'));
  formattedData['City'] = getValueOrNA(mapField('city', 'city', 'city'));
  formattedData['Address'] = getValueOrNA(mapField('address', 'streetAddress', 'streetaddress'));
  formattedData['Province'] = getValueOrNA(mapField('province', 'province', 'province'));
  formattedData['Postal Code'] = getValueOrNA(mapField('postalCode', 'postalCode', 'postalcode'));
  formattedData['Email'] = getValueOrNA(mapField('email', 'email', 'email'));
  formattedData['Phone Number'] = getValueOrNA(mapField('phoneNumber', 'phoneNumber', 'phonenumber'));
  
  // Vehicle information - using the specific field names from Supabase
  formattedData['Vehicle Type'] = getValueOrNA(mapField('vehicleType', 'vehicleType', 'vehicletype'));
  formattedData['Unwanted Colors'] = getValueOrNA(mapField('unwantedColors', 'unwantedColors', 'unwantedcolors'));
  formattedData['Required Features'] = getValueOrNA(mapField('requiredFeatures', 'requiredFeatures', 'requiredfeatures'));
  formattedData['Preferred Make/Model'] = getValueOrNA(mapField('preferredMakeModel', 'preferredMakeModel', 'preferredmakemodel'));
  
  // Loan information - use getBooleanValue for boolean fields
  const existingLoanValue = mapField('hasExistingLoan', 'hasExistingLoan', 'hasexistingloan');
  console.log('Has Existing Loan raw value:', existingLoanValue, 'type:', typeof existingLoanValue);
  formattedData['Has Existing Loan'] = getBooleanValue(existingLoanValue);
  
  formattedData['Current Vehicle'] = getValueOrNA(mapField('currentVehicle', 'currentVehicle', 'currentvehicle'));
  formattedData['Current Payment'] = getValueOrNA(mapField('currentPayment', 'currentPayment', 'currentpayment'));
  formattedData['Amount Owed'] = getValueOrNA(mapField('amountOwed', 'amountOwed', 'amountowed'));
  formattedData['Mileage'] = getValueOrNA(mapField('mileage', 'mileage', 'mileage'));
  
  // Income information
  formattedData['Employment Status'] = getValueOrNA(mapField('employmentStatus', 'employmentStatus', 'employmentstatus'));
  formattedData['Monthly Income'] = getValueOrNA(mapField('monthlyIncome', 'monthlyIncome', 'monthlyincome'));
  formattedData['Employer Name'] = getValueOrNA(mapField('employerName', 'employerName', 'employer_name'));
  formattedData['Job Title'] = getValueOrNA(mapField('jobTitle', 'jobTitle', 'job_title'));
  formattedData['Employment Duration'] = getValueOrNA(mapField('employmentDuration', 'employmentDuration', 'employment_duration'));
  
  // Additional information
  formattedData['Additional Notes'] = getValueOrNA(mapField('additionalNotes', 'additionalNotes', 'additionalnotes'));
  formattedData['Submission Date'] = createdDate;
  
  // Log the formatted data for all key fields
  console.log('Formatted data for key fields:');
  [
    'Full Name', 'City', 'Address', 'Province', 'Postal Code', 'Email', 'Phone Number',
    'Vehicle Type', 'Unwanted Colors', 'Required Features', 'Preferred Make/Model',
    'Has Existing Loan', 'Current Vehicle', 'Current Payment', 'Amount Owed', 'Mileage',
    'Employment Status', 'Monthly Income', 'Employer Name', 'Job Title', 'Employment Duration',
    'Additional Notes', 'Submission Date'
  ].forEach(key => {
    console.log(`${key}: '${formattedData[key]}'`);
  });
  
  // Final fallback to ensure we include ALL fields from the application with proper display names
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
      // Try to find the value using various naming conventions
      const camelCaseKey = toCamelCase(columnName);
      const value = application[columnName] ?? 
                   application[camelCaseKey] ?? 
                   application[columnName.toLowerCase()] ?? 
                   application[camelCaseKey.toLowerCase()];
      
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
