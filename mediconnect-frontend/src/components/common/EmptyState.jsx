import PropTypes from 'prop-types';
import { FileX, Search, Calendar, Bell, MessageSquare, Pill } from 'lucide-react';
import Button from './Button';

/**
 * Empty state component for when no data is available
 */
const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  // Predefined variants
  const variantConfig = {
    default: { icon: FileX, color: 'text-gray-400' },
    search: { icon: Search, color: 'text-gray-400' },
    appointments: { icon: Calendar, color: 'text-primary-400' },
    notifications: { icon: Bell, color: 'text-amber-400' },
    messages: { icon: MessageSquare, color: 'text-blue-400' },
    medicines: { icon: Pill, color: 'text-green-400' }
  };

  // Size styles
  const sizeStyles = {
    sm: {
      container: 'py-8 px-4',
      icon: 40,
      title: 'text-base',
      description: 'text-sm'
    },
    md: {
      container: 'py-12 px-6',
      icon: 56,
      title: 'text-lg',
      description: 'text-base'
    },
    lg: {
      container: 'py-16 px-8',
      icon: 72,
      title: 'text-xl',
      description: 'text-lg'
    }
  };

  const config = variantConfig[variant] || variantConfig.default;
  const currentSize = sizeStyles[size] || sizeStyles.md;
  const IconComponent = Icon || config.icon;

  return (
    <div 
      className={`
        flex flex-col items-center justify-center text-center
        ${currentSize.container}
        ${className}
      `}
    >
      {/* Icon */}
      <div className={`mb-4 ${config.color}`}>
        <IconComponent size={currentSize.icon} strokeWidth={1.5} />
      </div>

      {/* Title */}
      {title && (
        <h3 className={`font-semibold text-gray-900 mb-2 ${currentSize.title}`}>
          {title}
        </h3>
      )}

      {/* Description */}
      {description && (
        <p className={`text-gray-500 max-w-sm mb-6 ${currentSize.description}`}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {actionLabel && (
            <Button onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && (
            <Button variant="outline" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

EmptyState.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string,
  description: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  secondaryActionLabel: PropTypes.string,
  onSecondaryAction: PropTypes.func,
  variant: PropTypes.oneOf(['default', 'search', 'appointments', 'notifications', 'messages', 'medicines']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string
};

export default EmptyState;