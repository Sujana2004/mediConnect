import { Toaster } from 'react-hot-toast';

/**
 * Toast notification container
 * Uses react-hot-toast for notifications
 */
const Toast = () => {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        // Default options for all toasts
        duration: 4000,
        style: {
          background: '#363636',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '14px',
          maxWidth: '400px'
        },
        // Success toast
        success: {
          duration: 3000,
          style: {
            background: '#10b981',
            color: '#fff'
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#10b981'
          }
        },
        // Error toast
        error: {
          duration: 5000,
          style: {
            background: '#ef4444',
            color: '#fff'
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#ef4444'
          }
        },
        // Loading toast
        loading: {
          style: {
            background: '#3b82f6',
            color: '#fff'
          }
        }
      }}
    />
  );
};

export default Toast;