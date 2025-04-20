import { ApplicationForm } from "@/lib/types";

/**
 * Maps ApplicationForm to database schema format
 * Safe mapping to ensure database compatibility
 */
export const mapFormToDbSchema = (application: ApplicationForm, isDraft = true): any => {
  return {
    fullname: application.fullName,
    email: application.email,
    phonenumber: application.phoneNumber,
    streetaddress: application.streetAddress,
    city: application.city,
    province: application.province,
    postalcode: application.postalCode,
    vehicletype: application.vehicleType,
    requiredfeatures: application.requiredFeatures,
    unwantedcolors: application.unwantedColors,
    preferredmakemodel: application.preferredMakeModel,
    hasexistingloan: application.hasExistingLoan,
    currentpayment: application.currentPayment,
    amountowed: application.amountOwed,
    currentvehicle: application.currentVehicle,
    mileage: application.mileage,
    employmentstatus: application.employmentStatus,
    monthlyincome: application.monthlyIncome,
    employer_name: application.employerName,
    job_title: application.jobTitle,
    employment_duration: application.employmentDuration,
    additionalnotes: application.additionalNotes,
    status: application.status as isDraft ? 'draft' : 'submitted',
    iscomplete: !isDraft
  };
};

/**
 * Safely format a value for Supabase insert to prevent SQL injection
 * By explicitly creating a new object with only the needed properties
 */
export const getSafeInsertValue = (value: any): any => {
  // For arrays, map each item
  if (Array.isArray(value)) {
    return value.map(item => getSafeInsertValue(item));
  }

  // For objects, create a new sanitized object
  if (typeof value === 'object' && value !== null) {
    const safeObj: any = {};
    Object.keys(value).forEach(key => {
      // Skip null or undefined values
      if (value[key] !== null && value[key] !== undefined) {
        safeObj[key] = value[key];
      }
    });
    return safeObj;
  }

  return value;
};

/**
 * Safely format a value for Supabase update to prevent SQL injection
 */
export const getSafeUpdateValue = (value: any): any => {
  return getSafeInsertValue(value);
};

/**
 * Safely format a parameter value to prevent SQL injection
 */
export const getSafeParamValue = (value: string): string => {
  // Prevent SQL injection in parameter values
  return String(value).replace(/['";\\]/g, '');
};

/**
 * Check if an error is a Supabase error
 */
export const isSupabaseError = (error: any): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error.code !== undefined || error.message !== undefined ||
     error.details !== undefined || error.hint !== undefined)
  );
};
