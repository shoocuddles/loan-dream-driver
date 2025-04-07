
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { formatApplicationData, getDateFromApplication, generateFilename } from './formatUtils';
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
