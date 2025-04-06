
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

import { 
  getAllDealers, 
  addDealer, 
  updateDealer, 
  deleteDealer 
} from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { UserDealer } from '@/lib/types/supabase';

const DealerManagement = () => {
  const [dealers, setDealers] = useState<UserDealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<UserDealer | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    loadDealers();
  }, []);
  
  const loadDealers = async () => {
    try {
      setLoading(true);
      const data = await getAllDealers();
      setDealers(data);
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
      await addDealer(email, password, name, company);
      
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
  
  const handleEditDealer = (dealer: UserDealer) => {
    setSelectedDealer(dealer);
    setName(dealer.name);
    setCompany(dealer.company);
    setIsAdmin(dealer.isAdmin);
    setEditDialogOpen(true);
  };
  
  const handleDeleteConfirm = (dealer: UserDealer) => {
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
      const updatedDealer = await updateDealer(selectedDealer.id, {
        name,
        company,
        isAdmin
      });
      
      if (updatedDealer) {
        // Update the dealer in the list
        setDealers(prevDealers => 
          prevDealers.map(dealer => 
            dealer.id === updatedDealer.id ? updatedDealer : dealer
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
      
      // Remove dealer from list
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
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dealers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
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
                  <TableCell className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditDealer(dealer)}
                    >
                      Edit
                    </Button>
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
    </div>
  );
};

export default DealerManagement;
