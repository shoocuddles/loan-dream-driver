
import { format } from 'date-fns';
import { ApplicationData } from './types';

// Helper function to format application data for display
export const formatApplicationData = (application: ApplicationData) => {
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
  
  // If we have a downloaded app format, map fields differently
  if (isDownloadedApp) {
    const downloadedApp = application as any;
    return {
      'Full Name': getValueOrNA(downloadedApp.fullName),
      'Email': getValueOrNA(downloadedApp.email),
      'Phone Number': getValueOrNA(downloadedApp.phoneNumber),
      'Address': getValueOrNA(downloadedApp.address),
      'City': getValueOrNA(downloadedApp.city),
      'Province': getValueOrNA(downloadedApp.province),
      'Postal Code': getValueOrNA(downloadedApp.postalCode),
      'Vehicle Type': getValueOrNA(downloadedApp.vehicleType),
      'Download Date': downloadedApp.downloadDate
        ? format(new Date(downloadedApp.downloadDate), 'MMM d, yyyy')
        : 'N/A',
      'Application ID': getValueOrNA(downloadedApp.applicationId)
    };
  }
  
  // Standard application format from applications table
  const standardApp = application as any;
  return {
    'Full Name': getValueOrNA(standardApp.fullname),
    'Email': getValueOrNA(standardApp.email),
    'Phone Number': getValueOrNA(standardApp.phonenumber),
    'Address': getValueOrNA(standardApp.streetaddress),
    'City': getValueOrNA(standardApp.city),
    'Province': getValueOrNA(standardApp.province),
    'Postal Code': getValueOrNA(standardApp.postalcode),
    'Vehicle Type': getValueOrNA(standardApp.vehicletype),
    'Required Features': getValueOrNA(standardApp.requiredfeatures),
    'Unwanted Colors': getValueOrNA(standardApp.unwantedcolors),
    'Preferred Make/Model': getValueOrNA(standardApp.preferredmakemodel),
    'Has Existing Loan': getBooleanValue(standardApp.hasexistingloan),
    'Current Payment': getValueOrNA(standardApp.currentpayment),
    'Amount Owed': getValueOrNA(standardApp.amountowed),
    'Current Vehicle': getValueOrNA(standardApp.currentvehicle),
    'Mileage': getValueOrNA(standardApp.mileage),
    'Employment Status': getValueOrNA(standardApp.employmentstatus),
    'Monthly Income': getValueOrNA(standardApp.monthlyIncome || standardApp.income),
    'Additional Notes': getValueOrNA(standardApp.additionalnotes),
    'Status': getValueOrNA(standardApp.status),
    'Submission Date': createdDate,
    'Last Updated': updatedDate
  };
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
