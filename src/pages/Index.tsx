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
import { useState, useEffect } from "react";
import { Zap, Database, DollarSign, ChevronDown, Check } from "lucide-react";

const Index = () => {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);

  // Add scroll animation effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Add padding-top to account for fixed header */}
      <main className="flex-grow pt-[72px]">
        {/* Hero Section - Updated with SUV image */}
        <section 
          className="bg-cover bg-center h-[600px] flex flex-col justify-center items-center text-white relative overflow-hidden"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')",
            backgroundPosition: "center"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent"></div>
          <div className="relative z-10 text-left px-4 md:px-20 w-full max-w-7xl mx-auto">
            <div className="max-w-2xl">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-lg animate-fade-in">
                Drive Today. <br />
                <span className="text-ontario-gold">Pay Later.</span>
              </h1>
              <p className="text-xl md:text-2xl mb-8 max-w-2xl drop-shadow-md font-light animate-fade-in" style={{ animationDelay: "0.2s" }}>
                Auto loans made easy across Ontario and Quebec – <br />get approved in <span className="font-semibold">minutes</span>.
              </p>
              <Button asChild size="lg" className="bg-ontario-gold hover:bg-ontario-gold/90 text-ontario-blue font-bold text-lg px-8 py-6 shadow-xl animate-fade-in hover:scale-105 transition-all" style={{ animationDelay: "0.4s" }}>
                <Link to="/apply">Apply Now</Link>
              </Button>
              <p className="mt-4 text-sm max-w-md animate-fade-in" style={{ animationDelay: "0.6s" }}>
                By clicking Apply, you agree to our{" "}
                <Link to="/terms" className="underline hover:text-ontario-gold transition-colors">Terms and Conditions</Link>{" "}
                and{" "}
                <Link to="/privacy" className="underline hover:text-ontario-gold transition-colors">Privacy Policy</Link>.
              </p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 flex justify-center">
            <ChevronDown className="animate-bounce text-white h-12 w-12 mb-4" />
          </div>
        </section>

        {/* Features - remain the same, green icon hover effect already implemented */}
        <section className="py-24 bg-gradient-to-b from-ontario-gray to-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-ontario-blue">Why Choose Ontario Loans?</h2>
            <p className="text-center text-lg text-gray-600 mb-16 max-w-2xl mx-auto">We offer the best auto financing solutions in Ontario with personalized options for every credit situation.</p>
            <div className="grid md:grid-cols-3 gap-10">
              <div 
                className="bg-white p-8 rounded-xl shadow-lg text-center transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
                onMouseEnter={() => setHoveredFeature('approvals')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="w-20 h-20 bg-ontario-blue rounded-full flex items-center justify-center mx-auto mb-6 transition-all duration-300 transform hover:scale-110">
                  <Zap 
                    className="h-10 w-10" 
                    color={hoveredFeature === 'approvals' ? '#22c55e' : 'white'} 
                  />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-ontario-blue">Fast Approvals</h3>
                <p className="text-gray-600 leading-relaxed">Get approved in minutes, not days. Our streamlined process makes financing quick and easy, even with challenging credit situations.</p>
              </div>
              <div 
                className="bg-white p-8 rounded-xl shadow-lg text-center transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
                onMouseEnter={() => setHoveredFeature('inventory')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="w-20 h-20 bg-ontario-blue rounded-full flex items-center justify-center mx-auto mb-6 transition-all duration-300 transform hover:scale-110">
                  <Database 
                    className="h-10 w-10" 
                    color={hoveredFeature === 'inventory' ? '#22c55e' : 'white'} 
                  />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-ontario-blue">Massive Inventory</h3>
                <p className="text-gray-600 leading-relaxed">Access to hundreds of vehicles across Ontario and Quebec. Find your perfect match from our extensive network of dealer partners.</p>
              </div>
              <div 
                className="bg-white p-8 rounded-xl shadow-lg text-center transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
                onMouseEnter={() => setHoveredFeature('options')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="w-20 h-20 bg-ontario-blue rounded-full flex items-center justify-center mx-auto mb-6 transition-all duration-300 transform hover:scale-110">
                  <DollarSign 
                    className="h-10 w-10" 
                    color={hoveredFeature === 'options' ? '#22c55e' : 'white'} 
                  />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-ontario-blue">Flexible Options</h3>
                <p className="text-gray-600 leading-relaxed">Solutions for all credit types with competitive rates and flexible terms. We tailor financing to fit your unique financial situation.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Banner - NEW Section */}
        <section className="bg-ontario-blue py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap md:flex-nowrap justify-center md:justify-between items-center gap-8">
              {/* Hassle-Free */}
              <div 
                className="flex items-center gap-4 benefit-item"
                onMouseEnter={() => setHoveredFeature('hassle-free')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                  <Check 
                    className="h-8 w-8 check-icon transition-colors" 
                    color={hoveredFeature === 'hassle-free' ? '#22c55e' : '#003366'}
                  />
                </div>
                <div className="text-white">
                  <h3 className="font-bold text-lg">Hassle-Free</h3>
                  <p className="text-sm text-white/80">Apply Online</p>
                </div>
              </div>

              {/* Low Rates */}
              <div 
                className="flex items-center gap-4 benefit-item"
                onMouseEnter={() => setHoveredFeature('low-rates')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                  <Check 
                    className="h-8 w-8 check-icon transition-colors" 
                    color={hoveredFeature === 'low-rates' ? '#22c55e' : '#003366'}
                  />
                </div>
                <div className="text-white">
                  <h3 className="font-bold text-lg">Low Rates</h3>
                  <p className="text-sm text-white/80">Starting at Prime Rate</p>
                </div>
              </div>

              {/* Quick Approval */}
              <div 
                className="flex items-center gap-4 benefit-item"
                onMouseEnter={() => setHoveredFeature('quick-approval')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                  <Check 
                    className="h-8 w-8 check-icon transition-colors" 
                    color={hoveredFeature === 'quick-approval' ? '#22c55e' : '#003366'}
                  />
                </div>
                <div className="text-white">
                  <h3 className="font-bold text-lg">Quick Approval</h3>
                  <p className="text-sm text-white/80">1 - 2 days</p>
                </div>
              </div>

              {/* Online Funding */}
              <div 
                className="flex items-center gap-4 benefit-item"
                onMouseEnter={() => setHoveredFeature('online-funding')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                  <Check 
                    className="h-8 w-8 check-icon transition-colors" 
                    color={hoveredFeature === 'online-funding' ? '#22c55e' : '#003366'}
                  />
                </div>
                <div className="text-white">
                  <h3 className="font-bold text-lg">Online Funding</h3>
                  <p className="text-sm text-white/80">Easy process</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Inventory Section - UPDATED with new hover effects */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-ontario-blue mb-2">Our Inventory</h2>
            <p className="text-center text-lg text-gray-600 mb-12 max-w-2xl mx-auto">We have access to hundreds of vehicles to get what you want!</p>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Cars & Trucks - UPDATED with new image and hover effects */}
              <Link to="/apply" className="block">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                  <div className="relative h-64">
                    <img 
                      src="/lovable-uploads/41d274f6-4bbd-4503-b5e9-79815d29dc10.png" 
                      alt="Cars and Trucks" 
                      className="w-full h-full object-cover transition-transform duration-300"
                    />
                    <div className="absolute bottom-0 left-0 bg-ontario-blue text-white py-2 px-4 font-bold">
                      Cars & Trucks
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-600 mb-4">We have a wide selection of cars and trucks available to meet your needs</p>
                    <Link to="/apply" className="text-ontario-blue font-bold flex items-center gap-2 hover:text-green-600 transition-colors">
                      Apply Now
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </Link>
                  </div>
                </div>
              </Link>

              {/* SUVs & Vans - Updated with hover effects */}
              <Link to="/apply" className="block">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                  <div className="relative h-64">
                    <img 
                      src="/lovable-uploads/ecbb9704-2a41-43f9-aaef-3fb1aff73de6.png" 
                      alt="SUVs and Vans" 
                      className="w-full h-full object-cover transition-transform duration-300"
                    />
                    <div className="absolute bottom-0 left-0 bg-ontario-blue text-white py-2 px-4 font-bold">
                      SUVs & Vans
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-600 mb-4">We have minivans and SUVs to keep your family safe and comfortable</p>
                    <Link to="/apply" className="text-ontario-blue font-bold flex items-center gap-2 hover:text-green-600 transition-colors">
                      Apply Now
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </Link>
                  </div>
                </div>
              </Link>

              {/* Fleet Vehicles - Updated with hover effects */}
              <Link to="/apply" className="block">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                  <div className="relative h-64">
                    <img 
                      src="/lovable-uploads/21a8348c-fe26-40bc-bc75-304640b6c467.png" 
                      alt="Fleet Vehicles" 
                      className="w-full h-full object-cover transition-transform duration-300"
                    />
                    <div className="absolute bottom-0 left-0 bg-ontario-blue text-white py-2 px-4 font-bold">
                      Fleet Vehicles
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-600 mb-4">We have a selection of fleet vehicles as well - let us know what you need</p>
                    <Link to="/apply" className="text-ontario-blue font-bold flex items-center gap-2 hover:text-green-600 transition-colors">
                      Apply Now
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </Link>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-ontario-blue">Frequently Asked Questions</h2>
              <p className="text-center text-lg text-gray-600 mb-16 max-w-2xl mx-auto">Everything you need to know about our auto financing solutions.</p>
              
              <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 md:p-10">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1" className="border-b border-gray-200">
                    <AccordionTrigger className="text-left font-semibold text-lg py-4 hover:text-ontario-blue transition-colors">Do I need good credit to get approved?</AccordionTrigger>
                    <AccordionContent className="text-gray-600 pb-6 pt-2">
                      No, you don't need perfect credit. We work with borrowers of all credit backgrounds, from excellent to challenged credit situations. Our lenders specialize in finding solutions regardless of your credit history.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2" className="border-b border-gray-200">
                    <AccordionTrigger className="text-left font-semibold text-lg py-4 hover:text-ontario-blue transition-colors">How long does the application process take?</AccordionTrigger>
                    <AccordionContent className="text-gray-600 pb-6 pt-2">
                      Our application process is quick and efficient. Most applicants receive a decision within 24 hours of submitting a complete application. In many cases, you can get approved within minutes.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3" className="border-b border-gray-200">
                    <AccordionTrigger className="text-left font-semibold text-lg py-4 hover:text-ontario-blue transition-colors">What types of vehicles are available?</AccordionTrigger>
                    <AccordionContent className="text-gray-600 pb-6 pt-2">
                      We have access to hundreds of vehicles including cars, SUVs, trucks, and vans across Ontario and Quebec. Whether you want new or pre-owned, we can help you find the perfect vehicle that fits both your needs and budget.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-4" className="border-b border-gray-200">
                    <AccordionTrigger className="text-left font-semibold text-lg py-4 hover:text-ontario-blue transition-colors">Can I apply if I'm self-employed?</AccordionTrigger>
                    <AccordionContent className="text-gray-600 pb-6 pt-2">
                      Yes! We have lending solutions for self-employed individuals. Our application process takes into account your specific financial situation and we work with lenders who understand the unique needs of entrepreneurs.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-5" className="border-b border-gray-200">
                    <AccordionTrigger className="text-left font-semibold text-lg py-4 hover:text-ontario-blue transition-colors">Is there a fee to apply?</AccordionTrigger>
                    <AccordionContent className="text-gray-600 pb-6 pt-2">
                      No, applying for an auto loan with Ontario Loans is completely free. There are no application fees or obligations. You can apply with confidence knowing there are no hidden charges.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-ontario-blue text-white text-center">
          <div className="container mx-auto px-4 relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Drive Your Dream Car?</h2>
            <p className="text-xl mb-10 max-w-2xl mx-auto">
              Apply now and get matched with the perfect vehicle and financing option.
            </p>
            <div className="flex justify-center items-center">
              <Button asChild size="lg" className="bg-ontario-gold hover:bg-ontario-gold/90 text-ontario-blue font-bold text-lg px-8 py-6 hover:scale-105 transition-all">
                <Link to="/apply">Apply Now</Link>
              </Button>
            </div>
            <p className="mt-8 text-sm max-w-md mx-auto opacity-80">
              By clicking Apply, you agree to our{" "}
              <Link to="/terms" className="underline hover:text-ontario-gold transition-colors">Terms and Conditions</Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline hover:text-ontario-gold transition-colors">Privacy Policy</Link>.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
