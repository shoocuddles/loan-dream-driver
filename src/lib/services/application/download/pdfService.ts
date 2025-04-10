
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { formatApplicationData, getDateFromApplication, generateFilename } from './formatUtils';
import { fetchFullApplicationDetails } from './fetchService';
import { ApplicationData, PDFCategory } from './types';

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
    console.log('Raw application data received:', JSON.stringify(applications[0]).substring(0, 300) + '...');
    
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
      
      // Format data for PDF with improved logging
      const formattedData = await formatApplicationData(application);
      console.log('Formatted application data keys for PDF:', Object.keys(formattedData));
      
      // Add header
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Ontario Loans - Lead Details', 105, 15, { align: 'center' });
      
      // Define PDF categories with field mappings - Updated to be more lenient with case and spaces
      const categories: Record<string, PDFCategory> = {
        'Contact Details': {
          title: 'Contact Details',
          fields: [
            'Full Name', 
            'City', 
            'Address', 
            'Province', 
            'Postal Code', 
            'Email', 
            'Phone Number'
          ]
        },
        'Vehicle Wanted': {
          title: 'Vehicle Wanted',
          fields: [
            'Vehicle Type', 
            'Unwanted Colors', 
            'Required Features', 
            'Preferred Make/Model'
          ]
        },
        'Existing Loan': {
          title: 'Existing Loan',
          fields: [
            'Has Existing Loan',
            'Current Vehicle',
            'Current Payment',
            'Amount Owed',
            'Mileage'
          ]
        },
        'Income Details': {
          title: 'Income Details',
          fields: [
            'Employment Status',
            'Monthly Income',
            'Employer Name',
            'Job Title',
            'Employment Duration'
          ]
        },
        'Additional Information': {
          title: 'Additional Information',
          fields: [
            'Additional Notes',
            'Application ID',
            'Submission Date'
          ]
        }
      };
      
      // Starting Y position for first category
      let startY = 25;
      const margin = 14;
      
      // Process each category
      for (const category of Object.values(categories)) {
        // Create rows for the current category
        const rows = category.fields.map(field => {
          // Create a more flexible field mapping with case insensitivity and normalization
          const normalizedField = field.toLowerCase().replace(/\s+/g, '');
          
          // Try to find the field in formattedData using multiple approaches
          let value = null;
          let matchedKey = null;
          
          // First try exact key match
          if (formattedData[field] !== undefined) {
            value = formattedData[field];
            matchedKey = field;
          } 
          // Then try case-insensitive match
          else {
            // Look for matching keys with normalized casing and spacing
            matchedKey = Object.keys(formattedData).find(k => {
              const normalizedKey = k.toLowerCase().replace(/\s+/g, '');
              return normalizedKey === normalizedField || 
                     normalizedKey.includes(normalizedField) ||
                     normalizedField.includes(normalizedKey);
            });
            
            if (matchedKey) {
              value = formattedData[matchedKey];
            }
            // Special case handling for fields that might be in different formats
            else if (normalizedField === 'phoneNumber' || normalizedField === 'phonenumber') {
              matchedKey = Object.keys(formattedData).find(k => 
                k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile'));
              if (matchedKey) value = formattedData[matchedKey];
            }
            else if (normalizedField === 'address') {
              matchedKey = Object.keys(formattedData).find(k => 
                k.toLowerCase().includes('street') || 
                k.toLowerCase().includes('address') || 
                k.toLowerCase().includes('addr'));
              if (matchedKey) value = formattedData[matchedKey];
            }
          }
          
          // Special case for fields with database field naming
          if (value === null) {
            // Try common database field names
            const possibleDbFields = {
              'Full Name': ['fullname', 'fullName', 'full_name', 'name'],
              'City': ['city'],
              'Address': ['streetaddress', 'streetAddress', 'street_address', 'address'],
              'Province': ['province', 'state', 'region'],
              'Postal Code': ['postalcode', 'postalCode', 'postal_code', 'zip', 'zipcode'],
              'Email': ['email', 'emailaddress', 'email_address'],
              'Phone Number': ['phonenumber', 'phoneNumber', 'phone_number', 'phone'],
              'Vehicle Type': ['vehicletype', 'vehicleType', 'vehicle_type'],
              'Unwanted Colors': ['unwantedcolors', 'unwantedColors', 'unwanted_colors'],
              'Required Features': ['requiredfeatures', 'requiredFeatures', 'required_features'],
              'Preferred Make/Model': ['preferredmakemodel', 'preferredMakeModel', 'preferred_make_model'],
              'Has Existing Loan': ['hasexistingloan', 'hasExistingLoan', 'has_existing_loan'],
              'Current Vehicle': ['currentvehicle', 'currentVehicle', 'current_vehicle'],
              'Current Payment': ['currentpayment', 'currentPayment', 'current_payment'],
              'Amount Owed': ['amountowed', 'amountOwed', 'amount_owed'],
              'Mileage': ['mileage'],
              'Employment Status': ['employmentstatus', 'employmentStatus', 'employment_status'],
              'Monthly Income': ['monthlyincome', 'monthlyIncome', 'monthly_income', 'income'],
              'Employer Name': ['employerName', 'employername', 'employer_name'],
              'Job Title': ['jobtitle', 'jobTitle', 'job_title'],
              'Employment Duration': ['employmentduration', 'employmentDuration', 'employment_duration'],
              'Additional Notes': ['additionalnotes', 'additionalNotes', 'additional_notes', 'notes']
            };
            
            // Look for these fields directly in the application object
            if (field in possibleDbFields) {
              for (const dbField of possibleDbFields[field]) {
                if (dbField in application) {
                  value = application[dbField];
                  matchedKey = dbField;
                  break;
                }
              }
            }
          }
          
          // Log the field mapping for debugging
          console.log(`Field mapping: "${field}" -> "${matchedKey || 'not found'}" = "${value || 'N/A'}"`);
          
          return [field, value !== null && value !== undefined ? value : 'N/A'];
        });
        
        // Add category header
        pdf.setFontSize(10);
        pdf.setTextColor(255, 255, 255);
        pdf.setFillColor(0, 0, 255); // Blue background for category header
        pdf.rect(margin, startY, pdf.internal.pageSize.width - 2 * margin, 6, 'F');
        pdf.text(category.title, margin + 2, startY + 4);
        
        // Add table with the data for this category
        autoTable(pdf, {
          startY: startY + 6,
          head: [], // No header row
          body: rows,
          theme: 'striped',
          headStyles: {
            fillColor: [0, 51, 102],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [240, 240, 240]
          },
          styles: { 
            overflow: 'linebreak',
            cellPadding: 2,
            fontSize: 9
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
        
        // Update startY for the next category (get the final Y position from autoTable)
        startY = (pdf as any).lastAutoTable.finalY + 10;
        
        // If we're close to the page bottom, start a new page
        if (startY > pdf.internal.pageSize.height - 40 && Object.values(categories).indexOf(category) < Object.values(categories).length - 1) {
          pdf.addPage();
          startY = 15;
        }
      }
      
      // Create "Other Details" category with remaining fields
      // Excluding specific fields that should not appear in the PDF
      const excludedFields = [
        'payment amount',
        'status',
        'application id',
        'id',
        'user id',
        'street address',
        'is complete',
        'last updated',
        'download id',
        'Full Name', 
        'City', 
        'Address', 
        'Province', 
        'Postal Code', 
        'Email', 
        'Phone Number',
        'Vehicle Type', 
        'Unwanted Colors', 
        'Required Features', 
        'Preferred Make/Model',
        'Has Existing Loan',
        'Current Vehicle',
        'Current Payment',
        'Amount Owed',
        'Mileage',
        'Employment Status',
        'Monthly Income',
        'Employer Name',
        'Job Title',
        'Employment Duration',
        'Additional Notes',
        'Application ID',
        'Submission Date'
      ];
      
      const usedFields = Object.values(categories)
        .flatMap(cat => cat.fields)
        .map(f => f.toLowerCase().replace(/\s+/g, ''));
      
      const otherFields = Object.keys(formattedData).filter(key => {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, '');
        // Check if this field is already included in a category or should be excluded
        const isUsed = usedFields.some(f => 
          f === normalizedKey || 
          f.includes(normalizedKey) || 
          normalizedKey.includes(f)
        );
        
        const isExcluded = excludedFields.some(f => 
          normalizedKey === f.toLowerCase().replace(/\s+/g, '') ||
          normalizedKey.includes(f.toLowerCase().replace(/\s+/g, ''))
        );
        
        return !isUsed && !isExcluded;
      });
      
      if (otherFields.length > 0) {
        // Check if we need a new page for other details
        if (startY > pdf.internal.pageSize.height - 60) {
          pdf.addPage();
          startY = 15;
        }
        
        // Add "Other Details" header
        pdf.setFontSize(10);
        pdf.setTextColor(255, 255, 255);
        pdf.setFillColor(0, 0, 255);
        pdf.rect(margin, startY, pdf.internal.pageSize.width - 2 * margin, 6, 'F');
        pdf.text('Other Details', margin + 2, startY + 4);
        
        // Create rows for other fields
        const otherRows = otherFields.map(key => [key, formattedData[key]]);
        
        // Add table for other fields
        autoTable(pdf, {
          startY: startY + 6,
          head: [], // No header row
          body: otherRows,
          theme: 'striped',
          alternateRowStyles: {
            fillColor: [240, 240, 240]
          },
          styles: { 
            overflow: 'linebreak',
            cellPadding: 2,
            fontSize: 9
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
    toast.error('Error generating PDF');
  }
};
