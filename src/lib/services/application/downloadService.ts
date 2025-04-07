import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Application } from '@/lib/types/supabase';
import { DownloadedApplication } from '@/lib/types/dealer-dashboard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ApplicationData = Application | DownloadedApplication;

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
    
    // If we got data from the regular applications table, return it
    if (lowerCaseData && lowerCaseData.length > 0) {
      console.log(`✅ Retrieved ${lowerCaseData.length} full application details from applications table`);
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
      
      if (downloadError) throw downloadError;
      
      // If we got data, filter for requested application ids
      if (Array.isArray(downloadedApps) && downloadedApps.length > 0) {
        const filteredDownloads = downloadedApps.filter((app: any) => 
          applicationIds.includes(app.applicationId)
        );
        
        if (filteredDownloads.length > 0) {
          console.log(`✅ Retrieved ${filteredDownloads.length} application details from downloads`);
          return filteredDownloads as DownloadedApplication[];
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
        
        // Now fetch the full application details for each download
        const appData = await Promise.all(downloadRecords.map(async (record) => {
          const { data: appDetails, error: appError } = await supabase
            .from('applications')
            .select('*')
            .eq('id', record.application_id)
            .single();
          
          if (appError) {
            console.error(`❌ Error fetching application details for ${record.application_id}:`, appError);
            return null;
          }
          
          return {
            downloadId: record.id,
            downloadDate: record.downloaded_at,
            applicationId: record.application_id,
            paymentAmount: record.payment_amount,
            fullName: appDetails?.fullname || 'Unknown',
            email: appDetails?.email,
            phoneNumber: appDetails?.phonenumber || appDetails?.phone,
            address: appDetails?.streetaddress || appDetails?.address,
            city: appDetails?.city,
            province: appDetails?.province,
            postalCode: appDetails?.postalcode,
            vehicleType: appDetails?.vehicletype
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

// Helper function to format application data for display
const formatApplicationData = (application: ApplicationData) => {
  // Check if this is a downloaded application (has different field structure)
  const isDownloadedApp = 'downloadId' in application || 'applicationId' in application;
  
  // Format dates - handle different date field locations based on application type
  let createdDate = 'N/A';
  if (isDownloadedApp) {
    const downloadedApp = application as DownloadedApplication;
    if (downloadedApp.downloadDate) {
      createdDate = format(new Date(downloadedApp.downloadDate), 'MMM d, yyyy');
    }
  } else {
    const standardApp = application as Application;
    if ('created_at' in standardApp && standardApp.created_at) {
      createdDate = format(new Date(standardApp.created_at), 'MMM d, yyyy');
    }
  }
    
  // Get updated date (only for standard applications)
  const updatedDate = !isDownloadedApp && ('updated_at' in application) && (application as Application).updated_at 
    ? format(new Date((application as Application).updated_at), 'MMM d, yyyy')
    : 'N/A';
  
  // Handle nullable fields
  const getValueOrNA = (value: any) => value !== null && value !== undefined ? String(value) : 'N/A';
  const getBooleanValue = (value: boolean | null | undefined) => value === true ? 'Yes' : 'No';
  
  // If we have a downloaded app format, map fields differently
  if (isDownloadedApp) {
    const downloadedApp = application as DownloadedApplication;
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
  const standardApp = application as Application;
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
    'Monthly Income': getValueOrNA(standardApp.monthlyincome || standardApp.income), // Keep the fallback for income field
    'Additional Notes': getValueOrNA(standardApp.additionalnotes),
    'Status': getValueOrNA(standardApp.status),
    'Submission Date': createdDate,
    'Last Updated': updatedDate
  };
};

// Get a formatted date string from application data
const getDateFromApplication = (application: ApplicationData): string => {
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
const generateFilename = (application: ApplicationData, extension: string): string => {
  // Use appropriate ID field depending on the application type
  const id = 'applicationId' in application ? application.applicationId : application.id;
  return `application_${id}.${extension}`;
};

// Download as PDF
export const downloadAsPDF = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📄 Generating PDF for applications:', applicationIds);
    
    const applications = await fetchFullApplicationDetails(applicationIds);
    if (!applications.length) {
      console.error('❌ No application data found for PDF generation');
      toast.error('No application data found. Please try downloading again.');
      return;
    }
    
    // Create PDF document
    const pdf = new jsPDF();
    let isFirstPage = true;
    
    // Process each application on a separate page
    for (const application of applications) {
      // Add page break after first page
      if (!isFirstPage) {
        pdf.addPage();
      } else {
        isFirstPage = false;
      }
      
      // Add header
      pdf.setFontSize(20);
      pdf.setTextColor(0, 51, 102); // Ontario blue color
      pdf.text('Ontario Leads', 105, 15, { align: 'center' });
      
      // Add application ID and date
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      const appId = 'applicationId' in application ? application.applicationId : application.id;
      pdf.text(`Application ID: ${appId}`, 14, 25);
      pdf.text(`Date: ${getDateFromApplication(application)}`, 14, 32);
      
      // Format data for PDF
      const formattedData = formatApplicationData(application);
      
      // Convert to rows for autoTable
      const rows = Object.entries(formattedData).map(([key, value]) => [key, value]);
      
      // Add table of application details
      autoTable(pdf, {
        startY: 40,
        head: [['Field', 'Value']],
        body: rows,
        headStyles: {
          fillColor: [0, 51, 102], // Ontario blue
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240]
        },
        margin: { top: 40 },
        styles: { overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 'auto' }
        }
      });
      
      // Add footer with page number
      const pageCount = pdf.getNumberOfPages();
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Page ${pageCount}`, 195, 285, { align: 'right' });
    }
    
    // Save the PDF
    const fileName = applications.length === 1 
      ? generateFilename(applications[0], 'pdf')
      : `applications_${new Date().getTime()}.pdf`;
    
    pdf.save(fileName);
    console.log('✅ PDF generated successfully');
    toast.success('PDF downloaded successfully');
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    toast.error('Error generating PDF');
  }
};

// Download as CSV
export const downloadAsCSV = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📊 Generating CSV for applications:', applicationIds);
    
    const applications = await fetchFullApplicationDetails(applicationIds);
    if (!applications.length) {
      console.error('❌ No application data found for CSV generation');
      toast.error('No application data found. Please try downloading again.');
      return;
    }
    
    // Format all applications
    const formattedApplications = applications.map(formatApplicationData);
    
    // Create CSV content
    const headers = Object.keys(formattedApplications[0]);
    const csvRows = [
      // Header row
      headers.join(','),
      // Data rows
      ...formattedApplications.map(app => 
        headers.map(header => {
          // Escape commas and quotes
          let value = app[header as keyof typeof app] || '';
          value = String(value).replace(/"/g, '""');
          // Wrap in quotes if contains comma, quote or newline
          return /[",\n\r]/.test(value) ? `"${value}"` : value;
        }).join(',')
      )
    ];
    
    // Create blob and save
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = applications.length === 1 
      ? generateFilename(applications[0], 'csv')
      : `applications_${new Date().getTime()}.csv`;
    
    saveAs(blob, fileName);
    console.log('✅ CSV generated successfully');
    toast.success('CSV downloaded successfully');
  } catch (error) {
    console.error('❌ Error generating CSV:', error);
    toast.error('Error generating CSV');
  }
};

// Download as Excel
export const downloadAsExcel = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📊 Generating Excel for applications:', applicationIds);
    
    const applications = await fetchFullApplicationDetails(applicationIds);
    if (!applications.length) {
      console.error('❌ No application data found for Excel generation');
      toast.error('No application data found. Please try downloading again.');
      return;
    }
    
    // Format all applications
    const formattedApplications = applications.map(formatApplicationData);
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formattedApplications);
    
    // Set column widths
    const colWidths = Object.keys(formattedApplications[0]).map(() => ({ wch: 20 }));
    ws['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Applications');
    
    // Generate Excel file
    const fileName = applications.length === 1 
      ? generateFilename(applications[0], 'xlsx')
      : `applications_${new Date().getTime()}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    console.log('✅ Excel file generated successfully');
    toast.success('Excel file downloaded successfully');
  } catch (error) {
    console.error('❌ Error generating Excel file:', error);
    toast.error('Error generating Excel file');
  }
};
