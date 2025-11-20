/**
 * StyledModal - Reusable modal component
 * Extracted from inline styles across the app
 */

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface StyledModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow:
      '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    zIndex: 1000,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 24px 16px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  closeButton: {
    padding: '4px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    borderRadius: '4px',
    transition: 'background-color 0.15s',
  },
  body: {
    padding: '24px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
  },
};

export function StyledModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '600px',
}: StyledModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        style={{ ...styles.modal, maxWidth }}
        role="dialog"
        aria-modal="true"
      >
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button
            style={styles.closeButton}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        <div style={styles.body}>{children}</div>
        {footer && <div style={styles.footer}>{footer}</div>}
      </div>
    </>
  );
}
