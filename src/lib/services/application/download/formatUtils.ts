
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
  console.log('All keys in application:', Object.keys(application).join(', '));
  
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
  
  // Special handling for boolean fields like hasExistingLoan
  if ('hasexistingloan' in application || 'hasExistingLoan' in application || 'has_existing_loan' in application) {
    const hasLoan = unifiedApp.hasexistingloan || unifiedApp.hasExistingLoan || unifiedApp.has_existing_loan;
    formattedData['Has Existing Loan'] = getBooleanValue(hasLoan);
    console.log('Has Existing Loan field detected:', hasLoan, '→', formattedData['Has Existing Loan']);
  }
  
  // Map standard field names to display names
  const fieldMappings = {
    // Contact Details
    'fullname': 'Full Name',
    'fullName': 'Full Name',
    'full_name': 'Full Name',
    'city': 'City',
    'streetaddress': 'Address',
    'streetAddress': 'Address',
    'street_address': 'Address',
    'address': 'Address',
    'province': 'Province',
    'postalcode': 'Postal Code',
    'postalCode': 'Postal Code',
    'postal_code': 'Postal Code',
    'email': 'Email',
    'phonenumber': 'Phone Number',
    'phoneNumber': 'Phone Number',
    'phone_number': 'Phone Number',
    'phone': 'Phone Number',
    
    // Vehicle Details
    'vehicletype': 'Vehicle Type',
    'vehicleType': 'Vehicle Type',
    'vehicle_type': 'Vehicle Type',
    'unwantedcolors': 'Unwanted Colors',
    'unwantedColors': 'Unwanted Colors',
    'unwanted_colors': 'Unwanted Colors',
    'requiredfeatures': 'Required Features',
    'requiredFeatures': 'Required Features',
    'required_features': 'Required Features',
    'preferredmakemodel': 'Preferred Make/Model',
    'preferredMakeModel': 'Preferred Make/Model',
    'preferred_make_model': 'Preferred Make/Model',
    
    // Loan Details
    'hasexistingloan': 'Has Existing Loan',
    'hasExistingLoan': 'Has Existing Loan',
    'has_existing_loan': 'Has Existing Loan',
    'currentvehicle': 'Current Vehicle',
    'currentVehicle': 'Current Vehicle',
    'current_vehicle': 'Current Vehicle',
    'currentpayment': 'Current Payment',
    'currentPayment': 'Current Payment',
    'current_payment': 'Current Payment',
    'amountowed': 'Amount Owed',
    'amountOwed': 'Amount Owed',
    'amount_owed': 'Amount Owed',
    'mileage': 'Mileage',
    
    // Employment Details
    'employmentstatus': 'Employment Status',
    'employmentStatus': 'Employment Status',
    'employment_status': 'Employment Status',
    'monthlyincome': 'Monthly Income',
    'monthlyIncome': 'Monthly Income',
    'monthly_income': 'Monthly Income',
    'income': 'Monthly Income',
    'employername': 'Employer Name',
    'employerName': 'Employer Name',
    'employer_name': 'Employer Name',
    'jobtitle': 'Job Title',
    'jobTitle': 'Job Title',
    'job_title': 'Job Title',
    'employmentduration': 'Employment Duration',
    'employmentDuration': 'Employment Duration',
    'employment_duration': 'Employment Duration',
    
    // Additional Info
    'additionalnotes': 'Additional Notes',
    'additionalNotes': 'Additional Notes',
    'additional_notes': 'Additional Notes',
    'notes': 'Additional Notes',
    'id': 'Application ID',
    'applicationid': 'Application ID',
    'applicationId': 'Application ID',
    'application_id': 'Application ID',
    'created_at': 'Submission Date',
    'createdAt': 'Submission Date',
    'submitted_at': 'Submission Date',
    'submittedAt': 'Submission Date',
    'download_date': 'Download Date',
    'downloadDate': 'Download Date',
    'downloaded_at': 'Download Date'
  };
  
  // Add each application property to formattedData using mappings
  Object.entries(unifiedApp).forEach(([key, value]) => {
    // Skip null values and certain technical fields
    if (value === null || ['iscomplete', 'user_id', 'status', 'download_id'].includes(key.toLowerCase())) {
      return;
    }
    
    // Get the display name for this field
    const displayKey = fieldMappings[key] || formatColumnName(key);
    
    // Format specific field types
    if (key.toLowerCase().includes('date')) {
      // Format dates
      try {
        const date = new Date(value as string);
        if (!isNaN(date.getTime())) {
          formattedData[displayKey] = format(date, 'MMM d, yyyy');
        } else {
          formattedData[displayKey] = getValueOrNA(value);
        }
      } catch (e) {
        formattedData[displayKey] = getValueOrNA(value);
      }
    } else if (typeof value === 'boolean' || key.toLowerCase().startsWith('has') || key.toLowerCase().startsWith('is')) {
      // Format boolean fields
      formattedData[displayKey] = getBooleanValue(value);
    } else {
      // Format all other fields
      formattedData[displayKey] = getValueOrNA(value);
    }
    
    // Special case for 'hasexistingloan' as it appears in your PDF
    if (key.toLowerCase() === 'hasexistingloan' || key.toLowerCase() === 'hasexistingloan') {
      formattedData['Has Existing Loan'] = getBooleanValue(value);
    }
  });
  
  // Ensure special fields that might be nested or require special processing are included
  if (!('Has Existing Loan' in formattedData) && 
      ('hasexistingloan' in application || 'hasExistingLoan' in application)) {
    const hasLoan = application.hasexistingloan || (application as any).hasExistingLoan;
    formattedData['Has Existing Loan'] = getBooleanValue(hasLoan);
  }
  
  // Make sure Application ID is present
  if (!formattedData['Application ID']) {
    formattedData['Application ID'] = getValueOrNA(application.id || (application as any).applicationId);
  }
  
  // Make sure submission date is present
  if (!formattedData['Submission Date']) {
    formattedData['Submission Date'] = createdDate;
  }
  
  // Log the final formatted data
  console.log('Formatted data keys:', Object.keys(formattedData));
  console.log('Formatted data for key fields:', {
    'fullName': formattedData['Full Name'],
    'vehicleType': formattedData['Vehicle Type'],
    'hasExistingLoan': formattedData['Has Existing Loan'],
    'unwantedColors': formattedData['Unwanted Colors'],
    'requiredFeatures': formattedData['Required Features'],
    'preferredMakeModel': formattedData['Preferred Make/Model'],
    'employmentStatus': formattedData['Employment Status'],
    'monthlyIncome': formattedData['Monthly Income'],
    'employerName': formattedData['Employer Name'],
    'jobTitle': formattedData['Job Title'],
    'employmentDuration': formattedData['Employment Duration'],
  });
  
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
