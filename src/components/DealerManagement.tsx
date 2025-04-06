import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogClose 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Pause, Play, Mail } from 'lucide-react';

import { 
  getAllDealers, 
  addDealer, 
  updateDealer, 
  deleteDealer,
  pauseDealer,
  resumeDealerByAdmin,
  resumeDealerWithPin,
  sendDealerPinEmail,
  isDealerPaused,
  getDefaultPin
} from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { UserDealer, PauseStatus } from '@/lib/types/supabase';

const DealerManagement = () => {
  const [dealers, setDealers] = useState<(UserDealer & { pauseStatus?: PauseStatus })[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [resumeWithPinDialogOpen, setResumeWithPinDialogOpen] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<(UserDealer & { pauseStatus?: PauseStatus }) | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Pause states
  const [isPermanent, setIsPermanent] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [resumePinCode, setResumePinCode] = useState('');
  
  const { toast } = useToast();
  const navigate = useNavigate();
  
  useEffect(() => {
    loadDealers();
  }, []);
  
  const loadDealers = async () => {
    try {
      setLoading(true);
      const data = await getAllDealers();
      
      // Load pause status for each dealer
      const dealersWithPauseStatus = await Promise.all(
        data.map(async (dealer) => {
          const pauseStatus = await isDealerPaused(dealer.id);
          return { ...dealer, pauseStatus };
        })
      );
      
      setDealers(dealersWithPauseStatus);
    } catch (error) {
      console.error('Failed to load dealers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dealers. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handlePauseDealer = (dealer: UserDealer & { pauseStatus?: PauseStatus }) => {
    setSelectedDealer(dealer);
    setIsPermanent(false); // Default to temporary pause
    // Get default pin (last 4 digits of phone or random)
    getDefaultPin(dealer.id).then((defaultPin) => {
      setPinCode(defaultPin);
      setPauseDialogOpen(true);
    });
  };
  
  const handleResumeDealer = async (dealer: UserDealer & { pauseStatus?: PauseStatus }) => {
    if (!dealer.pauseStatus?.isPaused) return;
    
    setProcessingId(`resume-${dealer.id}`);
    
    try {
      if (dealer.pauseStatus.isPermanent) {
        // For permanent pauses, admin can resume directly
        const result = await resumeDealerByAdmin(dealer.id);
        
        if (result.success) {
          toast({
            title: 'Dealer Resumed',
            description: 'Dealer purchasing has been resumed successfully.',
          });
          
          // Update the dealer in the list
          setDealers(prevDealers => 
            prevDealers.map(d => 
              d.id === dealer.id
                ? { ...d, pauseStatus: { isPaused: false } }
                : d
            )
          );
        } else {
          toast({
            title: 'Resume Failed',
            description: result.message || 'Could not resume dealer purchasing.',
            variant: 'destructive',
          });
        }
      } else {
        // For temporary pauses, show PIN dialog
        setSelectedDealer(dealer);
        setResumeWithPinDialogOpen(true);
      }
    } catch (error) {
      console.error('Error resuming dealer:', error);
      toast({
        title: 'Error',
        description: 'Failed to resume dealer. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleSendPinEmail = async (dealer: UserDealer & { pauseStatus?: PauseStatus }) => {
    setProcessingId(`email-${dealer.id}`);
    
    try {
      const result = await sendDealerPinEmail(dealer.id);
      
      if (result.success) {
        toast({
          title: 'PIN Email Sent',
          description: 'The PIN has been sent to the dealer\'s email.',
        });
      } else {
        toast({
          title: 'Failed to Send Email',
          description: result.message || 'Could not send PIN email.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending PIN email:', error);
      toast({
        title: 'Error',
        description: 'Failed to send PIN email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleSubmitPause = async () => {
    if (!selectedDealer) return;
    
    setProcessingId(`pause-${selectedDealer.id}`);
    
    try {
      // Validate PIN format
      if (!/^\d{4}$/.test(pinCode)) {
        toast({
          title: 'Invalid PIN',
          description: 'PIN must be exactly 4 digits.',
          variant: 'destructive',
        });
        return;
      }
      
      const result = await pauseDealer(selectedDealer.id, isPermanent, pinCode);
      
      if (result.success) {
        toast({
          title: 'Dealer Paused',
          description: `Dealer purchasing has been ${isPermanent ? 'permanently' : 'temporarily'} paused.`,
        });
        
        // Update the dealer in the list
        setDealers(prevDealers => 
          prevDealers.map(dealer => 
            dealer.id === selectedDealer.id
              ? { 
                  ...dealer, 
                  pauseStatus: { 
                    isPaused: true, 
                    isPermanent: isPermanent 
                  } 
                }
              : dealer
          )
        );
        
        setPauseDialogOpen(false);
      } else {
        toast({
          title: 'Pause Failed',
          description: result.message || 'Could not pause dealer purchasing.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error pausing dealer:', error);
      toast({
        title: 'Error',
        description: 'Failed to pause dealer. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleSubmitResumeWithPin = async () => {
    if (!selectedDealer) return;
    
    setProcessingId(`resume-pin-${selectedDealer.id}`);
    
    try {
      // Validate PIN format
      if (!/^\d{4}$/.test(resumePinCode)) {
        toast({
          title: 'Invalid PIN',
          description: 'PIN must be exactly 4 digits.',
          variant: 'destructive',
        });
        return;
      }
      
      const result = await resumeDealerWithPin(selectedDealer.id, resumePinCode);
      
      if (result.success) {
        toast({
          title: 'Dealer Resumed',
          description: 'Dealer purchasing has been resumed successfully.',
        });
        
        // Update the dealer in the list
        setDealers(prevDealers => 
          prevDealers.map(dealer => 
            dealer.id === selectedDealer.id
              ? { ...dealer, pauseStatus: { isPaused: false } }
              : dealer
          )
        );
        
        setResumeWithPinDialogOpen(false);
        setResumePinCode('');
      } else {
        toast({
          title: 'Resume Failed',
          description: result.message || 'Invalid PIN code.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error resuming dealer with PIN:', error);
      toast({
        title: 'Error',
        description: 'Failed to resume dealer. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleAddDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !name || !company) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Fixed: Correctly create a dealer object with all required fields
      const newDealer: Partial<UserDealer> = {
        email,
        name,
        company,
        isAdmin
      };
      
      await addDealer(newDealer);
      
      toast({
        title: 'Dealer Added',
        description: 'New dealer account has been created successfully.',
      });
      
      setAddDialogOpen(false);
      setEmail('');
      setPassword('');
      setName('');
      setCompany('');
      setIsAdmin(false);
      
      // Reload dealers
      await loadDealers();
    } catch (error) {
      console.error('Error adding dealer:', error);
      toast({
        title: 'Error',
        description: 'Failed to add dealer. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const handleEditDealer = (dealer: UserDealer & { pauseStatus?: PauseStatus }) => {
    setSelectedDealer(dealer);
    setName(dealer.name);
    setCompany(dealer.company);
    setIsAdmin(dealer.isAdmin);
    setEditDialogOpen(true);
  };
  
  const handleDeleteConfirm = (dealer: UserDealer & { pauseStatus?: PauseStatus }) => {
    setSelectedDealer(dealer);
    setDeleteDialogOpen(true);
  };
  
  const handleUpdateDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDealer || !name || !company) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Fixed: Create update object with the correct fields
      const updatedDealerData: Partial<UserDealer> = {
        name,
        company,
        isAdmin
      };
      
      const updatedDealer = await updateDealer({
        ...updatedDealerData,
        id: selectedDealer.id
      });
      
      if (updatedDealer) {
        // Update the dealer in the list
        setDealers(prevDealers => 
          prevDealers.map(dealer => 
            dealer.id === selectedDealer.id ? {
              ...updatedDealer,
              pauseStatus: dealer.pauseStatus
            } : dealer
          )
        );
      }
      
      toast({
        title: 'Dealer Updated',
        description: 'Dealer information has been updated successfully.',
      });
      
      setEditDialogOpen(false);
      setSelectedDealer(null);
    } catch (error) {
      console.error('Error updating dealer:', error);
      toast({
        title: 'Error',
        description: 'Failed to update dealer. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const handleDeleteDealer = async () => {
    if (!selectedDealer) return;
    
    try {
      await deleteDealer(selectedDealer.id);
      
      // Fixed: Correctly filter out the deleted dealer
      setDealers(prevDealers => 
        prevDealers.filter(dealer => dealer.id !== selectedDealer.id)
      );
      
      toast({
        title: 'Dealer Deleted',
        description: 'Dealer account has been deleted successfully.',
      });
      
      setDeleteDialogOpen(false);
      setSelectedDealer(null);
    } catch (error) {
      console.error('Error deleting dealer:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete dealer. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Dealer Management</h2>
        <Button 
          onClick={() => setAddDialogOpen(true)}
          className="bg-ontario-blue hover:bg-ontario-blue/90"
        >
          Add New Dealer
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-8">
          <p>Loading dealers...</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dealers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No dealers found. Add a new dealer to get started.
                </TableCell>
              </TableRow>
            ) : (
              dealers.map(dealer => (
                <TableRow key={dealer.id}>
                  <TableCell>{dealer.name}</TableCell>
                  <TableCell>{dealer.email}</TableCell>
                  <TableCell>{dealer.company}</TableCell>
                  <TableCell>{dealer.isAdmin ? 'Admin' : 'Dealer'}</TableCell>
                  <TableCell>
                    {dealer.pauseStatus?.isPaused ? (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {dealer.pauseStatus.isPermanent ? 'Permanently Paused' : 'Temporarily Paused'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-600/20 bg-green-50">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditDealer(dealer)}
                    >
                      Edit
                    </Button>
                    {dealer.pauseStatus?.isPaused ? (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-green-600"
                          onClick={() => handleResumeDealer(dealer)}
                          disabled={processingId === `resume-${dealer.id}`}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Resume
                        </Button>
                        {!dealer.pauseStatus.isPermanent && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-blue-600"
                            onClick={() => handleSendPinEmail(dealer)}
                            disabled={processingId === `email-${dealer.id}`}
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            Email PIN
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-amber-600"
                        onClick={() => handlePauseDealer(dealer)}
                        disabled={processingId === `pause-${dealer.id}`}
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </Button>
                    )}
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteConfirm(dealer)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
      
      {/* Add Dealer Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Dealer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddDealer} className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isAdmin"
                  checked={isAdmin}
                  onCheckedChange={(checked) => setIsAdmin(checked === true)}
                />
                <Label htmlFor="isAdmin">Admin Account</Label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Add Dealer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dealer Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Dealer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateDealer} className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-company">Company</Label>
                <Input
                  id="edit-company"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-isAdmin"
                  checked={isAdmin}
                  onCheckedChange={(checked) => setIsAdmin(checked === true)}
                />
                <Label htmlFor="edit-isAdmin">Admin Account</Label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete the dealer account for{' '}
            <strong>{selectedDealer?.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={handleDeleteDealer}
            >
              Delete Dealer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Pause Dealer Dialog */}
      <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Pause Dealer Purchasing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              You are about to pause purchasing for{' '}
              <strong>{selectedDealer?.name}</strong>.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="pause-type">Pause Type</Label>
              <Select
                value={isPermanent ? 'permanent' : 'temporary'}
                onValueChange={(value) => setIsPermanent(value === 'permanent')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pause type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="temporary">Temporary (Dealer can resume with PIN)</SelectItem>
                    <SelectItem value="permanent">Permanent (Only admin can resume)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            {!isPermanent && (
              <div className="space-y-2">
                <Label htmlFor="pin-code">4-Digit PIN Code</Label>
                <Input
                  id="pin-code"
                  value={pinCode}
                  onChange={e => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  placeholder="Enter 4-digit PIN"
                />
                <p className="text-xs text-gray-500">
                  This PIN will be used by the dealer to resume purchasing. Default is the last 4 digits of their phone number.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              variant="default"
              onClick={handleSubmitPause}
              disabled={processingId === `pause-${selectedDealer?.id}`}
            >
              Pause Purchasing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Resume With PIN Dialog */}
      <Dialog open={resumeWithPinDialogOpen} onOpenChange={setResumeWithPinDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Resume Dealer Purchasing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              To resume purchasing for{' '}
              <strong>{selectedDealer?.name}</strong>, enter the 4-digit PIN code.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="resume-pin-code">PIN Code</Label>
              <Input
                id="resume-pin-code"
                value={resumePinCode}
                onChange={e => setResumePinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                placeholder="Enter 4-digit PIN"
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              variant="default"
              onClick={handleSubmitResumeWithPin}
              disabled={processingId === `resume-pin-${selectedDealer?.id}`}
            >
              Resume Purchasing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DealerManagement;
