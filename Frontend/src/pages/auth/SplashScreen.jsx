import React, { useEffect } from 'react';

export default function SplashScreen({ onComplete }) {
  useEffect(() => {
    const t = setTimeout(() => onComplete(), 2000);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="flex flex-col items-center gap-6">
        <div className="w-24 h-24 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg animate-pulse">
          <span className="text-5xl">🏥</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">MediConnect</h1>
        <p className="text-gray-600 text-sm">Your Health, Our Priority</p>
        <div className="flex gap-1 mt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        <p className="text-gray-400 text-xs mt-8">Version 2.0.0</p>
      </div>
    </div>
  );
}
