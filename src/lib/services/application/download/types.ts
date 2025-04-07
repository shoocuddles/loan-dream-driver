
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
