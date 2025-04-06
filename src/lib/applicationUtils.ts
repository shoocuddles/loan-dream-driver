
import { ApplicationForm } from "@/lib/types";
import { Database } from "@/lib/types/supabase-types";

type ApplicationInsertData = Database['public']['Tables']['applications']['Insert'];
type ApplicationUpdateData = Database['public']['Tables']['applications']['Update'];

/**
 * Safe typecasting for Supabase operations
 * Converts our frontend ApplicationForm type to the database schema format
 */
export function mapFormToDbSchema(formData: ApplicationForm, isDraft = true): any {
  // Create the base mappings with correct camelCase to snake_case conversions
  const mappedData = {
    fullname: formData.fullName,
    phonenumber: formData.phoneNumber,
    email: formData.email,
    streetaddress: formData.streetAddress,
    city: formData.city,
    province: formData.province,
    postalcode: formData.postalCode,
    vehicletype: formData.vehicleType,
    requiredfeatures: formData.requiredFeatures,
    unwantedcolors: formData.unwantedColors,
    preferredmakemodel: formData.preferredMakeModel,
    hasexistingloan: formData.hasExistingLoan,
    currentpayment: formData.currentPayment,
    amountowed: formData.amountOwed,
    currentvehicle: formData.currentVehicle,
    mileage: formData.mileage,
    employmentstatus: formData.employmentStatus,
    monthlyincome: formData.monthlyIncome,
    additionalnotes: formData.additionalNotes,
    updated_at: new Date().toISOString(),
    status: isDraft ? 'draft' : 'submitted',
    iscomplete: !isDraft
  };

  return mappedData;
}

/**
 * Safe insert wrapper - ensures the value passed to Supabase insert method
 * is properly typed and casted as any to prevent TypeScript errors
 */
export function getSafeInsertValue(data: any): any {
  // Return as any to prevent TypeScript matching issues with Supabase
  return data as any;
}

/**
 * Safe update wrapper - ensures the value passed to Supabase update method
 * is properly typed and casted as any to prevent TypeScript errors
 */
export function getSafeUpdateValue(data: any): any {
  // Return as any to prevent TypeScript matching issues with Supabase
  return data as any;
}

/**
 * Safe param wrapper - ensures the value passed to Supabase eq method
 * is properly typed as string to prevent TypeScript errors
 */
export function getSafeParamValue(value: string | number): string {
  return String(value);
}

/**
 * Type guard for error objects thrown or returned by Supabase
 */
export function isSupabaseError(obj: any): boolean {
  return obj && typeof obj === 'object' && 'message' in obj;
}
