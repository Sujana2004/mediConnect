import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Tabs component for navigation between views
 */
const Tabs = ({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  className = ''
}) => {
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const tabsRef = useRef([]);
  const containerRef = useRef(null);

  // Update indicator position
  useEffect(() => {
    const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
    const activeTabEl = tabsRef.current[activeIndex];
    
    if (activeTabEl && variant === 'default') {
      setIndicatorStyle({
        left: activeTabEl.offsetLeft,
        width: activeTabEl.offsetWidth
      });
    }
  }, [activeTab, tabs, variant]);

  // Size styles
  const sizeStyles = {
    sm: 'text-sm py-2 px-3',
    md: 'text-sm py-2.5 px-4',
    lg: 'text-base py-3 px-5'
  };

  // Variant styles
  const getTabStyles = (isActive) => {
    switch (variant) {
      case 'pills':
        return isActive
          ? 'bg-primary-600 text-white rounded-lg'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg';
      
      case 'underline':
        return isActive
          ? 'text-primary-600 border-b-2 border-primary-600'
          : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent';
      
      case 'bordered':
        return isActive
          ? 'bg-white text-primary-600 border border-gray-200 border-b-white rounded-t-lg -mb-px'
          : 'text-gray-600 hover:text-gray-900';
      
      default: // default with sliding indicator
        return isActive
          ? 'text-primary-600'
          : 'text-gray-600 hover:text-gray-900';
    }
  };

  return (
    <div className={className}>
      <div 
        ref={containerRef}
        className={`
          relative flex
          ${variant === 'bordered' ? 'border-b border-gray-200' : ''}
          ${variant === 'underline' ? 'border-b border-gray-200 gap-0' : 'gap-1'}
          ${fullWidth ? 'w-full' : 'w-fit'}
        `}
      >
        {/* Tabs */}
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={el => tabsRef.current[index] = el}
            onClick={() => onChange(tab.id)}
            disabled={tab.disabled}
            className={`
              relative font-medium transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${sizeStyles[size]}
              ${getTabStyles(activeTab === tab.id)}
              ${fullWidth ? 'flex-1' : ''}
            `}
          >
            <span className="flex items-center justify-center gap-2">
              {tab.icon && <span className="flex items-center">{React.isValidElement(tab.icon) ? tab.icon : <tab.icon className="w-4 h-4" />}</span>}
              {tab.label}
              {tab.badge !== undefined && (
                <span className={`
                  inline-flex items-center justify-center
                  min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-medium
                  ${activeTab === tab.id 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'bg-gray-100 text-gray-600'
                  }
                `}>
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        ))}

        {/* Sliding indicator for default variant */}
        {variant === 'default' && (
          <div
            className="absolute bottom-0 h-0.5 bg-primary-600 transition-all duration-300"
            style={indicatorStyle}
          />
        )}
      </div>
    </div>
  );
};

// Tab Panel component
Tabs.Panel = ({ children, id, activeTab, className = '' }) => {
  if (id !== activeTab) return null;
  
  return (
    <div className={`animate-in fade-in duration-200 ${className}`}>
      {children}
    </div>
  );
};

Tabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.node,
      badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      disabled: PropTypes.bool
    })
  ).isRequired,
  activeTab: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(['default', 'pills', 'underline', 'bordered']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  fullWidth: PropTypes.bool,
  className: PropTypes.string
};

Tabs.Panel.propTypes = {
  children: PropTypes.node,
  id: PropTypes.string.isRequired,
  activeTab: PropTypes.string.isRequired,
  className: PropTypes.string
};

export default Tabs;