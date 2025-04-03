
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-8 text-ontario-blue">Terms and Conditions</h1>
        
        <div className="prose max-w-none">
          <p className="mb-4">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
          <p className="mb-4">
            Welcome to Ontario Loans. By accessing or using our services, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use our services.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">2. Services Description</h2>
          <p className="mb-4">
            Ontario Loans provides auto loan brokerage services for residents of Ontario and Quebec. We connect borrowers with potential lenders and dealerships but do not directly provide loans or financing.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">3. Application Process</h2>
          <p className="mb-4">
            By submitting an application through our website, you authorize Ontario Loans to:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li className="mb-2">Collect and store your personal information</li>
            <li className="mb-2">Share your information with potential lenders and dealerships</li>
            <li className="mb-2">Conduct credit checks as necessary</li>
            <li className="mb-2">Contact you regarding your application</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">4. Privacy</h2>
          <p className="mb-4">
            Your privacy is important to us. Please review our <a href="/privacy" className="text-ontario-blue hover:underline">Privacy Policy</a> to understand how we collect, use, and protect your information.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">5. Accuracy of Information</h2>
          <p className="mb-4">
            You are responsible for providing accurate and complete information in your application. Providing false or misleading information may result in the rejection of your application and potential legal consequences.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">6. No Guarantee of Approval</h2>
          <p className="mb-4">
            Submitting an application does not guarantee approval for a loan. Final lending decisions are made by our partner lenders based on their individual criteria.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">7. Limitation of Liability</h2>
          <p className="mb-4">
            Ontario Loans is not responsible for any damages or losses resulting from:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li className="mb-2">Rejection of your loan application</li>
            <li className="mb-2">Terms offered by lenders or dealerships</li>
            <li className="mb-2">Issues with vehicles purchased through our partners</li>
            <li className="mb-2">Unauthorized access to your personal information</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">8. Modification of Terms</h2>
          <p className="mb-4">
            We reserve the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon posting on our website.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">9. Governing Law</h2>
          <p className="mb-4">
            These Terms and Conditions are governed by the laws of the Province of Ontario, without regard to its conflict of law provisions.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">10. Contact Information</h2>
          <p className="mb-4">
            If you have any questions about these Terms and Conditions, please contact us through our website.
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Terms;
