import React from 'react';
import { Loader } from 'lucide-react';

const LoadingSpinner = ({ fullScreen = false, message = 'Loading...' }) => {
  const spinner = (
    <div className="flex flex-col items-center justify-center">
      <Loader className="animate-spin text-teal mb-2" size={40} />
      <p className="text-ocean/70">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-cream via-peach to-pink-soft flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;