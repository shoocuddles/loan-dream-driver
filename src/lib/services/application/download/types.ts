
export interface ApplicationData {
  id?: string;
  applicationId?: string;
  downloadId?: string;
  [key: string]: any; // Allow any other fields dynamically
}

export interface ColumnMetadata {
  name: string;
  displayName: string;
}

// Add missing type for PDFCategory that's used in pdfService.ts
export interface PDFCategory {
  title: string;
  fields: string[];
}

// Add missing type for SupabaseCSVResponse that's used in directCsvService.ts
export interface SupabaseCSVResponse {
  data: any[];
  error: any;
}
