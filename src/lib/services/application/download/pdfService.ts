
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
      
      // Format data for PDF
      const formattedData = await formatApplicationData(application);
      console.log('Formatted application data for PDF:', formattedData);
      
      // Add header
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Ontario Loans - Lead Details', 105, 15, { align: 'center' });
      
      // Define PDF categories with field mappings - Updated to match the specific database fields
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
          // Look for the field in formattedData (case insensitive)
          const key = Object.keys(formattedData).find(k => 
            k.toLowerCase() === field.toLowerCase() || 
            k.replace(/\s+/g, '').toLowerCase() === field.replace(/\s+/g, '').toLowerCase()
          );
          
          // Log the field mapping for debugging
          console.log(`Looking for field "${field}" in formattedData, found key: "${key || 'not found'}"`);
          
          // Log value for debugging
          if (key) {
            console.log(`Value for ${field}: "${formattedData[key]}"`);
          }
          
          return [field, key ? formattedData[key] : 'N/A'];
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
