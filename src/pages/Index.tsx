
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useState } from "react";
import { Zap, Database, DollarSign } from "lucide-react";

const Index = () => {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section 
          className="bg-cover bg-center h-[500px] flex flex-col justify-center items-center text-white relative"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')",
            backgroundPosition: "center"
          }}
        >
          <div className="absolute inset-0 bg-black/60"></div>
          <div className="relative z-10 text-center px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">Drive Today. Pay Later.</h1>
            <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto drop-shadow-md">
              Auto loans made easy across Ontario and Quebec – get approved in minutes.
            </p>
            <Button asChild size="lg" className="bg-ontario-gold hover:bg-ontario-gold/90 text-ontario-blue font-bold text-lg px-8 py-6">
              <Link to="/apply">Apply Now</Link>
            </Button>
            <p className="mt-4 text-sm max-w-md mx-auto">
              By clicking Apply, you agree to our{" "}
              <Link to="/terms" className="underline hover:text-ontario-gold">Terms and Conditions</Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline hover:text-ontario-gold">Privacy Policy</Link>.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 bg-ontario-gray">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-ontario-blue">Why Choose Ontario Loans?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div 
                className="bg-white p-6 rounded-lg shadow-md text-center"
                onMouseEnter={() => setHoveredFeature('approvals')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="w-16 h-16 bg-ontario-blue rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300">
                  <Zap 
                    className="h-8 w-8" 
                    color={hoveredFeature === 'approvals' ? '#22c55e' : 'white'} 
                  />
                </div>
                <h3 className="text-xl font-semibold mb-2">Fast Approvals</h3>
                <p className="text-gray-600">Get approved in minutes, not days. Our streamlined process makes it quick and easy.</p>
              </div>
              <div 
                className="bg-white p-6 rounded-lg shadow-md text-center"
                onMouseEnter={() => setHoveredFeature('inventory')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="w-16 h-16 bg-ontario-blue rounded-full flex items-center justify-center mx-auto mb-4">
                  <Database 
                    className="h-8 w-8" 
                    color={hoveredFeature === 'inventory' ? '#22c55e' : 'white'} 
                  />
                </div>
                <h3 className="text-xl font-semibold mb-2">Massive Inventory</h3>
                <p className="text-gray-600">Access to hundreds of vehicles across Ontario and Quebec to find your perfect match.</p>
              </div>
              <div 
                className="bg-white p-6 rounded-lg shadow-md text-center"
                onMouseEnter={() => setHoveredFeature('options')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="w-16 h-16 bg-ontario-blue rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign 
                    className="h-8 w-8" 
                    color={hoveredFeature === 'options' ? '#22c55e' : 'white'} 
                  />
                </div>
                <h3 className="text-xl font-semibold mb-2">Flexible Options</h3>
                <p className="text-gray-600">Solutions for all credit types with competitive rates and flexible terms.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-ontario-blue">Frequently Asked Questions</h2>
            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-left font-semibold">Do I need good credit to get approved?</AccordionTrigger>
                  <AccordionContent>
                    No, you don't need perfect credit. We work with borrowers of all credit backgrounds, from excellent to challenged credit situations.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-left font-semibold">How long does the application process take?</AccordionTrigger>
                  <AccordionContent>
                    Our application process is quick and efficient. Most applicants receive a decision within 24 hours of submitting a complete application.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-left font-semibold">What types of vehicles are available?</AccordionTrigger>
                  <AccordionContent>
                    We have access to hundreds of vehicles including cars, SUVs, trucks, and vans across Ontario and Quebec. Whether you want new or pre-owned, we can help you find the perfect vehicle.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger className="text-left font-semibold">Can I apply if I'm self-employed?</AccordionTrigger>
                  <AccordionContent>
                    Yes! We have lending solutions for self-employed individuals. Our application process takes into account your specific financial situation.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                  <AccordionTrigger className="text-left font-semibold">Is there a fee to apply?</AccordionTrigger>
                  <AccordionContent>
                    No, applying for an auto loan with Ontario Loans is completely free. There are no application fees or obligations.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-ontario-blue text-white text-center">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-6">Ready to Drive Your Dream Car?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Apply now and get matched with the perfect vehicle and financing option.
            </p>
            <Button asChild size="lg" className="bg-ontario-gold hover:bg-ontario-gold/90 text-ontario-blue font-bold text-lg px-8 py-6">
              <Link to="/apply">Apply Now</Link>
            </Button>
            <p className="mt-4 text-sm max-w-md mx-auto">
              By clicking Apply, you agree to our{" "}
              <Link to="/terms" className="underline hover:text-ontario-gold">Terms and Conditions</Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline hover:text-ontario-gold">Privacy Policy</Link>.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
