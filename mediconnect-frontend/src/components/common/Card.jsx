import PropTypes from 'prop-types';

/**
 * Reusable Card component
 */
const Card = ({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  onClick,
  className = '',
  ...props
}) => {
  // Variant styles
  const variantStyles = {
    default: 'bg-white border border-gray-100 shadow-sm',
    outlined: 'bg-white border-2 border-gray-200',
    elevated: 'bg-white shadow-md',
    flat: 'bg-gray-50',
    primary: 'bg-primary-50 border border-primary-100',
    success: 'bg-green-50 border border-green-100',
    warning: 'bg-amber-50 border border-amber-100',
    danger: 'bg-red-50 border border-red-100'
  };

  // Padding styles
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  };

  // Hover styles
  const hoverStyles = hover
    ? 'cursor-pointer hover:shadow-md hover:border-primary-200 transition-all duration-200'
    : '';

  // Clickable styles
  const clickableStyles = onClick
    ? 'cursor-pointer active:scale-[0.99] transition-transform'
    : '';

  return (
    <div
      className={`
        rounded-xl
        ${variantStyles[variant] || variantStyles.default}
        ${paddingStyles[padding] || paddingStyles.md}
        ${hoverStyles}
        ${clickableStyles}
        ${className}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick(e) : undefined}
      {...props}
    >
      {children}
    </div>
  );
};

// Card Header
Card.Header = ({ children, className = '', ...props }) => (
  <div 
    className={`border-b border-gray-100 pb-4 mb-4 ${className}`}
    {...props}
  >
    {children}
  </div>
);

// Card Title
Card.Title = ({ children, className = '', ...props }) => (
  <h3 
    className={`text-lg font-semibold text-gray-900 ${className}`}
    {...props}
  >
    {children}
  </h3>
);

// Card Subtitle
Card.Subtitle = ({ children, className = '', ...props }) => (
  <p 
    className={`text-sm text-gray-500 mt-1 ${className}`}
    {...props}
  >
    {children}
  </p>
);

// Card Body
Card.Body = ({ children, className = '', ...props }) => (
  <div className={className} {...props}>
    {children}
  </div>
);

// Card Footer
Card.Footer = ({ children, className = '', ...props }) => (
  <div 
    className={`border-t border-gray-100 pt-4 mt-4 ${className}`}
    {...props}
  >
    {children}
  </div>
);

Card.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf([
    'default', 'outlined', 'elevated', 'flat',
    'primary', 'success', 'warning', 'danger'
  ]),
  padding: PropTypes.oneOf(['none', 'sm', 'md', 'lg', 'xl']),
  hover: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string
};

Card.Header.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};

Card.Title.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};

Card.Subtitle.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};

Card.Body.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};

Card.Footer.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};

export default Card;