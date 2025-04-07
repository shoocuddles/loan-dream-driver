import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Application } from '@/lib/types/supabase';
import { DownloadedApplication } from '@/lib/types/dealer-dashboard';
import { ApplicationData, ColumnMetadata } from './types';

// Get full application details once purchased
export const fetchFullApplicationDetails = async (applicationIds: string[]): Promise<ApplicationData[]> => {
  try {
    console.log('🔍 Fetching full application details for:', applicationIds);
    
    if (!applicationIds.length) return [];
    
    // First attempt with lowercase column names (database standard)
    const { data: lowerCaseData, error: lowerCaseError } = await supabase
      .from('applications')
      .select('*')
      .in('id', applicationIds);
    
    if (lowerCaseError) {
      console.error('❌ Error fetching full application details with lowercase names:', lowerCaseError);
      // Don't throw yet, we'll try with the downloaded applications table
    }
    
    // Log the raw data from Supabase for debugging
    if (lowerCaseData && lowerCaseData.length > 0) {
      console.log('🔍 RAW DATA FROM SUPABASE:');
      console.log(JSON.stringify(lowerCaseData, null, 2));
      
      // Log EVERY field for the first application to help debugging
      console.log('📄 COMPLETE FIELD MAPPING FOR FIRST APPLICATION:');
      const app = lowerCaseData[0];
      Object.keys(app).forEach(key => {
        console.log(`Field: ${key} | Value: ${JSON.stringify(app[key])} | Type: ${typeof app[key]}`);
      });
      
      // Log specific fields we're looking for
      lowerCaseData.forEach(app => {
        console.log(`Application ID ${app.id} field check:`);
        console.log('hasexistingloan:', app.hasexistingloan, 'type:', typeof app.hasexistingloan);
        console.log('currentvehicle:', app.currentvehicle, 'type:', typeof app.currentvehicle);
        console.log('currentpayment:', app.currentpayment, 'type:', typeof app.currentpayment);
        console.log('amountowed:', app.amountowed, 'type:', typeof app.amountowed);
        console.log('mileage:', app.mileage, 'type:', typeof app.mileage);
        console.log('employmentstatus:', app.employmentstatus, 'type:', typeof app.employmentstatus);
        console.log('monthlyincome:', app.monthlyincome, 'type:', typeof app.monthlyincome);
        console.log('employer_name:', app.employer_name, 'type:', typeof app.employer_name);
        console.log('job_title:', app.job_title, 'type:', typeof app.job_title);
        console.log('employment_duration:', app.employment_duration, 'type:', typeof app.employment_duration);
        console.log('additionalnotes:', app.additionalnotes, 'type:', typeof app.additionalnotes);
      });
      
      console.log('✅ Retrieved full application details from applications table');
      return lowerCaseData as Application[];
    }
    
    // If we didn't get data from applications table, try fetching from downloaded applications
    console.log('🔄 Attempting to fetch from application_downloads and join with applications');
    
    // Get the current user's ID for the dealer_id parameter
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated');
    }
    
    // Try calling the RPC function first
    try {
      const { data: downloadedApps, error: downloadError } = await supabase
        .rpc('get_dealer_downloads', {
          p_dealer_id: userData.user.id
        });
      
      if (downloadError) {
        console.error('❌ Error fetching from get_dealer_downloads:', downloadError);
        throw downloadError;
      }
      
      // If we got data, filter for requested application ids
      if (Array.isArray(downloadedApps) && downloadedApps.length > 0) {
        console.log('✅ Retrieved application details from downloads RPC, now filtering');
        console.log('📄 RAW DOWNLOAD RPC DATA:', JSON.stringify(downloadedApps, null, 2));
        
        const filteredDownloads = downloadedApps.filter((app: any) => 
          applicationIds.includes(app.applicationId || app.id)
        );
        
        if (filteredDownloads.length > 0) {
          console.log(`✅ Found ${filteredDownloads.length} application details from downloads`);
          
          // Log raw data for debugging
          console.log('🔍 RAW DATA FROM DOWNLOADS:');
          console.log(JSON.stringify(filteredDownloads, null, 2));
          
          // NEW CODE: Use the downloads data directly if it has all the fields we need
          const fieldsToCheck = [
            'vehicleType', 'requiredFeatures', 'unwantedColors', 'preferredMakeModel', 
            'hasExistingLoan', 'currentVehicle', 'currentPayment', 'amountOwed', 'mileage',
            'employmentStatus', 'monthlyIncome', 'employerName', 'jobTitle', 'employmentDuration'
          ];

          // Check if all necessary fields are present in the download data
          const hasAllFields = filteredDownloads.every((download: any) => {
            const camelCaseFields = Object.keys(download).map(k => k.toLowerCase());
            const lowerCaseFieldsToCheck = fieldsToCheck.map(f => f.toLowerCase());
            
            // Check if we have at least some of the expected fields
            const hasEnoughFields = lowerCaseFieldsToCheck.some(field => {
              // Try different variations of the field name (camelCase, snake_case, lowercase)
              const camelVariation = field;
              const snakeVariation = field.replace(/([A-Z])/g, '_$1').toLowerCase();
              
              return camelCaseFields.includes(camelVariation) || 
                     camelCaseFields.includes(snakeVariation) ||
                     Object.keys(download).some(k => k.toLowerCase() === field);
            });
            
            return hasEnoughFields;
          });

          if (hasAllFields) {
            console.log('✅ Downloads data contains all necessary fields, using it directly');
            
            // Map field names for consistency
            const mappedDownloads = filteredDownloads.map((download: any) => {
              // Create a standardized object
              const mapped: any = {
                id: download.applicationId || download.id,
                applicationId: download.applicationId || download.id,
                downloadId: download.downloadId,
                downloadDate: download.downloadDate,
                created_at: download.created_at || download.downloadDate,
                // Map all fields explicitly to ensure consistency
                fullname: download.fullName || download.fullname,
                email: download.email,
                phonenumber: download.phoneNumber || download.phonenumber,
                streetaddress: download.address || download.streetaddress || download.streetAddress,
                city: download.city,
                province: download.province,
                postalcode: download.postalCode || download.postalcode,
                // Vehicle details
                vehicletype: download.vehicleType || download.vehicletype,
                requiredfeatures: download.requiredFeatures || download.requiredfeatures,
                unwantedcolors: download.unwantedColors || download.unwantedcolors,
                preferredmakemodel: download.preferredMakeModel || download.preferredmakemodel,
                // Loan details
                hasexistingloan: download.hasExistingLoan || download.hasexistingloan,
                currentvehicle: download.currentVehicle || download.currentvehicle,
                currentpayment: download.currentPayment || download.currentpayment,
                amountowed: download.amountOwed || download.amountowed,
                mileage: download.mileage,
                // Employment details
                employmentstatus: download.employmentStatus || download.employmentstatus,
                monthlyincome: download.monthlyIncome || download.monthlyincome,
                employer_name: download.employerName || download.employer_name,
                job_title: download.jobTitle || download.job_title,
                employment_duration: download.employmentDuration || download.employment_duration,
                // Other
                additionalnotes: download.additionalNotes || download.additionalnotes
              };
              
              // Debug log the mapped object
              console.log('📄 MAPPED DOWNLOAD DATA:');
              console.log(JSON.stringify(mapped, null, 2));
              
              return mapped;
            });
            
            return mappedDownloads as ApplicationData[];
          }
          
          // If we don't have all fields, continue with the original approach
          console.log('⚠️ Downloads data is missing some fields, trying to fetch complete application data');
          
          // For each download, fetch the full application data to ensure we have ALL fields
          const completeApplications = await Promise.all(filteredDownloads.map(async (download: any) => {
            const { data: appData, error: appError } = await supabase
              .from('applications')
              .select('*')
              .eq('id', download.applicationId || download.id)
              .single();
              
            if (appError) {
              console.warn(`⚠️ Could not fetch complete data for ${download.applicationId || download.id}:`, appError);
              
              // IMPORTANT NEW CODE: Instead of just returning what we have,
              // Map all the fields properly from the download data to match the database field names
              const mappedDownload: any = {
                id: download.applicationId || download.id,
                downloadId: download.downloadId,
                downloadDate: download.downloadDate,
                created_at: download.created_at || download.downloadDate,
                // Map the fields explicitly to ensure they match the database structure
                fullname: download.fullName || download.fullname,
                email: download.email,
                phonenumber: download.phoneNumber || download.phonenumber,
                streetaddress: download.address || download.streetaddress || download.streetAddress,
                city: download.city,
                province: download.province,
                postalcode: download.postalCode || download.postalcode,
                // Vehicle details - map from camelCase to lowercase
                vehicletype: download.vehicleType || download.vehicletype,
                requiredfeatures: download.requiredFeatures || download.requiredfeatures,
                unwantedcolors: download.unwantedColors || download.unwantedcolors,
                preferredmakemodel: download.preferredMakeModel || download.preferredmakemodel,
                // Loan details - map from camelCase to lowercase
                hasexistingloan: download.hasExistingLoan || download.hasexistingloan,
                currentvehicle: download.currentVehicle || download.currentvehicle,
                currentpayment: download.currentPayment || download.currentpayment,
                amountowed: download.amountOwed || download.amountowed,
                mileage: download.mileage,
                // Employment details - map from camelCase to lowercase
                employmentstatus: download.employmentStatus || download.employmentstatus,
                monthlyincome: download.monthlyIncome || download.monthlyincome,
                employer_name: download.employerName || download.employer_name,
                job_title: download.jobTitle || download.job_title,
                employment_duration: download.employmentDuration || download.employment_duration,
                // Other fields
                additionalnotes: download.additionalNotes || download.additionalnotes
              };
              
              // Log the mapped data for debugging
              console.log(`📄 MAPPED DOWNLOAD DATA FOR APPLICATION ${mappedDownload.id}:`);
              console.log(JSON.stringify(mappedDownload, null, 2));
              
              return mappedDownload;
            }
            
            // Log the raw application data
            console.log(`🔍 COMPLETE RAW APPLICATION DATA for ${download.applicationId || download.id}:`);
            console.log(JSON.stringify(appData, null, 2));
            
            // Log EVERY field to help debugging
            console.log(`📄 COMPLETE FIELD MAPPING FOR APPLICATION ${download.applicationId || download.id}:`);
            Object.keys(appData).forEach(key => {
              console.log(`Field: ${key} | Value: ${JSON.stringify(appData[key])} | Type: ${typeof appData[key]}`);
            });
            
            // We use the download data as priority, but fill in any missing fields from appData
            // This way we preserve the downloadId, downloadDate, paymentAmount, while getting all the application data
            // Return the combined data, with download fields taking precedence
            return { ...appData, ...download };
          }));
          
          return completeApplications as DownloadedApplication[];
        }
      }
    } catch (rpcError) {
      console.error('❌ Error fetching from get_dealer_downloads:', rpcError);
      // Continue to fallback query
    }
    
    // Attempt a direct join query as fallback
    try {
      // First get the download records
      const { data: downloadRecords, error: downloadError } = await supabase
        .from('application_downloads')
        .select('id, downloaded_at, application_id, payment_amount, dealer_id')
        .in('application_id', applicationIds)
        .eq('dealer_id', userData.user.id);
      
      if (downloadError) throw downloadError;
      
      if (downloadRecords && downloadRecords.length > 0) {
        console.log(`✅ Found ${downloadRecords.length} download records`);
        console.log('📄 RAW DOWNLOAD RECORDS:', JSON.stringify(downloadRecords, null, 2));
        
        // Now fetch the full application details for each download
        const appData = await Promise.all(downloadRecords.map(async (record) => {
          const { data: appDetails, error: appError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', record.application_id)
            .single();
          
          if (appError) {
            console.error(`❌ Error fetching application details for ${record.application_id}:`, appError);
            // Return a basic record with download info if we can't get app details
            return {
              downloadId: record.id,
              downloadDate: record.downloaded_at,
              applicationId: record.application_id,
              paymentAmount: record.payment_amount,
              id: record.application_id
            };
          }
          
          // Log the raw application data
          console.log(`🔍 COMPLETE RAW APPLICATION DATA for ${record.application_id}:`);
          console.log(JSON.stringify(appDetails, null, 2));
          
          // Log EVERY field to help debugging
          console.log(`📄 COMPLETE FIELD MAPPING FOR APPLICATION ${record.application_id}:`);
          Object.keys(appDetails).forEach(key => {
            console.log(`Field: ${key} | Value: ${JSON.stringify(appDetails[key])} | Type: ${typeof appDetails[key]}`);
          });
          
          return {
            downloadId: record.id,
            downloadDate: record.downloaded_at,
            applicationId: record.application_id,
            paymentAmount: record.payment_amount,
            ...appDetails // Include all fields from the application
          };
        }));
        
        // Filter out any null results
        const validAppData = appData.filter(item => item !== null) as DownloadedApplication[];
        
        if (validAppData.length > 0) {
          console.log(`✅ Transformed ${validAppData.length} application records`);
          return validAppData;
        }
      }
    } catch (fallbackError) {
      console.error('❌ Error with fallback query:', fallbackError);
    }
    
    console.error('❌ Could not find application data in any table');
    toast.error('Could not find application data. Please try downloading the application again.');
    return [];
  } catch (error) {
    console.error('❌ Error in fetchFullApplicationDetails:', error);
    toast.error('Error retrieving application details');
    return [];
  }
};

// Fetch all column metadata from the applications table
export const fetchApplicationColumnMetadata = async (): Promise<ColumnMetadata[]> => {
  try {
    console.log('🔍 Fetching column metadata for applications table');
    
    // Query Postgres system catalog for column information
    const { data: columnsData, error } = await supabase
      .rpc('get_applications_columns');
    
    if (error) {
      console.error('❌ Error fetching column metadata:', error);
      
      // Fallback to hardcoded list if RPC fails
      return getDefaultColumnMetadata();
    }
    
    if (columnsData && columnsData.length > 0) {
      console.log(`✅ Retrieved ${columnsData.length} columns from applications table`);
      
      // Map the column data to our metadata format
      const metadata = columnsData.map((col: any) => ({
        name: col.column_name,
        displayName: formatColumnName(col.column_name)
      }));
      
      // Add any additional virtual columns that might be needed
      metadata.push({ name: 'downloadDate', displayName: 'Download Date' });
      metadata.push({ name: 'applicationId', displayName: 'Application ID' });
      metadata.push({ name: 'paymentAmount', displayName: 'Payment Amount' });
      
      return metadata;
    }
    
    // Fallback to hardcoded list if no columns returned
    console.log('⚠️ No column metadata returned, using fallback column list');
    return getDefaultColumnMetadata();
  } catch (error) {
    console.error('❌ Error in fetchApplicationColumnMetadata:', error);
    // Fallback to hardcoded list on error
    return getDefaultColumnMetadata();
  }
};

// Format database column names to display names
const formatColumnName = (columnName: string): string => {
  // Replace underscores with spaces and capitalize each word
  return columnName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Fallback column metadata in case the database query fails
const getDefaultColumnMetadata = (): ColumnMetadata[] => {
  // Include ALL known database columns, even if they might not be used
  const columns = [
    // Standard application fields
    { name: 'id', displayName: 'ID' },
    { name: 'user_id', displayName: 'User ID' },
    { name: 'fullname', displayName: 'Full Name' },
    { name: 'email', displayName: 'Email' },
    { name: 'phonenumber', displayName: 'Phone Number' },
    { name: 'streetaddress', displayName: 'Street Address' },
    { name: 'city', displayName: 'City' },
    { name: 'province', displayName: 'Province' },
    { name: 'postalcode', displayName: 'Postal Code' },
    { name: 'vehicletype', displayName: 'Vehicle Type' },
    { name: 'requiredfeatures', displayName: 'Required Features' },
    { name: 'unwantedcolors', displayName: 'Unwanted Colors' },
    { name: 'preferredmakemodel', displayName: 'Preferred Make/Model' },
    { name: 'hasexistingloan', displayName: 'Has Existing Loan' },
    { name: 'currentpayment', displayName: 'Current Payment' },
    { name: 'amountowed', displayName: 'Amount Owed' },
    { name: 'currentvehicle', displayName: 'Current Vehicle' },
    { name: 'mileage', displayName: 'Mileage' },
    { name: 'employmentstatus', displayName: 'Employment Status' },
    { name: 'monthlyincome', displayName: 'Monthly Income' },
    { name: 'additionalnotes', displayName: 'Additional Notes' },
    { name: 'employer_name', displayName: 'Employer Name' },
    { name: 'job_title', displayName: 'Job Title' },
    { name: 'employment_duration', displayName: 'Employment Duration' },
    { name: 'status', displayName: 'Status' },
    { name: 'iscomplete', displayName: 'Is Complete' },
    { name: 'created_at', displayName: 'Submission Date' },
    { name: 'updated_at', displayName: 'Last Updated' },
    { name: 'payment_amount', displayName: 'Payment Amount' },
    
    // Virtual fields from download processing
    { name: 'downloadId', displayName: 'Download ID' },
    { name: 'downloadDate', displayName: 'Download Date' },
    { name: 'applicationId', displayName: 'Application ID' },
    { name: 'paymentAmount', displayName: 'Payment Amount' }
  ];
  
  return columns;
};
