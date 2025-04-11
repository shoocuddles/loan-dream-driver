
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  createStripeCoupon, 
  listStripeCoupons,
  getStripePrices,
  getStripeAccountInfo
} from '@/lib/services/stripe/stripeService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, ExternalLink, InfoIcon, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { StripeCoupon } from '@/lib/types/stripe';

const StripeSettings = () => {
  const [couponName, setCouponName] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [duration, setDuration] = useState<'once' | 'forever' | 'repeating'>('once');
  const [durationMonths, setDurationMonths] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [coupons, setCoupons] = useState<StripeCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<'connected' | 'error' | 'checking'>('checking');
  const [activeTab, setActiveTab] = useState('coupons');
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkStripeConnection();
    loadCoupons();
  }, []);

  const checkStripeConnection = async () => {
    try {
      setStripeStatus('checking');
      setErrorDetails(null);
      
      // First try to get account info for more detailed connection status
      const accountResponse = await getStripeAccountInfo();
      
      if (accountResponse.error) {
        console.error("Error checking Stripe account:", accountResponse.error);
        setStripeStatus('error');
        setErrorDetails(accountResponse.error.message);
        return;
      }
      
      setAccountInfo(accountResponse.data);
      setStripeStatus('connected');
      
      // Also check if prices are available
      const pricesResponse = await getStripePrices();
      if (pricesResponse.error) {
        console.warn("Connected to Stripe, but error fetching prices:", pricesResponse.error);
      }
    } catch (error: any) {
      setStripeStatus('error');
      setErrorDetails(error.message);
      console.error("Error checking Stripe connection:", error);
    }
  };

  const loadCoupons = async () => {
    try {
      setIsLoading(true);
      const response = await listStripeCoupons();
      
      if (response.error) {
        toast({
          title: "Error",
          description: `Failed to load coupons: ${response.error.message}`,
          variant: "destructive",
        });
        return;
      }
      
      setCoupons(response.data || []);
    } catch (error: any) {
      console.error("Error loading coupons:", error);
      toast({
        title: "Error",
        description: `Failed to load coupon data: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCoupon = async () => {
    try {
      // Validate inputs
      if (!couponName.trim()) {
        toast({
          title: "Missing Information",
          description: "Please provide a coupon name.",
          variant: "destructive",
        });
        return;
      }

      const discountValueNum = parseFloat(discountValue);
      if (isNaN(discountValueNum) || discountValueNum <= 0) {
        toast({
          title: "Invalid Discount",
          description: `Please enter a valid ${discountType === 'percent' ? 'percentage' : 'amount'}.`,
          variant: "destructive",
        });
        return;
      }

      if (discountType === 'percent' && (discountValueNum < 1 || discountValueNum > 100)) {
        toast({
          title: "Invalid Percentage",
          description: "Percentage discount must be between 1 and 100.",
          variant: "destructive",
        });
        return;
      }

      // Build coupon params
      const params: any = {
        name: couponName,
        duration,
      };

      // Add discount type (either percent_off or amount_off)
      if (discountType === 'percent') {
        params.percentOff = discountValueNum;
      } else {
        params.amountOff = discountValueNum * 100; // Convert to cents
      }

      // Add optional parameters if provided
      if (duration === 'repeating' && durationMonths) {
        const months = parseInt(durationMonths);
        if (isNaN(months) || months <= 0) {
          toast({
            title: "Invalid Duration",
            description: "Please enter a valid number of months.",
            variant: "destructive",
          });
          return;
        }
        params.durationInMonths = months;
      }

      if (maxRedemptions) {
        const max = parseInt(maxRedemptions);
        if (!isNaN(max) && max > 0) {
          params.maxRedemptions = max;
        }
      }

      if (expiryDate) {
        const expiryTimestamp = new Date(expiryDate).getTime();
        if (!isNaN(expiryTimestamp)) {
          params.expiresAt = Math.floor(expiryTimestamp / 1000).toString();
        }
      }

      setIsCreating(true);
      const response = await createStripeCoupon(params);

      if (response.error) {
        toast({
          title: "Coupon Creation Failed",
          description: response.error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Coupon "${couponName}" has been created successfully!`,
        });
        
        // Clear form and reload coupons
        setCouponName('');
        setDiscountValue('');
        setDurationMonths('');
        setMaxRedemptions('');
        setExpiryDate('');
        loadCoupons();
      }
    } catch (error: any) {
      console.error("Error creating coupon:", error);
      toast({
        title: "Error",
        description: `An unexpected error occurred: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const renderAccountSection = () => {
    if (!accountInfo) return null;
    
    return (
      <div className="mt-4 p-4 border rounded-md bg-gray-50">
        <h3 className="font-medium mb-3">Account Information</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-gray-600">Account ID</dt>
            <dd>{accountInfo.id}</dd>
          </div>
          {accountInfo.display_name && (
            <div>
              <dt className="text-gray-600">Display Name</dt>
              <dd>{accountInfo.display_name}</dd>
            </div>
          )}
          {accountInfo.email && (
            <div>
              <dt className="text-gray-600">Email</dt>
              <dd>{accountInfo.email}</dd>
            </div>
          )}
          {accountInfo.country && (
            <div>
              <dt className="text-gray-600">Country</dt>
              <dd>{accountInfo.country}</dd>
            </div>
          )}
          {accountInfo.default_currency && (
            <div>
              <dt className="text-gray-600">Currency</dt>
              <dd>{accountInfo.default_currency.toUpperCase()}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-600">Account Status</dt>
            <dd className="flex items-center gap-1.5">
              {accountInfo.details_submitted ? (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Complete
                </span>
              ) : (
                <span className="text-yellow-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Incomplete
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-gray-600">Payments</dt>
            <dd>
              {accountInfo.charges_enabled ? (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Enabled
                </span>
              ) : (
                <span className="text-yellow-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Disabled
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-gray-600">Payouts</dt>
            <dd>
              {accountInfo.payouts_enabled ? (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Enabled
                </span>
              ) : (
                <span className="text-yellow-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Disabled
                </span>
              )}
            </dd>
          </div>
        </dl>
        <div className="mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs"
            onClick={() => window.open("https://dashboard.stripe.com/account", "_blank")}
          >
            View in Stripe Dashboard <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Stripe Integration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stripe Connection Status */}
        <div className="mb-6">
          {stripeStatus === 'checking' && (
            <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Checking Stripe Connection...</AlertTitle>
            </Alert>
          )}
          
          {stripeStatus === 'connected' && (
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Stripe Connected</AlertTitle>
              <AlertDescription className="flex flex-col gap-1">
                <p>Your Stripe account is successfully connected and ready for use.</p>
                {!accountInfo?.charges_enabled && (
                  <p className="text-yellow-700 mt-1 flex items-center gap-1">
                    <InfoIcon className="h-4 w-4" />
                    Your account is not fully set up to accept payments. Please complete your Stripe account setup.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          {stripeStatus === 'error' && (
            <Alert className="bg-red-50 text-red-800 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription className="flex flex-col gap-1">
                <p>There was an error connecting to your Stripe account.</p>
                {errorDetails && (
                  <div className="mt-2 p-2 bg-red-100 rounded text-sm font-mono overflow-x-auto">
                    {errorDetails}
                  </div>
                )}
                <p className="mt-2">
                  Please check that your Stripe API keys are properly configured in the Supabase edge function secrets.
                </p>
              </AlertDescription>
            </Alert>
          )}
          
          {renderAccountSection()}
          
          <div className="flex justify-end mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkStripeConnection} 
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${stripeStatus === 'checking' ? 'animate-spin' : ''}`} />
              Refresh Connection
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="coupons">Discount Coupons</TabsTrigger>
            <TabsTrigger value="products">Products & Prices</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="coupons">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Active Coupons</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadCoupons} 
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              
              <div className="border rounded-md overflow-hidden">
                {isLoading ? (
                  <div className="p-6 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-ontario-blue" />
                    <p className="mt-2 text-gray-500">Loading coupon data...</p>
                  </div>
                ) : coupons.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No coupons found. Create your first coupon below.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Discount</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Duration</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Usage</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Expires</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {coupons.map((coupon) => (
                          <tr key={coupon.id}>
                            <td className="px-4 py-3 text-sm">{coupon.name}</td>
                            <td className="px-4 py-3 text-sm">
                              {coupon.percent_off ? `${coupon.percent_off}%` : ''}
                              {coupon.amount_off ? `$${(coupon.amount_off / 100).toFixed(2)}` : ''}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {coupon.duration === 'repeating' 
                                ? `${coupon.duration_in_months} months` 
                                : coupon.duration}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {coupon.times_redeemed}
                              {coupon.max_redemptions ? ` / ${coupon.max_redemptions}` : ''}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {coupon.expires_at 
                                ? new Date(coupon.expires_at * 1000).toLocaleDateString() 
                                : 'Never'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              <div className="border p-4 rounded-md mt-6">
                <h3 className="font-medium mb-4">Create New Coupon</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="couponName">Coupon Name</Label>
                    <Input
                      id="couponName"
                      value={couponName}
                      onChange={(e) => setCouponName(e.target.value)}
                      placeholder="Summer Sale"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="discountType">Discount Type</Label>
                      <Select
                        value={discountType}
                        onValueChange={(value) => setDiscountType(value as 'percent' | 'amount')}
                      >
                        <SelectTrigger id="discountType">
                          <SelectValue placeholder="Select discount type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Percentage</SelectItem>
                          <SelectItem value="amount">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="discountValue">
                        {discountType === 'percent' ? 'Percentage (%)' : 'Amount ($)'}
                      </Label>
                      <div className="relative">
                        {discountType === 'amount' && (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                        )}
                        <Input
                          id="discountValue"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          placeholder={discountType === 'percent' ? '10' : '5.00'}
                          className={discountType === 'amount' ? 'pl-7' : ''}
                          type="number"
                          min="0"
                          step={discountType === 'percent' ? '1' : '0.01'}
                        />
                        {discountType === 'percent' && (
                          <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">%</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration</Label>
                      <Select
                        value={duration}
                        onValueChange={(value) => setDuration(value as 'once' | 'forever' | 'repeating')}
                      >
                        <SelectTrigger id="duration">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="once">Once</SelectItem>
                          <SelectItem value="forever">Forever</SelectItem>
                          <SelectItem value="repeating">Multiple Months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {duration === 'repeating' && (
                      <div className="space-y-2">
                        <Label htmlFor="durationMonths">Number of Months</Label>
                        <Input
                          id="durationMonths"
                          value={durationMonths}
                          onChange={(e) => setDurationMonths(e.target.value)}
                          placeholder="3"
                          type="number"
                          min="1"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxRedemptions">Max Redemptions (Optional)</Label>
                      <Input
                        id="maxRedemptions"
                        value={maxRedemptions}
                        onChange={(e) => setMaxRedemptions(e.target.value)}
                        placeholder="100"
                        type="number"
                        min="1"
                      />
                      <p className="text-xs text-gray-500">Leave empty for unlimited</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                      <Input
                        id="expiryDate"
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                      />
                      <p className="text-xs text-gray-500">Leave empty for no expiration</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleCreateCoupon}
                    disabled={isCreating}
                    className="w-full bg-ontario-blue hover:bg-ontario-blue/90"
                  >
                    {isCreating ? "Creating..." : "Create Coupon"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="products">
            <div className="space-y-6">
              <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md">
                <p className="font-medium">Stripe Pricing Synchronization</p>
                <p className="mt-1 text-sm">
                  When you update the standard or discounted price in System Settings, 
                  the changes will automatically sync with Stripe.
                </p>
              </div>
              
              <div className="border p-4 rounded-md bg-gray-50">
                <h3 className="font-medium mb-2">Payment Products</h3>
                <p className="text-sm text-gray-500 mb-4">
                  These products are automatically created in Stripe when you update your pricing settings.
                </p>
                
                <ul className="space-y-2">
                  <li className="p-3 bg-white rounded border">
                    <p className="font-medium">Standard Application Download</p>
                    <p className="text-sm text-gray-500">Initial application download at standard price</p>
                  </li>
                  <li className="p-3 bg-white rounded border">
                    <p className="font-medium">Discounted Application Download</p>
                    <p className="text-sm text-gray-500">Discounted price after lock period expires</p>
                  </li>
                </ul>
                
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs"
                    onClick={() => window.open("https://dashboard.stripe.com/products", "_blank")}
                  >
                    View Products in Stripe Dashboard <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="transactions">
            <div className="space-y-6">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-md">
                <p className="font-medium">Payment Transactions</p>
                <p className="mt-1 text-sm">
                  All payment transactions are processed and recorded in your Stripe account.
                  You can view detailed transaction information in your Stripe Dashboard.
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <Button 
                  variant="outline"
                  className="text-sm flex items-center justify-between"
                  onClick={() => window.open("https://dashboard.stripe.com/payments", "_blank")}
                >
                  <span>View Payments</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
                
                <Button 
                  variant="outline"
                  className="text-sm flex items-center justify-between"
                  onClick={() => window.open("https://dashboard.stripe.com/balance", "_blank")}
                >
                  <span>View Balance & Payouts</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
                
                <Button 
                  variant="outline"
                  className="text-sm flex items-center justify-between"
                  onClick={() => window.open("https://dashboard.stripe.com/customers", "_blank")}
                >
                  <span>View Customers</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default StripeSettings;
