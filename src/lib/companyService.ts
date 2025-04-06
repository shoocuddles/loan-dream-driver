
import { supabase, rpcCall } from '@/integrations/supabase/client';
import { CompanyPricing, CompanyPricingUpdateRequest, CompanyPricingResponse } from '@/lib/types/company';

/**
 * Get all companies with their pricing information
 */
export const getAllCompaniesWithPricing = async (): Promise<CompanyPricing[]> => {
  try {
    console.log("🔍 Fetching all companies with pricing");
    const { data, error } = await rpcCall<CompanyPricing[]>('list_companies_with_pricing');
    
    if (error) {
      console.error("Error fetching companies with pricing:", error);
      throw error;
    }
    
    return data || [];
  } catch (error: any) {
    console.error("Error in getAllCompaniesWithPricing:", error.message);
    return [];
  }
};

/**
 * Get pricing for a specific company
 */
export const getCompanyPricing = async (companyId: string): Promise<CompanyPricing | null> => {
  try {
    console.log(`🔍 Fetching pricing for company ${companyId}`);
    const { data, error } = await rpcCall<CompanyPricing>('get_company_pricing', { p_company_id: companyId });
    
    if (error) {
      console.error("Error fetching company pricing:", error);
      throw error;
    }
    
    return data;
  } catch (error: any) {
    console.error("Error in getCompanyPricing:", error.message);
    return null;
  }
};

/**
 * Update pricing for a specific company
 */
export const updateCompanyPricing = async (request: CompanyPricingUpdateRequest): Promise<CompanyPricingResponse> => {
  try {
    console.log(`⚙️ Updating pricing for company ${request.companyId}`);
    const { data, error } = await rpcCall<CompanyPricingResponse>('update_company_pricing', {
      p_company_id: request.companyId,
      p_standard_price: request.standardPrice,
      p_discounted_price: request.discountedPrice
    });
    
    if (error) {
      console.error("Error updating company pricing:", error);
      return {
        success: false,
        message: error.message || "Failed to update company pricing"
      };
    }
    
    return data || { success: true };
  } catch (error: any) {
    console.error("Error in updateCompanyPricing:", error.message);
    return {
      success: false,
      message: error.message || "An unexpected error occurred"
    };
  }
};
