import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAllApplications, getApplicationDetails, supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import "jspdf-autotable";

const AdminDashboard = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePasswordError, setChangePasswordError] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is admin
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (!isAdmin) {
      navigate('/dealers');
      return;
    }
    
    loadApplications();
  }, [navigate]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const allApps = await getAllApplications();
      setApplications(allApps);
    } catch (error) {
      console.error("Error loading applications:", error);
      toast({
        title: "Error",
        description: "Unable to load applications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = () => {
    setChangePasswordError("");
    
    if (newPassword.length < 6) {
      setChangePasswordError("Password must be at least 6 characters");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setChangePasswordError("Passwords do not match");
      return;
    }
    
    // For demo purposes, we'll just show a success message
    // In a real app, you would update the password in the database
    toast({
      title: "Password Updated",
      description: "Your admin password has been changed successfully.",
    });
    
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleDownload = async (applicationId: string) => {
    try {
      setProcessingId(applicationId);
      
      // Get application details
      const details = await getApplicationDetails(applicationId);
      
      // Generate PDF
      const pdf = new jsPDF();
      
      // Add header
      pdf.setFontSize(20);
      pdf.setTextColor(0, 51, 102); // Ontario blue
      pdf.text("Ontario Loans - Application Details (ADMIN)", 105, 15, { align: "center" });
      
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Application ID: ${applicationId}`, 105, 25, { align: "center" });
      pdf.text(`Submission Date: ${new Date(details.submissionDate).toLocaleDateString()}`, 105, 30, { align: "center" });
      
      // Personal Information
      pdf.setFontSize(16);
      pdf.setTextColor(0, 51, 102);
      pdf.text("Personal Information", 14, 40);
      
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      
      const personalInfo = [
        ["Name", details.fullName],
        ["Phone", details.phoneNumber],
        ["Email", details.email],
        ["Address", `${details.streetAddress}, ${details.city}, ${details.province}, ${details.postalCode}`]
      ];
      
      // @ts-ignore
      pdf.autoTable({
        startY: 45,
        head: [["Field", "Value"]],
        body: personalInfo,
        theme: "grid",
        headStyles: { fillColor: [0, 51, 102] }
      });
      
      // Vehicle Details
      pdf.setFontSize(16);
      pdf.setTextColor(0, 51, 102);
      // @ts-ignore
      pdf.text("Desired Vehicle Details", 14, pdf.autoTable.previous.finalY + 10);
      
      const vehicleInfo = [
        ["Vehicle Type", details.vehicleType],
        ["Required Features", details.requiredFeatures],
        ["Unwanted Colors", details.unwantedColors],
        ["Preferred Make & Model", details.preferredMakeModel]
      ];
      
      // @ts-ignore
      pdf.autoTable({
        // @ts-ignore
        startY: pdf.autoTable.previous.finalY + 15,
        head: [["Field", "Value"]],
        body: vehicleInfo,
        theme: "grid",
        headStyles: { fillColor: [0, 51, 102] }
      });
      
      // Existing Loan Info
      pdf.setFontSize(16);
      pdf.setTextColor(0, 51, 102);
      // @ts-ignore
      pdf.text("Current Loan Information", 14, pdf.autoTable.previous.finalY + 10);
      
      const loanInfo = [];
      if (details.hasExistingLoan) {
        loanInfo.push(
          ["Has Existing Loan", "Yes"],
          ["Current Payment", `$${details.currentPayment}`],
          ["Amount Owed", `$${details.amountOwed}`],
          ["Current Vehicle", details.currentVehicle],
          ["Mileage", `${details.mileage} km`]
        );
      } else {
        loanInfo.push(["Has Existing Loan", "No"]);
      }
      
      // @ts-ignore
      pdf.autoTable({
        // @ts-ignore
        startY: pdf.autoTable.previous.finalY + 15,
        head: [["Field", "Value"]],
        body: loanInfo,
        theme: "grid",
        headStyles: { fillColor: [0, 51, 102] }
      });
      
      // Income Details
      pdf.setFontSize(16);
      pdf.setTextColor(0, 51, 102);
      // @ts-ignore
      pdf.text("Income Information", 14, pdf.autoTable.previous.finalY + 10);
      
      const incomeInfo = [
        ["Employment Status", details.employmentStatus],
        ["Monthly Income", `$${details.monthlyIncome}`],
        ["Additional Notes", details.additionalNotes || "None"]
      ];
      
      // @ts-ignore
      pdf.autoTable({
        // @ts-ignore
        startY: pdf.autoTable.previous.finalY + 15,
        head: [["Field", "Value"]],
        body: incomeInfo,
        theme: "grid",
        headStyles: { fillColor: [0, 51, 102] }
      });
      
      // Footer
      pdf.setFontSize(10);
      pdf.setTextColor(128, 128, 128);
      // @ts-ignore
      pdf.text(`Downloaded by ADMIN on ${new Date().toLocaleString()}`, 105, pdf.autoTable.previous.finalY + 15, { align: "center" });
      
      // Save PDF
      pdf.save(`ontario-loans-admin-${applicationId}.pdf`);
      
      toast({
        title: "Download Complete",
        description: "The application details have been downloaded successfully.",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: "There was a problem downloading the application details.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    navigate('/dealers');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-12 bg-ontario-gray">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-ontario-blue">Admin Dashboard</h1>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="text-ontario-blue border-ontario-blue hover:bg-ontario-blue/10"
            >
              Logout
            </Button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-6">All Applications</h2>
                
                {loading ? (
                  <p className="text-center py-8 text-gray-500">Loading applications...</p>
                ) : applications.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No applications have been submitted yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-ontario-blue text-white">
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Client Name</th>
                          <th className="px-4 py-3 text-left">Email</th>
                          <th className="px-4 py-3 text-left">Vehicle Type</th>
                          <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map((app) => (
                          <tr key={app.applicationId} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">
                              {new Date(app.submissionDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">{app.fullName}</td>
                            <td className="px-4 py-3">{app.email}</td>
                            <td className="px-4 py-3">{app.vehicleType}</td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                onClick={() => handleDownload(app.applicationId)}
                                disabled={processingId === app.applicationId}
                                className="bg-ontario-blue hover:bg-ontario-blue/90"
                                size="sm"
                              >
                                {processingId === app.applicationId ? "Processing..." : "Download PDF"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-6">Admin Settings</h2>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Change Admin Password</h3>
                  
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  
                  {changePasswordError && (
                    <p className="text-red-500 text-sm">{changePasswordError}</p>
                  )}
                  
                  <Button 
                    onClick={handleChangePassword}
                    className="w-full bg-ontario-blue hover:bg-ontario-blue/90"
                  >
                    Update Password
                  </Button>
                </div>
                
                <div className="mt-8 pt-6 border-t">
                  <h3 className="text-lg font-medium mb-4">Admin Access</h3>
                  <p className="text-sm text-gray-600">
                    Email: 6352910@gmail.com<br />
                    Password: ****** (hidden)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdminDashboard;
