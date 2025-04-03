
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { getAllDealers, addDealer, updateDealer, deleteDealer } from "@/lib/supabase";
import { Dealer } from "@/lib/types";

const DealerManagement = () => {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newDealerEmail, setNewDealerEmail] = useState("");
  const [newDealerPassword, setNewDealerPassword] = useState("");
  const [newDealerName, setNewDealerName] = useState("");
  const [newDealerCompany, setNewDealerCompany] = useState("");
  const [isAddingDealer, setIsAddingDealer] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    loadDealers();
  }, []);
  
  const loadDealers = async () => {
    try {
      setIsLoading(true);
      const dealersList = await getAllDealers();
      // Sort by name
      dealersList.sort((a, b) => a.name.localeCompare(b.name));
      setDealers(dealersList);
    } catch (error) {
      console.error("Error loading dealers:", error);
      toast({
        title: "Error",
        description: "Unable to load dealers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddDealer = async () => {
    try {
      // Validate inputs
      if (!newDealerEmail || !newDealerPassword || !newDealerName || !newDealerCompany) {
        toast({
          title: "Missing Fields",
          description: "Please fill in all fields to add a new dealer.",
          variant: "destructive",
        });
        return;
      }
      
      setIsAddingDealer(true);
      
      // Add new dealer
      await addDealer(newDealerEmail, newDealerPassword, newDealerName, newDealerCompany);
      
      // Clear form
      setNewDealerEmail("");
      setNewDealerPassword("");
      setNewDealerName("");
      setNewDealerCompany("");
      
      // Reload dealers
      await loadDealers();
      
      toast({
        title: "Dealer Added",
        description: "New dealer account has been created successfully.",
      });
    } catch (error) {
      console.error("Error adding dealer:", error);
      toast({
        title: "Error",
        description: "Unable to add dealer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingDealer(false);
    }
  };
  
  const handleToggleActive = async (dealer: Dealer) => {
    try {
      const updatedDealer = { ...dealer, isActive: !dealer.isActive };
      await updateDealer(dealer.id, { isActive: !dealer.isActive });
      
      // Update local state
      setDealers(prev => prev.map(d => 
        d.id === dealer.id ? updatedDealer : d
      ));
      
      toast({
        title: dealer.isActive ? "Dealer Suspended" : "Dealer Activated",
        description: `${dealer.name} has been ${dealer.isActive ? "suspended" : "activated"}.`,
      });
    } catch (error) {
      console.error("Error updating dealer:", error);
      toast({
        title: "Error",
        description: "Unable to update dealer status. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleEditDealer = (dealer: Dealer) => {
    setSelectedDealer(dealer);
    setIsDialogOpen(true);
  };
  
  const handleUpdateDealer = async () => {
    if (!selectedDealer) return;
    
    try {
      await updateDealer(selectedDealer.id, {
        name: selectedDealer.name,
        company: selectedDealer.company,
        isActive: selectedDealer.isActive
      });
      
      // Update local state
      setDealers(prev => prev.map(d => 
        d.id === selectedDealer.id ? selectedDealer : d
      ));
      
      setIsDialogOpen(false);
      
      toast({
        title: "Dealer Updated",
        description: "Dealer information has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating dealer:", error);
      toast({
        title: "Error",
        description: "Unable to update dealer. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteDealer = async (dealer: Dealer) => {
    try {
      setConfirmDelete(dealer.id);
      await deleteDealer(dealer.id);
      
      // Update local state
      setDealers(prev => prev.filter(d => d.id !== dealer.id));
      
      toast({
        title: "Dealer Deleted",
        description: `${dealer.name} has been deleted successfully.`,
      });
    } catch (error) {
      console.error("Error deleting dealer:", error);
      toast({
        title: "Error",
        description: "Unable to delete dealer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setConfirmDelete(null);
    }
  };
  
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Dealer Management</CardTitle>
        <CardDescription>Add, edit, or suspend dealer accounts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-3">Add New Dealer</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="dealerName">Name</Label>
              <Input
                id="dealerName"
                value={newDealerName}
                onChange={(e) => setNewDealerName(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="dealerCompany">Company</Label>
              <Input
                id="dealerCompany"
                value={newDealerCompany}
                onChange={(e) => setNewDealerCompany(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="dealerEmail">Email</Label>
              <Input
                id="dealerEmail"
                type="email"
                value={newDealerEmail}
                onChange={(e) => setNewDealerEmail(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="dealerPassword">Password</Label>
              <Input
                id="dealerPassword"
                type="password"
                value={newDealerPassword}
                onChange={(e) => setNewDealerPassword(e.target.value)}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleAddDealer}
            disabled={isAddingDealer}
            className="w-full bg-ontario-blue hover:bg-ontario-blue/90"
          >
            {isAddingDealer ? "Adding..." : "Add Dealer"}
          </Button>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <h3 className="font-medium p-4 bg-gray-50 border-b">Dealers List</h3>
          
          {isLoading ? (
            <p className="text-center py-4 text-gray-500">Loading dealers...</p>
          ) : dealers.length === 0 ? (
            <p className="text-center py-4 text-gray-500">No dealers found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dealers.map((dealer) => (
                    <TableRow key={dealer.id}>
                      <TableCell className="font-medium">{dealer.name}</TableCell>
                      <TableCell>{dealer.company}</TableCell>
                      <TableCell>{dealer.email}</TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          dealer.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {dealer.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditDealer(dealer)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={dealer.isActive ? 'text-red-500 border-red-500' : 'text-green-500 border-green-500'}
                            onClick={() => handleToggleActive(dealer)}
                          >
                            {dealer.isActive ? 'Suspend' : 'Activate'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={confirmDelete === dealer.id}
                            onClick={() => handleDeleteDealer(dealer)}
                          >
                            {confirmDelete === dealer.id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Edit Dealer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Dealer</DialogTitle>
            <DialogDescription>Update dealer information</DialogDescription>
          </DialogHeader>
          
          {selectedDealer && (
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="editName">Name</Label>
                <Input
                  id="editName"
                  value={selectedDealer.name}
                  onChange={(e) => setSelectedDealer({...selectedDealer, name: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="editCompany">Company</Label>
                <Input
                  id="editCompany"
                  value={selectedDealer.company}
                  onChange={(e) => setSelectedDealer({...selectedDealer, company: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  value={selectedDealer.email}
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={selectedDealer.isActive}
                  onCheckedChange={(checked) => setSelectedDealer({...selectedDealer, isActive: checked})}
                />
                <Label>Active Account</Label>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDealer}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DealerManagement;
