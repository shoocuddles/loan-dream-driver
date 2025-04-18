import React, { useState, useEffect } from 'react';
import { Progress } from "@/components/ui/progress";

interface LoadingPageProps {
  onLoadComplete: () => void;
}

const LoadingPage = ({ onLoadComplete }: LoadingPageProps) => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 4;
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onLoadComplete();
          }, 500);
          return 100;
        }
        return newProgress;
      });
    }, 250);
    
    return () => clearInterval(interval);
  }, [onLoadComplete]);
  
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-ontario-blue to-blue-900 flex flex-col items-center justify-center z-50">
      <div className="w-full max-w-md animate-fade-in flex flex-col items-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6 shadow-2xl border border-white/20">
          <img 
            src="/lovable-uploads/06403d44-3c3b-4d15-9e8d-a397fdfb1c97.png" 
            alt="Ontario Loans Logo" 
            className="h-28 w-auto invert animate-pulse duration-1000"
          />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight drop-shadow-lg">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-ontario-gold">
            Ontario Loans
          </span>
        </h1>
        
        <p className="text-xl text-ontario-gold mb-12 text-center font-semibold drop-shadow-md">
          Where Dealers and Clients Make the <span className="bg-ontario-gold text-ontario-blue px-2 py-0.5 rounded">BEST</span> Deals!
        </p>
        
        <div className="w-full max-w-md bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 shadow-lg">
          <Progress 
            value={progress} 
            className="h-3 bg-white/20" 
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 100%)',
            }}
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-white/80 text-sm font-medium">Loading your best deal...</p>
            <p className="text-white font-bold">{progress}%</p>
          </div>
        </div>
        

      </div>
    </div>
  );
};

export default LoadingPage;
