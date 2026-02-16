import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';

/**
 * Loading spinner component
 */
const Loader = ({
  size = 'md',
  variant = 'primary',
  fullScreen = false,
  text,
  className = ''
}) => {
  // Size mapping
  const sizeStyles = {
    xs: { icon: 16, text: 'text-xs' },
    sm: { icon: 20, text: 'text-sm' },
    md: { icon: 28, text: 'text-base' },
    lg: { icon: 36, text: 'text-lg' },
    xl: { icon: 48, text: 'text-xl' }
  };

  // Variant colors
  const variantStyles = {
    primary: 'text-primary-600',
    secondary: 'text-secondary-600',
    white: 'text-white',
    gray: 'text-gray-500'
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;
  const colorClass = variantStyles[variant] || variantStyles.primary;

  const loaderContent = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 
        className={`animate-spin ${colorClass}`} 
        size={currentSize.icon} 
      />
      {text && (
        <p className={`${currentSize.text} ${colorClass} font-medium`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
};

/**
 * Skeleton loader for content placeholders
 */
const Skeleton = ({
  variant = 'text',
  width,
  height,
  className = '',
  count = 1,
  ...props
}) => {
  // Variant default sizes
  const variantStyles = {
    text: 'h-4 w-full rounded',
    title: 'h-6 w-3/4 rounded',
    avatar: 'h-12 w-12 rounded-full',
    thumbnail: 'h-20 w-20 rounded-lg',
    card: 'h-32 w-full rounded-xl',
    button: 'h-10 w-24 rounded-lg',
    circle: 'rounded-full'
  };

  const baseClass = variantStyles[variant] || variantStyles.text;

  const style = {
    ...(width && { width }),
    ...(height && { height })
  };

  const skeletons = Array(count).fill(null).map((_, index) => (
    <div
      key={index}
      className={`bg-gray-200 animate-pulse ${baseClass} ${className}`}
      style={style}
      {...props}
    />
  ));

  return count === 1 ? skeletons[0] : (
    <div className="space-y-3">{skeletons}</div>
  );
};

/**
 * Page loader with skeleton
 */
const PageLoader = ({ type = 'default' }) => {
  if (type === 'list') {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton variant="avatar" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="title" width="60%" />
              <Skeleton variant="text" width="80%" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="p-4 grid gap-4 grid-cols-1 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="card" height="150px" />
        ))}
      </div>
    );
  }

  if (type === 'detail') {
    return (
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton variant="avatar" className="h-16 w-16" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="title" />
            <Skeleton variant="text" width="50%" />
          </div>
        </div>
        <Skeleton variant="card" height="200px" />
        <div className="space-y-3">
          <Skeleton variant="text" count={4} />
        </div>
      </div>
    );
  }

  // Default
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Loader size="lg" text="Loading..." />
    </div>
  );
};

Loader.propTypes = {
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  variant: PropTypes.oneOf(['primary', 'secondary', 'white', 'gray']),
  fullScreen: PropTypes.bool,
  text: PropTypes.string,
  className: PropTypes.string
};

Skeleton.propTypes = {
  variant: PropTypes.oneOf(['text', 'title', 'avatar', 'thumbnail', 'card', 'button', 'circle']),
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  className: PropTypes.string,
  count: PropTypes.number
};

PageLoader.propTypes = {
  type: PropTypes.oneOf(['default', 'list', 'card', 'detail'])
};

// Export all
Loader.Skeleton = Skeleton;
Loader.Page = PageLoader;

export default Loader;