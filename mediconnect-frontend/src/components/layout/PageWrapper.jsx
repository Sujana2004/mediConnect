import PropTypes from 'prop-types';
import { Loader } from '../common';

/**
 * Page wrapper component with common padding and loading state
 */
const PageWrapper = ({
  children,
  loading = false,
  loadingType = 'default',
  padding = 'default',
  maxWidth = 'full',
  className = ''
}) => {
  // Padding styles
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    default: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  };

  // Max width styles
  const maxWidthStyles = {
    sm: 'max-w-screen-sm mx-auto',
    md: 'max-w-screen-md mx-auto',
    lg: 'max-w-screen-lg mx-auto',
    xl: 'max-w-screen-xl mx-auto',
    '2xl': 'max-w-screen-2xl mx-auto',
    full: ''
  };

  if (loading) {
    return (
      <div className={`${paddingStyles[padding]} ${className}`}>
        <Loader.Page type={loadingType} />
      </div>
    );
  }

  return (
    <div 
      className={`
        ${paddingStyles[padding]}
        ${maxWidthStyles[maxWidth]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

PageWrapper.propTypes = {
  children: PropTypes.node,
  loading: PropTypes.bool,
  loadingType: PropTypes.oneOf(['default', 'list', 'card', 'detail']),
  padding: PropTypes.oneOf(['none', 'sm', 'default', 'lg', 'xl']),
  maxWidth: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', '2xl', 'full']),
  className: PropTypes.string
};

export default PageWrapper;