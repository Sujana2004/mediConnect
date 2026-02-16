import PropTypes from 'prop-types';

/**
 * Badge component for status indicators and labels
 */
const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  removable = false,
  onRemove,
  className = '',
  ...props
}) => {
  // Variant styles
  const variantStyles = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-primary-100 text-primary-800',
    secondary: 'bg-secondary-100 text-secondary-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    pink: 'bg-pink-100 text-pink-800',
    // Outline variants
    outlinePrimary: 'border border-primary-500 text-primary-600 bg-transparent',
    outlineSuccess: 'border border-green-500 text-green-600 bg-transparent',
    outlineWarning: 'border border-amber-500 text-amber-600 bg-transparent',
    outlineDanger: 'border border-red-500 text-red-600 bg-transparent',
    // Solid variants
    solidPrimary: 'bg-primary-600 text-white',
    solidSuccess: 'bg-green-600 text-white',
    solidWarning: 'bg-amber-500 text-white',
    solidDanger: 'bg-red-600 text-white'
  };

  // Dot colors
  const dotColors = {
    default: 'bg-gray-500',
    primary: 'bg-primary-500',
    secondary: 'bg-secondary-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500'
  };

  // Size styles
  const sizeStyles = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  // Dot sizes
  const dotSizes = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5'
  };

  // Extract base variant for dot color
  const baseVariant = variant.replace('outline', '').replace('solid', '').toLowerCase() || 'default';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full
        ${variantStyles[variant] || variantStyles.default}
        ${sizeStyles[size] || sizeStyles.md}
        ${className}
      `}
      {...props}
    >
      {dot && (
        <span 
          className={`
            ${dotSizes[size] || dotSizes.md}
            ${dotColors[baseVariant] || dotColors.default}
            rounded-full flex-shrink-0
          `}
        />
      )}
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="
            ml-0.5 -mr-1 h-4 w-4 rounded-full
            inline-flex items-center justify-center
            hover:bg-black/10 focus:outline-none
            transition-colors
          "
          aria-label="Remove"
        >
          <svg 
            className="h-3 w-3" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
              clipRule="evenodd" 
            />
          </svg>
        </button>
      )}
    </span>
  );
};

// Status Badge (predefined status variants)
Badge.Status = ({ status, className = '', ...props }) => {
  const statusConfig = {
    // Appointment statuses
    pending: { variant: 'warning', label: 'Pending', dot: true },
    confirmed: { variant: 'info', label: 'Confirmed', dot: true },
    checked_in: { variant: 'purple', label: 'Checked In', dot: true },
    in_progress: { variant: 'primary', label: 'In Progress', dot: true },
    completed: { variant: 'success', label: 'Completed', dot: true },
    cancelled: { variant: 'danger', label: 'Cancelled', dot: true },
    no_show: { variant: 'default', label: 'No Show', dot: true },
    rescheduled: { variant: 'info', label: 'Rescheduled', dot: true },
    // User statuses
    online: { variant: 'success', label: 'Online', dot: true },
    offline: { variant: 'default', label: 'Offline', dot: true },
    busy: { variant: 'danger', label: 'Busy', dot: true },
    away: { variant: 'warning', label: 'Away', dot: true },
    // Verification statuses
    verified: { variant: 'success', label: 'Verified' },
    unverified: { variant: 'warning', label: 'Unverified' },
    rejected: { variant: 'danger', label: 'Rejected' },
    // Generic
    active: { variant: 'success', label: 'Active', dot: true },
    inactive: { variant: 'default', label: 'Inactive', dot: true },
    // Medicine reminder
    taken: { variant: 'success', label: 'Taken' },
    skipped: { variant: 'warning', label: 'Skipped' },
    missed: { variant: 'danger', label: 'Missed' }
  };

  const config = statusConfig[status] || { variant: 'default', label: status };

  return (
    <Badge 
      variant={config.variant} 
      dot={config.dot}
      className={className}
      {...props}
    >
      {config.label}
    </Badge>
  );
};

// Notification Badge (count)
Badge.Count = ({ 
  count = 0, 
  max = 99,
  showZero = false,
  className = '' 
}) => {
  if (!showZero && count === 0) return null;

  const displayCount = count > max ? `${max}+` : count;

  return (
    <span 
      className={`
        inline-flex items-center justify-center
        min-w-[1.25rem] h-5 px-1.5 rounded-full
        bg-red-500 text-white text-xs font-medium
        ${className}
      `}
    >
      {displayCount}
    </span>
  );
};

Badge.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf([
    'default', 'primary', 'secondary', 'success', 'warning', 'danger', 
    'info', 'purple', 'pink',
    'outlinePrimary', 'outlineSuccess', 'outlineWarning', 'outlineDanger',
    'solidPrimary', 'solidSuccess', 'solidWarning', 'solidDanger'
  ]),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  dot: PropTypes.bool,
  removable: PropTypes.bool,
  onRemove: PropTypes.func,
  className: PropTypes.string
};

Badge.Status.propTypes = {
  status: PropTypes.string.isRequired,
  className: PropTypes.string
};

Badge.Count.propTypes = {
  count: PropTypes.number,
  max: PropTypes.number,
  showZero: PropTypes.bool,
  className: PropTypes.string
};

export default Badge;