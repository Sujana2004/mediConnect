import PropTypes from 'prop-types';
import { User } from 'lucide-react';

/**
 * Avatar component for user profile images
 */
const Avatar = ({
  src,
  alt = 'Avatar',
  name,
  size = 'md',
  variant = 'circle',
  status,
  className = '',
  onClick,
  ...props
}) => {
  // Size mapping
  const sizeStyles = {
    xs: { container: 'h-6 w-6', text: 'text-xs', icon: 12, status: 'h-2 w-2' },
    sm: { container: 'h-8 w-8', text: 'text-sm', icon: 14, status: 'h-2.5 w-2.5' },
    md: { container: 'h-10 w-10', text: 'text-base', icon: 18, status: 'h-3 w-3' },
    lg: { container: 'h-12 w-12', text: 'text-lg', icon: 22, status: 'h-3.5 w-3.5' },
    xl: { container: 'h-16 w-16', text: 'text-xl', icon: 28, status: 'h-4 w-4' },
    '2xl': { container: 'h-20 w-20', text: 'text-2xl', icon: 36, status: 'h-5 w-5' },
    '3xl': { container: 'h-24 w-24', text: 'text-3xl', icon: 44, status: 'h-6 w-6' }
  };

  // Variant styles
  const variantStyles = {
    circle: 'rounded-full',
    rounded: 'rounded-xl',
    square: 'rounded-lg'
  };

  // Status colors
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    busy: 'bg-red-500',
    away: 'bg-amber-500'
  };

  // Generate initials from name
  const getInitials = (name) => {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Generate background color from name
  const getColorFromName = (name) => {
    if (!name) return 'bg-gray-400';
    const colors = [
      'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
      'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
      'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
      'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500'
    ];
    const charCode = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
    return colors[charCode % colors.length];
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;
  const currentVariant = variantStyles[variant] || variantStyles.circle;
  const initials = getInitials(name);
  const bgColor = getColorFromName(name);

  const clickableStyles = onClick
    ? 'cursor-pointer hover:opacity-80 transition-opacity'
    : '';

  return (
    <div 
      className={`relative inline-flex flex-shrink-0 ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...props}
    >
      {/* Avatar */}
      <div
        className={`
          ${currentSize.container}
          ${currentVariant}
          ${clickableStyles}
          overflow-hidden flex items-center justify-center
        `}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        
        {/* Fallback: Initials or Icon */}
        <div
          className={`
            h-full w-full flex items-center justify-center
            ${bgColor} text-white font-medium
            ${src ? 'hidden' : 'flex'}
          `}
          style={{ display: src ? 'none' : 'flex' }}
        >
          {initials ? (
            <span className={currentSize.text}>{initials}</span>
          ) : (
            <User size={currentSize.icon} />
          )}
        </div>
      </div>

      {/* Status indicator */}
      {status && (
        <span
          className={`
            absolute bottom-0 right-0
            ${currentSize.status}
            ${statusColors[status] || statusColors.offline}
            ${variant === 'circle' ? 'rounded-full' : 'rounded-sm'}
            border-2 border-white
          `}
        />
      )}
    </div>
  );
};

// Avatar Group
Avatar.Group = ({ 
  children, 
  max = 4, 
  size = 'md', 
  className = '' 
}) => {
  const childArray = Array.isArray(children) ? children : [children];
  const displayChildren = childArray.slice(0, max);
  const remainingCount = childArray.length - max;

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {displayChildren.map((child, index) => (
        <div 
          key={index} 
          className="ring-2 ring-white rounded-full"
        >
          {child}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={`
            flex items-center justify-center
            bg-gray-200 text-gray-600 font-medium
            rounded-full ring-2 ring-white
            ${sizeStyles[size]?.container || 'h-10 w-10'}
            ${sizeStyles[size]?.text || 'text-base'}
          `}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

const sizeStyles = {
  xs: { container: 'h-6 w-6', text: 'text-xs' },
  sm: { container: 'h-8 w-8', text: 'text-sm' },
  md: { container: 'h-10 w-10', text: 'text-base' },
  lg: { container: 'h-12 w-12', text: 'text-lg' },
  xl: { container: 'h-16 w-16', text: 'text-xl' }
};

Avatar.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  name: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']),
  variant: PropTypes.oneOf(['circle', 'rounded', 'square']),
  status: PropTypes.oneOf(['online', 'offline', 'busy', 'away']),
  className: PropTypes.string,
  onClick: PropTypes.func
};

Avatar.Group.propTypes = {
  children: PropTypes.node,
  max: PropTypes.number,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  className: PropTypes.string
};

export default Avatar;