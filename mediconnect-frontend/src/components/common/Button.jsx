// src/components/common/Button.jsx
import { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';

/**
 * Reusable Button component with multiple variants and sizes
 */
const Button = forwardRef(({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  leftIcon = null,
  rightIcon = null,
  className = '',
  onClick,
  ...props
}, ref) => {
  // Base styles
  const baseStyles = `
    inline-flex items-center justify-center font-medium rounded-lg
    transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    tap-highlight-none
  `;

  // Variant styles
  const variantStyles = {
    primary: `
      bg-primary-600 text-white
      hover:bg-primary-700 active:bg-primary-800
      focus:ring-primary-500
    `,
    secondary: `
      bg-secondary-600 text-white
      hover:bg-secondary-700 active:bg-secondary-800
      focus:ring-secondary-500
    `,
    outline: `
      border-2 border-primary-600 text-primary-600 bg-transparent
      hover:bg-primary-50 active:bg-primary-100
      focus:ring-primary-500
    `,
    outlineSecondary: `
      border-2 border-secondary-600 text-secondary-600 bg-transparent
      hover:bg-secondary-50 active:bg-secondary-100
      focus:ring-secondary-500
    `,
    ghost: `
      text-gray-700 bg-transparent
      hover:bg-gray-100 active:bg-gray-200
      focus:ring-gray-500
    `,
    danger: `
      bg-danger-600 text-white
      hover:bg-danger-700 active:bg-danger-800
      focus:ring-danger-500
    `,
    dangerOutline: `
      border-2 border-danger-600 text-danger-600 bg-transparent
      hover:bg-danger-50 active:bg-danger-100
      focus:ring-danger-500
    `,
    success: `
      bg-green-600 text-white
      hover:bg-green-700 active:bg-green-800
      focus:ring-green-500
    `,
    warning: `
      bg-amber-500 text-white
      hover:bg-amber-600 active:bg-amber-700
      focus:ring-amber-500
    `,
    link: `
      text-primary-600 bg-transparent underline-offset-4
      hover:underline hover:text-primary-700
      focus:ring-primary-500 p-0
    `,
    white: `
      bg-white text-gray-900 border border-gray-200
      hover:bg-gray-50 active:bg-gray-100
      focus:ring-gray-500
    `
  };

  // Size styles
  const sizeStyles = {
    xs: 'px-2.5 py-1.5 text-xs gap-1',
    sm: 'px-3 py-2 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-5 py-3 text-base gap-2',
    xl: 'px-6 py-3.5 text-lg gap-2.5',
    icon: 'p-2',
    iconSm: 'p-1.5',
    iconLg: 'p-3'
  };

  // Icon size mapping
  const iconSizes = {
    xs: 14,
    sm: 16,
    md: 18,
    lg: 20,
    xl: 22,
    icon: 20,
    iconSm: 16,
    iconLg: 24
  };

  const iconSize = iconSizes[size] || 18;

  // Combine all styles
  const combinedClassName = `
    ${baseStyles}
    ${variantStyles[variant] || variantStyles.primary}
    ${sizeStyles[size] || sizeStyles.md}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Render icon helper
  const renderIcon = (icon) => {
    if (!icon) return null;
    
    if (typeof icon === 'function') {
      return icon({ size: iconSize });
    }
    
    return icon;
  };

  // Destructure to avoid passing custom props to DOM
  const { ...buttonProps } = props;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={combinedClassName}
      {...buttonProps}
    >
      {loading ? (
        <>
          <Loader2 
            className="animate-spin" 
            size={iconSize} 
          />
          {children && <span>{children}</span>}
        </>
      ) : (
        <>
          {leftIcon && (
            <span className="flex-shrink-0 inline-flex">
              {renderIcon(leftIcon)}
            </span>
          )}
          {children && <span>{children}</span>}
          {rightIcon && (
            <span className="flex-shrink-0 inline-flex">
              {renderIcon(rightIcon)}
            </span>
          )}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

Button.propTypes = {
  children: PropTypes.node,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  variant: PropTypes.oneOf([
    'primary', 'secondary', 'outline', 'outlineSecondary',
    'ghost', 'danger', 'dangerOutline', 'success', 'warning',
    'link', 'white'
  ]),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl', 'icon', 'iconSm', 'iconLg']),
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  leftIcon: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  rightIcon: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  className: PropTypes.string,
  onClick: PropTypes.func
};

export default Button;