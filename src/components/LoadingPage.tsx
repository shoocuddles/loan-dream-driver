
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
        const newProgress = prev + 5;
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onLoadComplete();
          }, 500); // Small delay after reaching 100%
          return 100;
        }
        return newProgress;
      });
    }, 250); // Updates every 250ms to complete in ~5 seconds
    
    return () => clearInterval(interval);
  }, [onLoadComplete]);
  
  return (
    <div className="fixed inset-0 bg-ontario-blue flex flex-col items-center justify-center z-50">
      <div className="animate-fade-in flex flex-col items-center">
        <div className="bg-white/10 rounded-full p-6 mb-6 shadow-2xl">
          <img src="/logo.png" alt="Ontario Loans Logo" className="h-24 w-auto animate-pulse" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Ontario Loans</h1>
        <p className="text-xl text-ontario-gold mb-12 text-center">
          Where Dealers and Clients Make the BEST Deals!
        </p>
        
        <div className="w-full max-w-md px-4">
          <Progress value={progress} className="h-3 bg-white/20" />
          <p className="text-white/80 text-sm mt-2 text-center">Loading your best deal... {progress}%</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingPage;
