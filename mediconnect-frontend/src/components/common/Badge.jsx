import PropTypes from 'prop-types';

/**
 * Badge component for status indicators and labels
 * Enhanced with modern UI design
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
  // Enhanced variant styles with gradients and better contrast
  const variantStyles = {
    default: 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 shadow-sm',
    primary: 'bg-gradient-to-br from-primary-100 to-primary-200 text-primary-900 shadow-sm shadow-primary-200/50',
    secondary: 'bg-gradient-to-br from-secondary-100 to-secondary-200 text-secondary-900 shadow-sm',
    success: 'bg-gradient-to-br from-green-100 to-green-200 text-green-900 shadow-sm shadow-green-200/50',
    warning: 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 shadow-sm shadow-amber-200/50',
    danger: 'bg-gradient-to-br from-red-100 to-red-200 text-red-900 shadow-sm shadow-red-200/50',
    info: 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-900 shadow-sm shadow-blue-200/50',
    purple: 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-900 shadow-sm shadow-purple-200/50',
    pink: 'bg-gradient-to-br from-pink-100 to-pink-200 text-pink-900 shadow-sm shadow-pink-200/50',
    
    // Outline variants with hover effects
    outlinePrimary: 'border-2 border-primary-500 text-primary-700 bg-white hover:bg-primary-50 transition-colors',
    outlineSuccess: 'border-2 border-green-500 text-green-700 bg-white hover:bg-green-50 transition-colors',
    outlineWarning: 'border-2 border-amber-500 text-amber-700 bg-white hover:bg-amber-50 transition-colors',
    outlineDanger: 'border-2 border-red-500 text-red-700 bg-white hover:bg-red-50 transition-colors',
    
    // Solid variants with gradients
    solidPrimary: 'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-md shadow-primary-500/30',
    solidSuccess: 'bg-gradient-to-br from-green-600 to-green-700 text-white shadow-md shadow-green-500/30',
    solidWarning: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/30',
    solidDanger: 'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-md shadow-red-500/30'
  };

  // Enhanced dot colors with glow effect
  const dotColors = {
    default: 'bg-gray-500 shadow-sm',
    primary: 'bg-primary-500 shadow-sm shadow-primary-500/50 animate-pulse',
    secondary: 'bg-secondary-500 shadow-sm',
    success: 'bg-green-500 shadow-sm shadow-green-500/50 animate-pulse',
    warning: 'bg-amber-500 shadow-sm shadow-amber-500/50 animate-pulse',
    danger: 'bg-red-500 shadow-sm shadow-red-500/50 animate-pulse',
    info: 'bg-blue-500 shadow-sm shadow-blue-500/50 animate-pulse'
  };

  // Size styles with better spacing
  const sizeStyles = {
    xs: 'px-2 py-0.5 text-[10px] font-semibold',
    sm: 'px-2.5 py-1 text-xs font-semibold',
    md: 'px-3 py-1.5 text-sm font-semibold',
    lg: 'px-4 py-2 text-base font-semibold'
  };

  // Dot sizes
  const dotSizes = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3'
  };

  // Extract base variant for dot color
  const baseVariant = variant.replace('outline', '').replace('solid', '').toLowerCase() || 'default';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full
        select-none whitespace-nowrap
        transition-all duration-200
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
      <span className="leading-none">{children}</span>
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="
            -mr-1 h-4 w-4 rounded-full
            inline-flex items-center justify-center
            hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current
            transition-all duration-200 hover:scale-110
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

// Status Badge with enhanced styling
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
    verified: { variant: 'success', label: '✓ Verified' },
    unverified: { variant: 'warning', label: 'Unverified' },
    rejected: { variant: 'danger', label: 'Rejected' },
    
    // Generic
    active: { variant: 'success', label: 'Active', dot: true },
    inactive: { variant: 'default', label: 'Inactive', dot: true },
    
    // Medicine reminder
    taken: { variant: 'success', label: '✓ Taken' },
    skipped: { variant: 'warning', label: 'Skipped' },
    missed: { variant: 'danger', label: '✗ Missed' }
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

// Notification Badge with enhanced count display
Badge.Count = ({ 
  count = 0, 
  max = 99,
  showZero = false,
  className = '',
  variant = 'danger'
}) => {
  if (!showZero && count === 0) return null;

  const displayCount = count > max ? `${max}+` : count;

  const variantStyles = {
    danger: 'bg-gradient-to-br from-red-500 to-red-600 shadow-md shadow-red-500/30',
    primary: 'bg-gradient-to-br from-primary-500 to-primary-600 shadow-md shadow-primary-500/30',
    success: 'bg-gradient-to-br from-green-500 to-green-600 shadow-md shadow-green-500/30',
    warning: 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-md shadow-amber-500/30'
  };

  return (
    <span 
      className={`
        inline-flex items-center justify-center
        min-w-[1.25rem] h-5 px-1.5 rounded-full
        text-white text-xs font-bold
        select-none
        animate-pulse
        ${variantStyles[variant] || variantStyles.danger}
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
  variant: PropTypes.oneOf(['danger', 'primary', 'success', 'warning']),
  className: PropTypes.string
};

export default Badge;