
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-8 text-ontario-blue">Privacy Policy</h1>
        
        <div className="prose max-w-none">
          <p className="mb-4">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">1. Introduction</h2>
          <p className="mb-4">
            At Ontario Loans, we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">2. Information We Collect</h2>
          <p className="mb-4">We collect the following types of information:</p>
          <ul className="list-disc pl-6 mb-4">
            <li className="mb-2">
              <strong>Personal Information:</strong> Name, address, phone number, email address
            </li>
            <li className="mb-2">
              <strong>Financial Information:</strong> Employment status, income, current loan details
            </li>
            <li className="mb-2">
              <strong>Vehicle Preferences:</strong> Vehicle type, features, color preferences
            </li>
            <li className="mb-2">
              <strong>Technical Information:</strong> IP address, browser type, device information
            </li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">3. How We Use Your Information</h2>
          <p className="mb-4">We use your information to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li className="mb-2">Process and evaluate your loan application</li>
            <li className="mb-2">Connect you with appropriate lenders and dealerships</li>
            <li className="mb-2">Communicate with you about your application</li>
            <li className="mb-2">Improve our services and user experience</li>
            <li className="mb-2">Comply with legal obligations</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">4. Information Sharing</h2>
          <p className="mb-4">
            We may share your information with:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li className="mb-2">Lenders and financial institutions</li>
            <li className="mb-2">Vehicle dealerships</li>
            <li className="mb-2">Service providers who assist in our operations</li>
            <li className="mb-2">Legal authorities when required by law</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">5. Data Security</h2>
          <p className="mb-4">
            We implement appropriate security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">6. Your Rights</h2>
          <p className="mb-4">
            You have the right to:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li className="mb-2">Access the personal information we hold about you</li>
            <li className="mb-2">Correct inaccurate information</li>
            <li className="mb-2">Request deletion of your data (subject to legal requirements)</li>
            <li className="mb-2">Opt-out of certain data collection and use</li>
          </ul>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">7. Cookies and Tracking</h2>
          <p className="mb-4">
            We use cookies and similar tracking technologies to enhance your experience on our website. You can adjust your browser settings to refuse cookies, but this may limit some functionality.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">8. Children's Privacy</h2>
          <p className="mb-4">
            Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">9. Changes to This Policy</h2>
          <p className="mb-4">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.
          </p>
          
          <h2 className="text-xl font-semibold mt-6 mb-3">10. Contact Us</h2>
          <p className="mb-4">
            If you have any questions about this Privacy Policy, please contact us through our website.
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Privacy;
