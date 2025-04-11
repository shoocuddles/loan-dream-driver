
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { generateFilename } from './formatUtils';
import { fetchFullApplicationDetails } from './fetchService';
import { ApplicationData } from './types';

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
    
    // Log the raw application data for debugging
    console.log('Raw application data received for PDF:', applications[0]);
    
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
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Ontario Loans - Lead Details', 105, 15, { align: 'center' });
      
      // Define the categories and their fields with direct mapping to database column names
      const categories = [
        {
          title: 'Contact Details',
          fields: [
            { label: 'Full Name', dbField: 'fullName' },
            { label: 'City', dbField: 'city' },
            { label: 'Address', dbField: 'address' },
            { label: 'Province', dbField: 'province' },
            { label: 'Postal Code', dbField: 'postalCode' },
            { label: 'Email', dbField: 'email' },
            { label: 'Phone Number', dbField: 'phoneNumber' },
            { label: 'Download Id', dbField: 'downloadId' }
          ]
        },
        {
          title: 'Vehicle Wanted',
          fields: [
            { label: 'Vehicle Type', dbField: 'vehicleType' },
            { label: 'Unwanted Colors', dbField: 'unwantedColors' },
            { label: 'Required Features', dbField: 'requiredFeatures' },
            { label: 'Preferred Make/Model', dbField: 'preferredMakeModel' }
          ]
        },
        {
          title: 'Existing Loan',
          fields: [
            { label: 'Has Existing Loan', dbField: 'hasExistingLoan' },
            { label: 'Current Vehicle', dbField: 'currentVehicle' },
            { label: 'Current Payment', dbField: 'currentPayment' },
            { label: 'Amount Owed', dbField: 'amountOwed' },
            { label: 'Mileage', dbField: 'mileage' }
          ]
        },
        {
          title: 'Employment Details',
          fields: [
            { label: 'Employment Status', dbField: 'employmentStatus' },
            { label: 'Monthly Income', dbField: 'monthlyIncome' },
            { label: 'Employer Name', dbField: 'employerName' },
            { label: 'Job Title', dbField: 'jobTitle' },
            { label: 'Employment Duration', dbField: 'employmentDuration' },
            { label: 'Additional Notes', dbField: 'additionalNotes' }
          ]
        },
        {
          title: 'Other Details',
          fields: [
            { label: 'Download Date', dbField: 'downloadDate' },
            { label: 'Application Id', dbField: 'applicationId' },
            { label: 'Submission Date', dbField: 'created_at' }
          ]
        }
      ];
      
      // Starting Y position for first category
      let startY = 25;
      const margin = 14;
      
      // Process each category
      for (const category of categories) {
        // Add category header with blue background
        pdf.setFontSize(10);
        pdf.setTextColor(255, 255, 255);
        pdf.setFillColor(0, 0, 255); // Blue background for category header
        pdf.rect(margin, startY, pdf.internal.pageSize.width - 2 * margin, 6, 'F');
        pdf.text(category.title, margin + 2, startY + 4);
        
        // Create rows for this category
        const rows = category.fields.map(field => {
          // Get the field value, handling both camelCase and snake_case names
          let value = getFieldValue(application, field.dbField);
          
          // Format boolean values
          if (typeof value === 'boolean') {
            value = value ? 'Yes' : 'No';
          }
          // Format date values
          else if (field.dbField === 'created_at' || field.dbField === 'downloadDate') {
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                value = date.toLocaleDateString('en-CA', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                });
              }
            } catch (e) {
              console.error(`Error formatting date for ${field.dbField}:`, e);
            }
          }
          
          // Log the field mapping for debugging
          console.log(`Field mapping: "${field.label}" (${field.dbField}) = "${value || 'N/A'}"`);
          
          return [field.label, value || 'N/A'];
        });
        
        // Add table with more compact settings for this category
        autoTable(pdf, {
          startY: startY + 6,
          head: [], // No header row
          body: rows,
          theme: 'striped',
          alternateRowStyles: {
            fillColor: [240, 240, 240]
          },
          styles: { 
            overflow: 'linebreak',
            cellPadding: 1, // Reduced padding
            fontSize: 8.5, // Slightly smaller font
            minCellHeight: 0.8 // Changed from cellHeight to minCellHeight to fix the error
          },
          columnStyles: {
            0: { 
              cellWidth: 50,
              fontStyle: 'bold'
            },
            1: { cellWidth: 'auto' }
          },
          margin: { left: margin, right: margin },
          tableWidth: 'auto',
        });
        
        // Update startY for the next category with less spacing
        startY = (pdf as any).lastAutoTable.finalY + 3; // Reduced spacing between categories
        
        // If close to page bottom, add a new page
        if (startY > pdf.internal.pageSize.height - 40 && 
            categories.indexOf(category) < categories.length - 1) {
          pdf.addPage();
          startY = 15;
        }
      }
      
      // Add footer with page number
      const pageCount = pdf.getNumberOfPages();
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Page ${pageCount}`, 105, 290, { align: 'center' });
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
    toast.error(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Helper function to get field value from application with different casing patterns
const getFieldValue = (application: ApplicationData, fieldName: string): any => {
  console.log(`Looking for field "${fieldName}" in application object`);
  
  // Direct field match (exact match)
  if (fieldName in application) {
    return application[fieldName];
  }
  
  // Handle camelCase and snake_case variations
  const camelCaseName = toCamelCase(fieldName);
  if (camelCaseName in application) {
    return application[camelCaseName];
  }
  
  const snakeCaseName = toSnakeCase(fieldName);
  if (snakeCaseName in application) {
    return application[snakeCaseName];
  }
  
  // Special cases for common field name variations
  if (fieldName === 'fullName' && 'fullname' in application) {
    return application.fullname;
  }
  if (fieldName === 'address' && 'streetaddress' in application) {
    return application.streetaddress;
  }
  if (fieldName === 'addressStreet' && 'streetaddress' in application) {
    return application.streetaddress;
  }
  if (fieldName === 'phoneNumber' && 'phonenumber' in application) {
    return application.phonenumber;
  }
  if (fieldName === 'postalCode' && 'postalcode' in application) {
    return application.postalcode;
  }
  
  // Case-insensitive search as a last resort
  const lowerFieldName = fieldName.toLowerCase();
  for (const key in application) {
    if (key.toLowerCase() === lowerFieldName) {
      return application[key];
    }
  }
  
  console.warn(`Could not find value for field "${fieldName}" in application`);
  return null;
};

// Helper: Convert snake_case to camelCase
const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
};

// Helper: Convert camelCase to snake_case
const toSnakeCase = (str: string): string => {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
};
