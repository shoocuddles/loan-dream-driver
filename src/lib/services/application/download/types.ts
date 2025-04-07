
import { Application } from '@/lib/types/supabase';
import { DownloadedApplication } from '@/lib/types/dealer-dashboard';

// Common type for application data from either source
export type ApplicationData = Application | DownloadedApplication;

// Format options for downloads
export type DownloadFormat = 'PDF' | 'CSV' | 'Excel';

// Type for dynamic column data
export interface ColumnMetadata {
  name: string;
  displayName: string;
}
