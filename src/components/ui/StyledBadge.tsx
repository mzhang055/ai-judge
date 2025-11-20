/**
 * StyledBadge - Reusable badge component for verdicts and statuses
 * Extracted from inline styles across the app
 */

export type BadgeVariant =
  | 'pass'
  | 'fail'
  | 'inconclusive'
  | 'bad_data'
  | 'ambiguous_question'
  | 'insufficient_context'
  | 'pending'
  | 'in_review'
  | 'completed'
  | 'active'
  | 'inactive';

interface StyledBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const badgeStyles: Record<BadgeVariant, React.CSSProperties> = {
  pass: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  fail: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  inconclusive: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  bad_data: {
    backgroundColor: '#e9d5ff',
    color: '#6b21a8',
  },
  ambiguous_question: {
    backgroundColor: '#fed7aa',
    color: '#9a3412',
  },
  insufficient_context: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  pending: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
  in_review: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  completed: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  active: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  inactive: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
};

export function StyledBadge({ variant, children, style }: StyledBadgeProps) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    ...badgeStyles[variant],
    ...style,
  };

  return <span style={baseStyle}>{children}</span>;
}
