
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Application } from '@/lib/types/supabase';
import { supabase } from '@/integrations/supabase/client';

// Get full application details once purchased
export const fetchFullApplicationDetails = async (applicationIds: string[]): Promise<Application[]> => {
  try {
    console.log('🔍 Fetching full application details for:', applicationIds);
    
    if (!applicationIds.length) return [];
    
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .in('id', applicationIds);
    
    if (error) {
      console.error('❌ Error fetching full application details:', error);
      throw error;
    }
    
    console.log(`✅ Retrieved ${data?.length || 0} full application details`);
    return data || [];
  } catch (error) {
    console.error('❌ Error in fetchFullApplicationDetails:', error);
    return [];
  }
};

// Helper function to format application data for display
const formatApplicationData = (application: Application) => {
  // Format dates
  const createdAt = application.created_at ? format(new Date(application.created_at), 'MMM d, yyyy') : 'N/A';
  const updatedAt = application.updated_at ? format(new Date(application.updated_at), 'MMM d, yyyy') : 'N/A';
  
  // Handle nullable fields
  const getValueOrNA = (value: any) => value !== null && value !== undefined ? String(value) : 'N/A';
  const getBooleanValue = (value: boolean | null | undefined) => value === true ? 'Yes' : 'No';
  
  return {
    'Full Name': getValueOrNA(application.fullname),
    'Email': getValueOrNA(application.email),
    'Phone Number': getValueOrNA(application.phonenumber),
    'Address': getValueOrNA(application.streetaddress),
    'City': getValueOrNA(application.city),
    'Province': getValueOrNA(application.province),
    'Postal Code': getValueOrNA(application.postalcode),
    'Vehicle Type': getValueOrNA(application.vehicletype),
    'Required Features': getValueOrNA(application.requiredfeatures),
    'Unwanted Colors': getValueOrNA(application.unwantedcolors),
    'Preferred Make/Model': getValueOrNA(application.preferredmakemodel),
    'Has Existing Loan': getBooleanValue(application.hasexistingloan),
    'Current Payment': getValueOrNA(application.currentpayment),
    'Amount Owed': getValueOrNA(application.amountowed),
    'Current Vehicle': getValueOrNA(application.currentvehicle),
    'Mileage': getValueOrNA(application.mileage),
    'Employment Status': getValueOrNA(application.employmentstatus),
    'Monthly Income': getValueOrNA(application.monthlyincome),
    'Additional Notes': getValueOrNA(application.additionalnotes),
    'Status': getValueOrNA(application.status),
    'Submission Date': createdAt,
    'Last Updated': updatedAt
  };
};

// Download as PDF
export const downloadAsPDF = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📄 Generating PDF for applications:', applicationIds);
    
    const applications = await fetchFullApplicationDetails(applicationIds);
    if (!applications.length) {
      console.error('❌ No application data found for PDF generation');
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
      pdf.text(`Application ID: ${application.id}`, 14, 25);
      pdf.text(`Date: ${format(new Date(application.created_at || new Date()), 'MMMM d, yyyy')}`, 14, 32);
      
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
      ? `application_${applications[0].id}.pdf`
      : `applications_${new Date().getTime()}.pdf`;
    
    pdf.save(fileName);
    console.log('✅ PDF generated successfully');
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
  }
};

// Download as CSV
export const downloadAsCSV = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📊 Generating CSV for applications:', applicationIds);
    
    const applications = await fetchFullApplicationDetails(applicationIds);
    if (!applications.length) {
      console.error('❌ No application data found for CSV generation');
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
      ? `application_${applications[0].id}.csv`
      : `applications_${new Date().getTime()}.csv`;
    
    saveAs(blob, fileName);
    console.log('✅ CSV generated successfully');
  } catch (error) {
    console.error('❌ Error generating CSV:', error);
  }
};

// Download as Excel
export const downloadAsExcel = async (applicationIds: string[]): Promise<void> => {
  try {
    console.log('📊 Generating Excel for applications:', applicationIds);
    
    const applications = await fetchFullApplicationDetails(applicationIds);
    if (!applications.length) {
      console.error('❌ No application data found for Excel generation');
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
      ? `application_${applications[0].id}.xlsx`
      : `applications_${new Date().getTime()}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    console.log('✅ Excel file generated successfully');
  } catch (error) {
    console.error('❌ Error generating Excel file:', error);
  }
};
