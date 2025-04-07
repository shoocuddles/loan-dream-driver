
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
    
    // Map field names to match our PDF categories
    formattedData['Full Name'] = getValueOrNA(downloadedApp.fullName || downloadedApp.fullname);
    formattedData['City'] = getValueOrNA(downloadedApp.city);
    formattedData['Address'] = getValueOrNA(downloadedApp.streetAddress || downloadedApp.streetaddress);
    formattedData['Province'] = getValueOrNA(downloadedApp.province);
    formattedData['Postal Code'] = getValueOrNA(downloadedApp.postalCode || downloadedApp.postalcode);
    formattedData['Email'] = getValueOrNA(downloadedApp.email);
    formattedData['Phone Number'] = getValueOrNA(downloadedApp.phoneNumber || downloadedApp.phonenumber);
    formattedData['Download Id'] = getValueOrNA(downloadedApp.downloadId || downloadedApp.id);
    
    // Vehicle information
    formattedData['Vehicle Type'] = getValueOrNA(downloadedApp.vehicleType || downloadedApp.vehicletype);
    formattedData['Unwanted Colors'] = getValueOrNA(downloadedApp.unwantedColors || downloadedApp.unwantedcolors);
    formattedData['Required Features'] = getValueOrNA(downloadedApp.requiredFeatures || downloadedApp.requiredfeatures);
    formattedData['Preferred Make/Model'] = getValueOrNA(downloadedApp.preferredMakeModel || downloadedApp.preferredmakemodel);
    
    // Loan information
    formattedData['Has Existing Loan'] = getBooleanValue(downloadedApp.hasExistingLoan || downloadedApp.hasexistingloan);
    formattedData['Current Vehicle'] = getValueOrNA(downloadedApp.currentVehicle || downloadedApp.currentvehicle);
    formattedData['Current Payment'] = getValueOrNA(downloadedApp.currentPayment || downloadedApp.currentpayment);
    formattedData['Amount Owed'] = getValueOrNA(downloadedApp.amountOwed || downloadedApp.amountowed);
    formattedData['Mileage'] = getValueOrNA(downloadedApp.mileage);
    
    // Income information
    formattedData['Employment Status'] = getValueOrNA(downloadedApp.employmentStatus || downloadedApp.employmentstatus);
    formattedData['Monthly Income'] = getValueOrNA(downloadedApp.monthlyIncome || downloadedApp.monthlyincome);
    formattedData['Employer Name'] = getValueOrNA(downloadedApp.employerName || downloadedApp.employer_name);
    formattedData['Job Title'] = getValueOrNA(downloadedApp.jobTitle || downloadedApp.job_title);
    formattedData['Employment Duration'] = getValueOrNA(downloadedApp.employmentDuration || downloadedApp.employment_duration);
    formattedData['Status'] = getValueOrNA(downloadedApp.status);
    
    // Add additional fields
    formattedData['Application ID'] = getValueOrNA(downloadedApp.applicationId || downloadedApp.id);
    formattedData['Submission Date'] = createdDate;
    formattedData['Last Updated'] = updatedDate;
    formattedData['Additional Notes'] = getValueOrNA(downloadedApp.additionalNotes || downloadedApp.additionalnotes);
    
    // Make sure ALL columns from metadata are included, even if missing in the downloadedApp
    columnMetadata.forEach(column => {
      const camelCaseKey = toCamelCase(column.name);
      const snakeCaseKey = column.name;
      const displayName = column.displayName;
      
      // Check if we already have this field (using various naming conventions)
      const hasField = Object.keys(formattedData).some(key => 
        key.toLowerCase() === displayName.toLowerCase() || 
        key.replace(/\s+/g, '').toLowerCase() === displayName.replace(/\s+/g, '').toLowerCase()
      );
      
      if (!hasField) {
        // Look for the field using various naming formats
        const value = downloadedApp[camelCaseKey] || downloadedApp[snakeCaseKey] || null;
        formattedData[displayName] = getValueOrNA(value);
      }
    });
  } 
  // For standard applications directly from the database
  else {
    const standardApp = application as any;
    
    // Map field names to match our PDF categories
    formattedData['Full Name'] = getValueOrNA(standardApp.fullname);
    formattedData['City'] = getValueOrNA(standardApp.city);
    formattedData['Address'] = getValueOrNA(standardApp.streetaddress);
    formattedData['Province'] = getValueOrNA(standardApp.province);
    formattedData['Postal Code'] = getValueOrNA(standardApp.postalcode);
    formattedData['Email'] = getValueOrNA(standardApp.email);
    formattedData['Phone Number'] = getValueOrNA(standardApp.phonenumber);
    
    // Vehicle information
    formattedData['Vehicle Type'] = getValueOrNA(standardApp.vehicletype);
    formattedData['Unwanted Colors'] = getValueOrNA(standardApp.unwantedcolors);
    formattedData['Required Features'] = getValueOrNA(standardApp.requiredfeatures);
    formattedData['Preferred Make/Model'] = getValueOrNA(standardApp.preferredmakemodel);
    
    // Loan information
    formattedData['Has Existing Loan'] = getBooleanValue(standardApp.hasexistingloan);
    formattedData['Current Vehicle'] = getValueOrNA(standardApp.currentvehicle);
    formattedData['Current Payment'] = getValueOrNA(standardApp.currentpayment);
    formattedData['Amount Owed'] = getValueOrNA(standardApp.amountowed);
    formattedData['Mileage'] = getValueOrNA(standardApp.mileage);
    
    // Income information
    formattedData['Employment Status'] = getValueOrNA(standardApp.employmentstatus);
    formattedData['Monthly Income'] = getValueOrNA(standardApp.monthlyincome);
    formattedData['Employer Name'] = getValueOrNA(standardApp.employer_name);
    formattedData['Job Title'] = getValueOrNA(standardApp.job_title);
    formattedData['Employment Duration'] = getValueOrNA(standardApp.employment_duration);
    formattedData['Status'] = getValueOrNA(standardApp.status);
    
    // Add additional fields
    formattedData['Application ID'] = getValueOrNA(standardApp.id);
    formattedData['Submission Date'] = createdDate;
    formattedData['Last Updated'] = updatedDate;
    formattedData['Additional Notes'] = getValueOrNA(standardApp.additionalnotes);
    
    // Process ALL database columns systematically, including all empty fields
    // This ensures we don't miss any fields not explicitly mapped above
    columnMetadata.forEach(column => {
      const key = column.name;
      const displayName = column.displayName;
      
      // Check if we already have this field (using various naming conventions)
      const hasField = Object.keys(formattedData).some(existingKey => 
        existingKey.toLowerCase() === displayName.toLowerCase() || 
        existingKey.replace(/\s+/g, '').toLowerCase() === displayName.replace(/\s+/g, '').toLowerCase()
      );
      
      if (!hasField) {
        // Handle mappings between camelCase and snake_case
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
