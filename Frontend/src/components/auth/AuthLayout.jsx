import React from 'react';

/**
 * Web layout for auth flow: centered card on a neutral background.
 */
export default function AuthLayout({ children, fullWidth }) {
  const maxWidth = fullWidth ? 'max-w-2xl' : 'max-w-md';
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className={`w-full ${maxWidth} bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]`}>
        {children}
      </div>
    </div>
  );
}
