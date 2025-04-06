
export interface CompanyPricing {
  id?: string;
  companyId: string;
  name: string;
  standardPrice: number;
  discountedPrice: number;
  isCustomPricing: boolean;
  created_at?: string;
}

export interface CompanyPricingUpdateRequest {
  companyId: string;
  standardPrice: number;
  discountedPrice: number;
}

export interface CompanyPricingResponse {
  success: boolean;
  message?: string;
  pricing?: CompanyPricing;
}
