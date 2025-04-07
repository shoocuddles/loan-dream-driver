
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
  
  // Build a dynamic object based on the application type and available fields
  if (isDownloadedApp) {
    // For downloaded applications, map fields from the downloaded format
    const downloadedApp = application as any;
    
    // Standard fields that are always included
    formattedData['Full Name'] = getValueOrNA(downloadedApp.fullName);
    formattedData['Email'] = getValueOrNA(downloadedApp.email);
    formattedData['Phone Number'] = getValueOrNA(downloadedApp.phoneNumber);
    formattedData['Address'] = getValueOrNA(downloadedApp.address);
    formattedData['City'] = getValueOrNA(downloadedApp.city);
    formattedData['Province'] = getValueOrNA(downloadedApp.province);
    formattedData['Postal Code'] = getValueOrNA(downloadedApp.postalCode);
    formattedData['Vehicle Type'] = getValueOrNA(downloadedApp.vehicleType);
    formattedData['Download Date'] = downloadedApp.downloadDate
      ? format(new Date(downloadedApp.downloadDate), 'MMM d, yyyy')
      : 'N/A';
    formattedData['Application ID'] = getValueOrNA(downloadedApp.applicationId);
    
    // Add all other fields that might be available
    for (const key in downloadedApp) {
      if (!['fullName', 'email', 'phoneNumber', 'address', 'city', 'province', 'postalCode', 
           'vehicleType', 'downloadDate', 'applicationId', 'downloadId', 'paymentAmount'].includes(key)) {
        const column = columnMetadata.find(col => col.name === key.toLowerCase());
        if (column) {
          formattedData[column.displayName] = getValueOrNA(downloadedApp[key]);
        }
      }
    }
  } else {
    // Standard application format from applications table
    const standardApp = application as any;
    
    // Include all available fields
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
      // Handle different naming conventions between API and database
      else if (key === 'monthlyincome' && 'monthlyIncome' in standardApp) {
        formattedData[displayName] = getValueOrNA(standardApp.monthlyIncome);
      }
      // Standard field handling
      else if (key in standardApp) {
        formattedData[displayName] = getValueOrNA(standardApp[key]);
      }
    });
    
    // Ensure these fields are always present with correct naming
    formattedData['Full Name'] = getValueOrNA(standardApp.fullname);
    formattedData['Email'] = getValueOrNA(standardApp.email);
    formattedData['Phone Number'] = getValueOrNA(standardApp.phonenumber);
    formattedData['Address'] = getValueOrNA(standardApp.streetaddress);
    formattedData['City'] = getValueOrNA(standardApp.city);
    formattedData['Province'] = getValueOrNA(standardApp.province);
    formattedData['Postal Code'] = getValueOrNA(standardApp.postalcode);
    formattedData['Vehicle Type'] = getValueOrNA(standardApp.vehicletype);
    formattedData['Required Features'] = getValueOrNA(standardApp.requiredfeatures);
    formattedData['Unwanted Colors'] = getValueOrNA(standardApp.unwantedcolors);
    formattedData['Preferred Make/Model'] = getValueOrNA(standardApp.preferredmakemodel);
    formattedData['Has Existing Loan'] = getBooleanValue(standardApp.hasexistingloan);
    formattedData['Current Payment'] = getValueOrNA(standardApp.currentpayment);
    formattedData['Amount Owed'] = getValueOrNA(standardApp.amountowed);
    formattedData['Current Vehicle'] = getValueOrNA(standardApp.currentvehicle);
    formattedData['Mileage'] = getValueOrNA(standardApp.mileage);
    formattedData['Employment Status'] = getValueOrNA(standardApp.employmentstatus);
    formattedData['Monthly Income'] = getValueOrNA(standardApp.monthlyincome || standardApp.monthlyIncome);
    formattedData['Additional Notes'] = getValueOrNA(standardApp.additionalnotes);
    formattedData['Status'] = getValueOrNA(standardApp.status);
  }
  
  return formattedData;
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
