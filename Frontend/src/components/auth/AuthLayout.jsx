import React from 'react';
import PropTypes from 'prop-types';

/**
 * Web layout for auth flow: centered card on a neutral background.
 */
export default function AuthLayout({ children, fullWidth = false, className = '' }) {
  const maxWidth = fullWidth ? 'max-w-2xl' : 'max-w-md';
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <main
        role="main"
        aria-label="Authentication"
        className={`
          w-full ${maxWidth} 
          bg-white rounded-2xl shadow-xl 
          overflow-hidden flex flex-col 
          max-h-[90vh]
          ${className}
        `.trim()}
      >
        {children}
      </main>
    </div>
  );
}

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
};