import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getApplicationsList, getApplicationDetails, recordDownload, signOutDealer, supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import "jspdf-autotable";

const DealerDashboard = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          navigate('/dealers');
          return;
        }
        
        loadApplications();
      } catch (error) {
        console.error("Auth check error:", error);
        navigate('/dealers');
      }
    };
    
    checkAuth();
  }, [navigate]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const appList = await getApplicationsList();
      setApplications(appList);
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

  const handleDownload = async (applicationId: string) => {
    try {
      setProcessingId(applicationId);
      
      // 1. Process payment (simplified for this demo)
      const paymentAmount = 10.99; // Example price per download
      
      // 2. Get application details
      const details = await getApplicationDetails(applicationId);
      
      // 3. Record the download
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("User not found");
      
      await recordDownload(applicationId, user.data.user.id, paymentAmount);
      
      // 4. Generate PDF
      const pdf = new jsPDF();
      
      // Add header
      pdf.setFontSize(20);
      pdf.setTextColor(0, 51, 102); // Ontario blue
      pdf.text("Ontario Loans - Application Details", 105, 15, { align: "center" });
      
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
      pdf.text(`Downloaded by dealer on ${new Date().toLocaleString()}`, 105, pdf.autoTable.previous.finalY + 15, { align: "center" });
      
      // Save PDF
      pdf.save(`ontario-loans-application-${applicationId}.pdf`);
      
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

  const handleLogout = async () => {
    try {
      await signOutDealer();
      navigate('/dealers');
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Failed",
        description: "There was a problem logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-12 bg-ontario-gray">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-ontario-blue">Dealer Dashboard</h1>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="text-ontario-blue border-ontario-blue hover:bg-ontario-blue/10"
            >
              Logout
            </Button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-6">Available Loan Applications</h2>
            
            {loading ? (
              <p className="text-center py-8 text-gray-500">Loading applications...</p>
            ) : applications.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No applications are currently available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-ontario-blue text-white">
                      <th className="px-4 py-3 text-left">Submission Date</th>
                      <th className="px-4 py-3 text-left">Client</th>
                      <th className="px-4 py-3 text-left">Application ID</th>
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
                        <td className="px-4 py-3">{app.applicationId}</td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            onClick={() => handleDownload(app.applicationId)}
                            disabled={processingId === app.applicationId}
                            className="bg-ontario-blue hover:bg-ontario-blue/90"
                            size="sm"
                          >
                            {processingId === app.applicationId ? "Processing..." : "Download PDF ($10.99)"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="mt-6">
              <p className="text-sm text-gray-500">
                Note: You will be charged $10.99 for each application download. This provides you with full client details and contact information.
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default DealerDashboard;
