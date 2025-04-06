import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/use-auth';
import { useToast } from "@/hooks/use-toast";
import {
  getApplications,
  lockApplication,
  checkApplicationLock,
  unlockApplication,
  recordDownload,
  DEFAULT_SETTINGS
} from '@/lib/supabase';
import { Application, ApplicationLock } from '@/lib/types/supabase';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Download, Lock, Unlock, Eye } from 'lucide-react';

const DealerDashboard = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState('');
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await getApplications();
      setApplications(data);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast({
        title: "Error",
        description: "Failed to load applications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (application: Application) => {
    navigate(`/applications/${application.id}`);
  };

  const handleLockApplication = async (application: Application) => {
    if (!currentUser || !application) return;

    try {
      setActionInProgress(application.id);
      const success = await lockApplication(application.id, currentUser.id);

      if (success) {
        // Update the applications list to show the application as locked
        setApplications(prevApplications =>
          prevApplications.map(app =>
            app.id === application.id
              ? { ...app, isLocked: true, lockedBy: currentUser.id }
              : app
          )
        );

        toast({
          title: "Application Locked",
          description: `You have locked "${application.fullName}'s" application.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to lock application. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error locking application:", error);
      toast({
        title: "Error",
        description: "An error occurred while locking the application.",
        variant: "destructive",
      });
    } finally {
      setActionInProgress('');
    }
  };

  const handleProcessPayment = async (application: Application) => {
    // Placeholder for payment processing logic
    toast({
      title: "Payment Processing",
      description: "Simulating payment processing...",
    });

    try {
      setActionInProgress(application.id);
      // Simulate successful payment
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Record the download
      if (currentUser) {
        const success = await recordDownload(application.id, currentUser.id);
        if (success) {
          toast({
            title: "Application Downloaded",
            description: `"${application.fullName}'s" application has been downloaded.`,
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to record download. Please try again.",
            variant: "destructive",
          });
        }
      }

      // Unlock the application after successful download
      const unlockSuccess = await unlockApplication(application.id);
      if (unlockSuccess) {
        // Update the applications list to show the application as unlocked
        setApplications(prevApplications =>
          prevApplications.map(app =>
            app.id === application.id
              ? { ...app, isLocked: false, lockedBy: null }
              : app
          )
        );
      } else {
        toast({
          title: "Error",
          description: "Failed to unlock application. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Error",
        description: "An error occurred while processing the payment.",
        variant: "destructive",
      });
    } finally {
      setActionInProgress('');
    }
  };

  const handleUnlockApplication = async (application: Application) => {
    try {
      setActionInProgress(application.id);
      const success = await unlockApplication(application.id);

      if (success) {
        // Update the applications list to show the application as unlocked
        setApplications(prevApplications =>
          prevApplications.map(app =>
            app.id === application.id
              ? { ...app, isLocked: false, lockedBy: null }
              : app
          )
        );

        toast({
          title: "Application Unlocked",
          description: `You have unlocked "${application.fullName}'s" application.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to unlock application. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error unlocking application:", error);
      toast({
        title: "Error",
        description: "An error occurred while unlocking the application.",
        variant: "destructive",
      });
    } finally {
      setActionInProgress('');
    }
  };

  const renderApplicationActions = (application: Application, lock: ApplicationLock | null) => {
    if (lock?.isLocked) {
      const expiresAt = lock.expires_at ? new Date(lock.expires_at) : null;
      const timeLeft = expiresAt ? expiresAt.getTime() - Date.now() : 0;
      const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));

      return (
        <>
          <Badge variant="destructive">
            Locked by another dealer
          </Badge>
          <p className="text-sm text-gray-500">
            Expires in {hoursLeft} hours
          </p>
        </>
      );
    }

    return (
      <>
        <Button
          size="sm"
          onClick={() => handleProcessPayment(application)}
          disabled={actionInProgress === application.id}
        >
          {actionInProgress === application.id ? 'Processing...' : 'Download'}
        </Button>
        {application.isLocked && application.lockedBy === currentUser?.id && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleUnlockApplication(application)}
            disabled={actionInProgress === application.id}
          >
            {actionInProgress === application.id ? 'Unlocking...' : 'Unlock'}
          </Button>
        )}
      </>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dealer Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading applications...</p>
        ) : (
          <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-3">Application ID</TableHead>
                  <TableHead className="px-6 py-3">Full Name</TableHead>
                  <TableHead className="px-6 py-3">Email</TableHead>
                  <TableHead className="px-6 py-3">Submitted Date</TableHead>
                  <TableHead className="px-6 py-3">Status</TableHead>
                  <TableHead className="px-6 py-3">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => {
                  const lockPromise = checkApplicationLock(application.id);

                  return (
                    <TableRow key={application.id}>
                      <TableCell className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                        {application.id}
                      </TableCell>
                      <TableCell className="px-6 py-4">{application.fullName}</TableCell>
                      <TableCell className="px-6 py-4">{application.email}</TableCell>
                      <TableCell className="px-6 py-4">
                        {format(new Date(application.created_at), 'MMMM d, yyyy')}
                      </TableCell>
                      <TableCell className="px-6 py-4">{application.status}</TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center space-x-4">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleViewDetails(application)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Button>
                          <LockStatus application={application} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DealerDashboard;

interface LockStatusProps {
  application: Application;
}

const LockStatus: React.FC<LockStatusProps> = ({ application }) => {
  const [lock, setLock] = useState<ApplicationLock | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [actionInProgress, setActionInProgress] = useState('');

  useEffect(() => {
    const fetchLockStatus = async () => {
      setIsLoading(true);
      try {
        const lockData = await checkApplicationLock(application.id);
        setLock(lockData);
      } catch (error) {
        console.error("Error checking application lock:", error);
        toast({
          title: "Error",
          description: "Failed to check application lock status.",
          variant: "destructive",
        });
        setLock(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLockStatus();
  }, [application.id, toast]);

  const handleLockApplication = async () => {
    if (!currentUser || !application) return;

    try {
      setActionInProgress(application.id);
      const success = await lockApplication(application.id, currentUser.id);

      if (success) {
        // Optimistically update the lock status
        setLock({
          id: 'temp', // Temporary ID, will be replaced on refresh
          application_id: application.id,
          dealer_id: currentUser.id,
          locked_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + DEFAULT_SETTINGS.lockoutPeriodHours * 60 * 60 * 1000).toISOString(),
          isLocked: true
        });

        toast({
          title: "Application Locked",
          description: `You have locked "${application.fullName}'s" application.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to lock application. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error locking application:", error);
      toast({
        title: "Error",
        description: "An error occurred while locking the application.",
        variant: "destructive",
      });
    } finally {
      setActionInProgress('');
    }
  };

  const handleUnlockApplication = async () => {
    try {
      setActionInProgress(application.id);
      const success = await unlockApplication(application.id);

      if (success) {
        // Optimistically update the lock status
        setLock(null);

        toast({
          title: "Application Unlocked",
          description: `You have unlocked "${application.fullName}'s" application.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to unlock application. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error unlocking application:", error);
      toast({
        title: "Error",
        description: "An error occurred while unlocking the application.",
        variant: "destructive",
      });
    } finally {
      setActionInProgress('');
    }
  };

  const handleProcessPayment = async () => {
    // Placeholder for payment processing logic
    toast({
      title: "Payment Processing",
      description: "Simulating payment processing...",
    });

    try {
      setActionInProgress(application.id);
      // Simulate successful payment
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Record the download
      if (currentUser) {
        const success = await recordDownload(application.id, currentUser.id);
        if (success) {
          toast({
            title: "Application Downloaded",
            description: `"${application.fullName}'s" application has been downloaded.`,
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to record download. Please try again.",
            variant: "destructive",
          });
        }
      }

      // Unlock the application after successful download
      const unlockSuccess = await unlockApplication(application.id);
      if (unlockSuccess) {
        setLock(null);
      } else {
        toast({
          title: "Error",
          description: "Failed to unlock application. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Error",
        description: "An error occurred while processing the payment.",
        variant: "destructive",
      });
    } finally {
      setActionInProgress('');
    }
  };

  if (isLoading) {
    return <p>Checking lock status...</p>;
  }

  if (lock?.isLocked) {
    const expiresAt = lock.expires_at ? new Date(lock.expires_at) : null;
    const timeLeft = expiresAt ? expiresAt.getTime() - Date.now() : 0;
    const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));

    return (
      <>
        <Badge variant="destructive">
          Locked by another dealer
        </Badge>
        <p className="text-sm text-gray-500">
          Expires in {hoursLeft} hours
        </p>
      </>
    );
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => handleProcessPayment()}
        disabled={actionInProgress === application.id}
      >
        {actionInProgress === application.id ? 'Processing...' : <><Download className="mr-2 h-4 w-4" /> Download</>}
      </Button>
      {lock && lock.dealer_id === currentUser?.id && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleUnlockApplication()}
          disabled={actionInProgress === application.id}
        >
          {actionInProgress === application.id ? 'Unlocking...' : <><Unlock className="mr-2 h-4 w-4" /> Unlock</>}
        </Button>
      )}
      {!lock && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleLockApplication()}
          disabled={actionInProgress === application.id}
        >
          {actionInProgress === application.id ? 'Locking...' : <><Lock className="mr-2 h-4 w-4" /> Lock</>}
        </Button>
      )}
    </>
  );
};
