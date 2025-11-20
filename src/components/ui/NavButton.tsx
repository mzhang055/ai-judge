/**
 * NavButton - Reusable navigation button with hover effects
 * Extracted from App.tsx navigation
 */

import { useState } from 'react';
import type { ReactNode } from 'react';

interface NavButtonProps {
  icon: ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export function NavButton({ icon, label, isActive, onClick }: NavButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    border: 'none',
    borderRadius: '8px',
    background:
      isActive || isHovered ? 'rgba(227, 158, 53, 0.1)' : 'transparent',
    color: '#E39E35',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  };

  return (
    <button
      onClick={onClick}
      style={buttonStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
