
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
  
  // DIRECT MAPPING FROM DATABASE FIELDS - Using the exact field names from Supabase
  // This ensures we get the data regardless of camelCase vs snake_case issues
  formattedData['Full Name'] = getValueOrNA(application.fullname || application.fullName);
  formattedData['City'] = getValueOrNA(application.city);
  formattedData['Address'] = getValueOrNA(application.streetaddress || application.streetAddress);
  formattedData['Province'] = getValueOrNA(application.province);
  formattedData['Postal Code'] = getValueOrNA(application.postalcode || application.postalCode);
  formattedData['Email'] = getValueOrNA(application.email);
  formattedData['Phone Number'] = getValueOrNA(application.phonenumber || application.phoneNumber);
  
  // Vehicle information - using the specific field names from Supabase
  formattedData['Vehicle Type'] = getValueOrNA(application.vehicletype || application.vehicleType);
  formattedData['Unwanted Colors'] = getValueOrNA(application.unwantedcolors || application.unwantedColors);
  formattedData['Required Features'] = getValueOrNA(application.requiredfeatures || application.requiredFeatures);
  formattedData['Preferred Make/Model'] = getValueOrNA(application.preferredmakemodel || application.preferredMakeModel);
  
  // Loan information - use getBooleanValue for boolean fields
  // Try multiple field name variations to ensure we capture the data
  let hasExistingLoan = 'N/A';
  
  if ('hasexistingloan' in application && application.hasexistingloan !== undefined) {
    hasExistingLoan = getBooleanValue(application.hasexistingloan);
  } else if ('hasExistingLoan' in application && (application as any).hasExistingLoan !== undefined) {
    hasExistingLoan = getBooleanValue((application as any).hasExistingLoan);
  }
  
  formattedData['Has Existing Loan'] = hasExistingLoan;
  formattedData['Current Vehicle'] = getValueOrNA(application.currentvehicle || (application as any).currentVehicle);
  formattedData['Current Payment'] = getValueOrNA(application.currentpayment || (application as any).currentPayment);
  formattedData['Amount Owed'] = getValueOrNA(application.amountowed || (application as any).amountOwed);
  formattedData['Mileage'] = getValueOrNA(application.mileage);
  
  // Income information - ensuring all possible field name variations are checked
  formattedData['Employment Status'] = getValueOrNA(application.employmentstatus || (application as any).employmentStatus);
  formattedData['Monthly Income'] = getValueOrNA(application.monthlyincome || (application as any).monthlyIncome);
  formattedData['Employer Name'] = getValueOrNA(application.employer_name || (application as any).employerName);
  formattedData['Job Title'] = getValueOrNA(application.job_title || (application as any).jobTitle);
  formattedData['Employment Duration'] = getValueOrNA(application.employment_duration || (application as any).employmentDuration);
  
  // Additional information
  formattedData['Additional Notes'] = getValueOrNA(application.additionalnotes || (application as any).additionalNotes);
  formattedData['Submission Date'] = createdDate;
  
  // Log the formatted data for all key fields to confirm values are being properly assigned
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
