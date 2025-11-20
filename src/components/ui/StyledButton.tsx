/**
 * StyledButton - Reusable button component with consistent styling
 * Extracted from inline styles across the app
 */

import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'black' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

interface StyledButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const buttonStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
  },
  secondary: {
    backgroundColor: '#fff',
    color: '#374151',
    border: '1px solid #d1d5db',
  },
  black: {
    backgroundColor: '#000000',
    color: '#fff',
    border: 'none',
  },
  danger: {
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  small: {
    padding: '8px 16px',
    fontSize: '13px',
  },
  medium: {
    padding: '10px 20px',
    fontSize: '14px',
  },
  large: {
    padding: '12px 24px',
    fontSize: '15px',
  },
};

export function StyledButton({
  variant = 'primary',
  size = 'medium',
  style,
  disabled,
  ...props
}: StyledButtonProps) {
  const baseStyle: React.CSSProperties = {
    fontWeight: 500,
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s',
    opacity: disabled ? 0.5 : 1,
    ...buttonStyles[variant],
    ...sizeStyles[size],
    ...style,
  };

  return <button style={baseStyle} disabled={disabled} {...props} />;
}
