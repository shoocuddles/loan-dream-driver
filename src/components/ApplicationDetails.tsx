import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ApplicationItem, DownloadedApplication } from '@/lib/types/dealer-dashboard';
import { format } from 'date-fns';
import { Lock, Unlock, Download } from 'lucide-react';
import DownloadOptions from './application-table/DownloadOptions';
import { getPrice, AgeDiscountSettings } from './application-table/priceUtils';

interface ApplicationDetailsProps {
  application: ApplicationItem | DownloadedApplication | null;
  isOpen: boolean;
  onClose: () => void;
  isDownloaded?: boolean;
  onDownload?: (applicationId: string) => Promise<void>;
  onLock?: (applicationId: string, lockType: string) => Promise<void>;
  onUnlock?: (applicationId: string) => Promise<void>;
  isProcessing?: boolean;
  selectedApplicationIds?: string[];
  ageDiscountSettings?: AgeDiscountSettings;
}

const ApplicationDetails = ({
  application,
  isOpen,
  onClose,
  isDownloaded = false,
  onDownload,
  onLock,
  onUnlock,
  isProcessing = false,
  selectedApplicationIds = [],
  ageDiscountSettings
}: ApplicationDetailsProps) => {
  const [showLockOptions, setShowLockOptions] = useState(false);

  const handleDownload = async () => {
    if (!application || !onDownload) return;
    await onDownload(application.applicationId);
  };

  const handleLock = async (lockType: string) => {
    if (!application || !onLock) return;
    await onLock(application.applicationId, lockType);
    setShowLockOptions(false);
  };

  const handleUnlock = async () => {
    if (!application || !onUnlock) return;
    await onUnlock(application.applicationId);
  };

  const isApplicationItem = (app: any): app is ApplicationItem => {
    return 'lockInfo' in app;
  };

  if (!application) return null;

  const isLocked = isApplicationItem(application) && application.lockInfo?.isLocked;
  const isOwnLock = isApplicationItem(application) && application.lockInfo?.isOwnLock;
  
  const getDisplayDate = () => {
    if (isApplicationItem(application)) {
      return application.submissionDate;
    } else {
      return (application as DownloadedApplication).downloadDate;
    }
  };
  
  const renderContactInfo = () => {
    if (!isDownloaded) {
      return (
        <div className="p-4 bg-gray-50 border rounded-md">
          <p className="text-center">Contact information will be available after purchase</p>
        </div>
      );
    }
    
    const downloadedApp = application as DownloadedApplication;
    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Phone</p>
          <p>{downloadedApp.phoneNumber || 'Not provided'}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Email</p>
          <p>{downloadedApp.email || 'Not provided'}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Address</p>
          <p>{downloadedApp.address || 'Not provided'}</p>
          <p>
            {[downloadedApp.city, downloadedApp.province, downloadedApp.postalCode]
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>
      </div>
    );
  };

  const renderPriceDisplay = () => {
    if (!isApplicationItem(application) || isDownloaded) {
      return null;
    }
    
    const appItem = application as ApplicationItem;
    const priceDisplay = getPrice(appItem, ageDiscountSettings);
    const isAgeDiscounted = appItem.isAgeDiscounted;

    return (
      <div className="mt-2">
        <p className="text-sm font-medium">Price:</p>
        <p className={isAgeDiscounted ? "text-green-600 font-medium" : ""}>
          {priceDisplay}
          {isAgeDiscounted && ageDiscountSettings && (
            <span className="text-xs ml-2">
              ({ageDiscountSettings.discountPercentage}% age discount applied)
            </span>
          )}
        </p>
      </div>
    );
  };

  const renderActions = () => {
    if (isProcessing) {
      return (
        <Button disabled>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </Button>
      );
    }
    
    if (!isDownloaded && onDownload) {
      return (
        <div className="flex gap-2">
          <Button onClick={handleDownload} className="flex-1">
            Purchase Application
          </Button>
          
          {isApplicationItem(application) && (
            <>
              {isLocked && isOwnLock && onUnlock ? (
                <Button variant="outline" onClick={handleUnlock}>
                  <Unlock className="mr-2 h-4 w-4" /> Unlock
                </Button>
              ) : !isLocked && onLock && (
                <div className="relative">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowLockOptions(!showLockOptions)}
                  >
                    <Lock className="mr-2 h-4 w-4" /> Lock
                  </Button>
                  
                  {showLockOptions && (
                    <div className="absolute right-0 mt-1 bg-white shadow-lg rounded-md border border-gray-200 z-10 w-64 py-1">
                      <div className="px-4 py-2 bg-blue-50 text-xs text-blue-700 border-b border-blue-100">
                        Lock this application to avoid other dealers being able to view. 24-hr lockout period automatic for every purchase.
                      </div>
                      <button
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => handleLock('24hours')}
                      >
                        24 Hours - $4.99
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => handleLock('1week')}
                      >
                        1 Week - $9.99
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => handleLock('permanent')}
                      >
                        Permanent - $29.99
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      );
    }
    
    if (isDownloaded && application) {
      return (
        <DownloadOptions
          applicationIds={[application.applicationId]}
          isProcessing={isProcessing}
          label="Download Application"
        />
      );
    }
    
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Application Details</DialogTitle>
          <DialogDescription>
            {isDownloaded ? 'You have access to all application details.' : 'Purchase to view contact information.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">{application.fullName}</h3>
            <p className="text-sm text-gray-500">
              Submitted on {format(new Date(getDisplayDate()), 'MMMM d, yyyy')}
            </p>
            {renderPriceDisplay()}
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Contact Information</h4>
              {renderContactInfo()}
            </div>
            
            {isApplicationItem(application) && (
              <div>
                <h4 className="font-medium mb-2">Location</h4>
                <p>{application.city || 'Not provided'}</p>
              </div>
            )}
          </div>
          
          <div className="pt-4 border-t">
            {renderActions()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApplicationDetails;
