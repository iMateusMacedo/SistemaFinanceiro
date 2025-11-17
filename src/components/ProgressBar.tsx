'use client';

import React, { useState, useEffect } from 'react';

interface ProgressBarProps {
  duration?: number; // Duration in milliseconds for the progress to complete
}

const ProgressBar: React.FC<ProgressBarProps> = ({ duration = 2000 }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (elapsed < duration) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);

    return () => {
      // Cleanup if component unmounts before completion
      start = null;
    };
  }, [duration]);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex flex-col items-center justify-center z-50">
      <div className="w-64 h-4 bg-gray-700 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-white text-lg font-semibold">{Math.round(progress)}%</p>
    </div>
  );
};

export default ProgressBar;
