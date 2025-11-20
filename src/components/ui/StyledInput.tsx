/**
 * StyledInput - Reusable form input components
 * Extracted from inline styles across the app
 */

import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

const inputBaseStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: '14px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};

export function StyledInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input style={inputBaseStyle} {...props} />;
}

export function StyledTextarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  const textareaStyle: React.CSSProperties = {
    ...inputBaseStyle,
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: '1.5',
  };

  return <textarea style={textareaStyle} {...props} />;
}

export function StyledSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement>
) {
  const selectStyle: React.CSSProperties = {
    ...inputBaseStyle,
    backgroundColor: '#fff',
    cursor: 'pointer',
  };

  return <select style={selectStyle} {...props} />;
}

export function StyledLabel(
  props: React.LabelHTMLAttributes<HTMLLabelElement>
) {
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  };

  return <label style={labelStyle} {...props} />;
}
