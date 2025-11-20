/**
 * JudgeList - Displays all judges in a clean table layout
 */

import {
  Edit2,
  Trash2,
  User,
  FileText,
  Power,
  Calendar,
  Settings,
} from 'lucide-react';
import { StyledButton } from './ui/StyledButton';
import { StyledBadge } from './ui/StyledBadge';
import type { Judge } from '../types';

interface JudgeListProps {
  judges: Judge[];
  onEdit: (judge: Judge) => void;
  onDelete: (judge: Judge) => void;
  loading?: boolean;
}

export function JudgeList({
  judges,
  onEdit,
  onDelete,
  loading,
}: JudgeListProps) {
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p style={styles.loadingText}>Loading judges...</p>
      </div>
    );
  }

  if (judges.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <User size={48} strokeWidth={1.5} style={styles.emptyIcon} />
        <h3 style={styles.emptyTitle}>No judges yet</h3>
        <p style={styles.emptyText}>
          Create your first AI judge to get started
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <th style={{ ...styles.th, ...styles.thName }}>
              <span style={styles.headerText}>
                <User size={14} />
                <span>Name</span>
              </span>
            </th>
            <th style={styles.th}>
              <span style={styles.headerText}>
                <FileText size={14} />
                <span>System Prompt</span>
              </span>
            </th>
            <th style={styles.th}>
              <span style={styles.headerText}>
                <Power size={14} />
                <span>Status</span>
              </span>
            </th>
            <th style={styles.th}>
              <span style={styles.headerText}>
                <Calendar size={14} />
                <span>Created</span>
              </span>
            </th>
            <th style={{ ...styles.th, ...styles.thActions }}>
              <span style={styles.headerText}>
                <Settings size={14} />
                <span>Actions</span>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {judges.map((judge) => (
            <tr key={judge.id} style={styles.row}>
              {/* Name with avatar */}
              <td style={styles.td}>
                <div style={styles.nameCell}>
                  <div style={styles.avatar}>
                    {judge.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={styles.nameText}>{judge.name}</span>
                </div>
              </td>

              {/* System Prompt (truncated) */}
              <td style={styles.td}>
                <span style={styles.promptText} title={judge.system_prompt}>
                  {truncateText(judge.system_prompt, 60)}
                </span>
              </td>

              {/* Active Status Badge */}
              <td style={styles.td}>
                <StyledBadge variant={judge.is_active ? 'active' : 'inactive'}>
                  {judge.is_active ? '✓ Active' : '✗ Inactive'}
                </StyledBadge>
              </td>

              {/* Created Date */}
              <td style={styles.td}>
                <span style={styles.dateText}>
                  {formatDate(judge.created_at)}
                </span>
              </td>

              {/* Actions */}
              <td style={styles.td}>
                <div style={styles.actions}>
                  <StyledButton
                    variant="secondary"
                    size="small"
                    onClick={() => onEdit(judge)}
                    title="Edit judge"
                    style={styles.iconButton}
                  >
                    <Edit2 size={16} />
                  </StyledButton>
                  <StyledButton
                    variant="danger"
                    size="small"
                    onClick={() => onDelete(judge)}
                    title="Delete judge"
                    style={styles.iconButton}
                  >
                    <Trash2 size={16} />
                  </StyledButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Helper functions
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },
  loadingContainer: {
    padding: '48px',
    textAlign: 'center',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '14px',
  },
  emptyContainer: {
    padding: '64px 32px',
    textAlign: 'center',
  },
  emptyIcon: {
    color: '#d1d5db',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  headerRow: {
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b7280',
  },
  thName: {
    paddingLeft: '24px',
  },
  thActions: {
    textAlign: 'center' as const,
  },
  headerText: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  row: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.15s',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#111827',
  },
  nameCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingLeft: '8px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#e0e7ff',
    color: '#4f46e5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
  },
  nameText: {
    fontWeight: 500,
    color: '#111827',
  },
  modelBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#4b5563',
  },
  promptText: {
    color: '#6b7280',
    fontSize: '13px',
    lineHeight: '1.5',
  },
  dateText: {
    color: '#6b7280',
    fontSize: '13px',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  iconButton: {
    padding: '6px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
