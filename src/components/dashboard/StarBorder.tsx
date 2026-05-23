"use client";

import React from 'react';
import './StarBorder.css';

interface StarBorderProps {
  as?: React.ElementType;
  className?: string;
  color?: string;
  speed?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

const StarBorder: React.FC<StarBorderProps> = ({
  as: Component = 'button',
  className = '',
  color = '#14b8a6',
  speed = '6s',
  children,
  onClick,
  disabled = false,
  ...props
}) => {
  return (
    <Component
      className={`star-border-container ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={{ '--star-color': color, '--star-speed': speed } as React.CSSProperties}
      {...props}
    >
      <div className="border-gradient-top" />
      <div className="border-gradient-bottom" />
      <div className="inner-content">
        {children}
      </div>
    </Component>
  );
};

export default StarBorder;
