
// Common type for application data regardless of source
export type ApplicationData = Record<string, any>;

// Database column metadata
export interface ColumnMetadata {
  name: string;
  displayName: string;
}
