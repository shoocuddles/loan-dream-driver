
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ApplicationItem } from '@/lib/types/dealer-dashboard';
import { Lock, Unlock, Save } from 'lucide-react';
import { updateApplication, lockApplicationAsAdmin, unlockApplication } from '@/lib/supabase';
import { fetchLockoutPeriods } from '@/lib/services/lock/lockService';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminApplicationDetailsProps {
  application: ApplicationItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApplicationUpdated?: () => void;
}

const AdminApplicationDetails = ({
  application,
  isOpen,
  onClose,
  onApplicationUpdated
}: AdminApplicationDetailsProps) => {
  const [formData, setFormData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [selectedLockType, setSelectedLockType] = useState<string>('24hours');
  const [activeTab, setActiveTab] = useState<string>('details');

  const { data: lockoutPeriods = [] } = useQuery({
    queryKey: ['lockout-periods'],
    queryFn: fetchLockoutPeriods
  });

  useEffect(() => {
    if (application) {
      // Convert application object to form data
      setFormData({
        fullname: application.fullName,
        email: application.email || '',
        phonenumber: application.phoneNumber || '',
        city: application.city || '',
        vehicletype: application.vehicleType || '',
        streetaddress: application.address || '',
        province: application.province || '',
        postalcode: application.postalCode || '',
        employmentstatus: application.employmentStatus || '',
        monthlyincome: application.monthlyIncome || '',
        employer_name: application.employerName || '',
        job_title: application.jobTitle || '',
        employment_duration: application.employmentDuration || '',
        hasexistingloan: application.hasExistingLoan || false,
        currentpayment: application.currentPayment || '',
        amountowed: application.amountOwed || '',
        currentvehicle: application.currentVehicle || '',
        mileage: application.mileage || '',
        requiredfeatures: application.requiredFeatures || '',
        unwantedcolors: application.unwantedColors || '',
        preferredmakemodel: application.preferredMakeModel || '',
        additionalnotes: application.additionalNotes || '',
        status: application.status || 'submitted'
      });
    }
  }, [application]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!application) return;
    
    setIsSaving(true);
    try {
      await updateApplication(application.applicationId, formData);
      toast.success("Application updated successfully");
      if (onApplicationUpdated) onApplicationUpdated();
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating application:", error);
      toast.error("Failed to update application");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLock = async () => {
    if (!application) return;
    
    setIsLocking(true);
    try {
      await lockApplicationAsAdmin(application.applicationId, selectedLockType);
      toast.success("Application locked successfully");
      if (onApplicationUpdated) onApplicationUpdated();
    } catch (error) {
      console.error("Error locking application:", error);
      toast.error("Failed to lock application");
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlock = async () => {
    if (!application || !application.lockInfo?.isLocked) return;
    
    setIsLocking(true);
    try {
      await unlockApplication(application.applicationId);
      toast.success("Application unlocked successfully");
      if (onApplicationUpdated) onApplicationUpdated();
    } catch (error) {
      console.error("Error unlocking application:", error);
      toast.error("Failed to unlock application");
    } finally {
      setIsLocking(false);
    }
  };

  if (!application) return null;

  const isLocked = application.lockInfo?.isLocked;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Application: {application.fullName}</span>
            {isEditing ? (
              <Button onClick={handleSave} disabled={isSaving} variant="success" size="sm">
                {isSaving ? "Saving..." : "Save Changes"}
                <Save className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                Edit Application
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            Submitted on: {new Date(application.submissionDate).toLocaleDateString()}
            {application.lockInfo?.isLocked && (
              <span className="ml-2 text-red-500 font-medium">
                (Locked until {new Date(application.lockInfo.expiresAt || '').toLocaleString()})
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="details">Application Details</TabsTrigger>
            <TabsTrigger value="admin">Admin Controls</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullname">Full Name</Label>
                  <Input
                    id="fullname"
                    value={formData.fullname || ''}
                    onChange={(e) => handleInputChange('fullname', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="phonenumber">Phone Number</Label>
                  <Input
                    id="phonenumber"
                    value={formData.phonenumber || ''}
                    onChange={(e) => handleInputChange('phonenumber', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="streetaddress">Street Address</Label>
                  <Input
                    id="streetaddress"
                    value={formData.streetaddress || ''}
                    onChange={(e) => handleInputChange('streetaddress', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city || ''}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="province">Province</Label>
                    <Input
                      id="province"
                      value={formData.province || ''}
                      onChange={(e) => handleInputChange('province', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="postalcode">Postal Code</Label>
                  <Input
                    id="postalcode"
                    value={formData.postalcode || ''}
                    onChange={(e) => handleInputChange('postalcode', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="vehicletype">Vehicle Type</Label>
                  <Input
                    id="vehicletype"
                    value={formData.vehicletype || ''}
                    onChange={(e) => handleInputChange('vehicletype', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="employmentstatus">Employment Status</Label>
                  <Input
                    id="employmentstatus"
                    value={formData.employmentstatus || ''}
                    onChange={(e) => handleInputChange('employmentstatus', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="monthlyincome">Monthly Income</Label>
                  <Input
                    id="monthlyincome"
                    value={formData.monthlyincome || ''}
                    onChange={(e) => handleInputChange('monthlyincome', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="employer_name">Employer Name</Label>
                  <Input
                    id="employer_name"
                    value={formData.employer_name || ''}
                    onChange={(e) => handleInputChange('employer_name', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={formData.job_title || ''}
                    onChange={(e) => handleInputChange('job_title', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="employment_duration">Employment Duration</Label>
                  <Input
                    id="employment_duration"
                    value={formData.employment_duration || ''}
                    onChange={(e) => handleInputChange('employment_duration', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="hasexistingloan">Has Existing Loan</Label>
                  <Select 
                    value={formData.hasexistingloan ? 'true' : 'false'} 
                    onValueChange={(value) => handleInputChange('hasexistingloan', value === 'true')}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status || 'submitted'} 
                    onValueChange={(value) => handleInputChange('status', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="requiredfeatures">Required Features</Label>
                <Textarea
                  id="requiredfeatures"
                  value={formData.requiredfeatures || ''}
                  onChange={(e) => handleInputChange('requiredfeatures', e.target.value)}
                  disabled={!isEditing}
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <Label htmlFor="unwantedcolors">Unwanted Colors</Label>
                <Input
                  id="unwantedcolors"
                  value={formData.unwantedcolors || ''}
                  onChange={(e) => handleInputChange('unwantedcolors', e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label htmlFor="preferredmakemodel">Preferred Make/Model</Label>
                <Input
                  id="preferredmakemodel"
                  value={formData.preferredmakemodel || ''}
                  onChange={(e) => handleInputChange('preferredmakemodel', e.target.value)}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label htmlFor="additionalnotes">Additional Notes</Label>
                <Textarea
                  id="additionalnotes"
                  value={formData.additionalnotes || ''}
                  onChange={(e) => handleInputChange('additionalnotes', e.target.value)}
                  disabled={!isEditing}
                  className="min-h-[120px]"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="admin">
            <div className="space-y-6">
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Application Lock Controls</h3>
                
                {isLocked ? (
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-red-700 font-medium">Application is currently locked</p>
                      <p className="text-sm text-red-600">
                        Lock type: {application.lockInfo?.lockType}
                        <br />
                        Expires: {new Date(application.lockInfo?.expiresAt || '').toLocaleString()}
                      </p>
                    </div>
                    
                    <Button
                      onClick={handleUnlock}
                      disabled={isLocking}
                      variant="destructive"
                      className="w-full"
                    >
                      <Unlock className="mr-2 h-4 w-4" />
                      {isLocking ? "Unlocking..." : "Remove Lock"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-blue-700">
                        Application is currently unlocked. Dealers can purchase it.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lock-type">Lock Type</Label>
                      <Select value={selectedLockType} onValueChange={setSelectedLockType}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select lock duration" />
                        </SelectTrigger>
                        <SelectContent>
                          {lockoutPeriods.map(period => (
                            <SelectItem 
                              key={period.id} 
                              value={period.name === '24 Hours' ? '24hours' : 
                                    period.name === '1 Week' ? '1week' : 
                                    period.name === '2 Weeks' ? '2weeks' : 
                                    period.name === 'Permanent' ? 'permanent' : 'temporary'}
                            >
                              {period.name} ({period.hours} hours)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button
                      onClick={handleLock}
                      disabled={isLocking}
                      variant="default"
                      className="w-full"
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      {isLocking ? "Locking..." : "Lock Application"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AdminApplicationDetails;
