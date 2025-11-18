/**
 * ReviewFiltersBar - Filter controls for human review queue
 */

import { Filter, ChevronDown } from 'lucide-react';
import type { QueueStatus } from '../types';

interface ReviewFiltersBarProps {
  availableQueueIds: string[];
  selectedQueueId: string;
  selectedStatus: QueueStatus | '';
  onQueueIdChange: (queueId: string) => void;
  onStatusChange: (status: QueueStatus | '') => void;
  onClearFilters: () => void;
}

export function ReviewFiltersBar({
  availableQueueIds,
  selectedQueueId,
  selectedStatus,
  onQueueIdChange,
  onStatusChange,
  onClearFilters,
}: ReviewFiltersBarProps) {
  const hasActiveFilters = selectedQueueId !== '' || selectedStatus !== '';

  return (
    <div style={styles.filtersBar}>
      {/* Queue ID Filter */}
      <div style={styles.filterGroup}>
        <div style={styles.selectWrapper}>
          <Filter size={14} style={styles.filterIcon} />
          <select
            style={styles.filterDropdownButton}
            value={selectedQueueId}
            onChange={(e) => onQueueIdChange(e.target.value)}
          >
            <option value="">All Queues</option>
            {availableQueueIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <ChevronDown size={14} style={styles.chevronIcon} />
        </div>
      </div>

      {/* Status Filter */}
      <div style={styles.filterGroup}>
        <div style={styles.selectWrapper}>
          <Filter size={14} style={styles.filterIcon} />
          <select
            style={styles.filterDropdownButton}
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as QueueStatus | '')}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <ChevronDown size={14} style={styles.chevronIcon} />
        </div>
      </div>

      {hasActiveFilters && (
        <button style={styles.clearFiltersButton} onClick={onClearFilters}>
          Clear filters
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  filtersBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap' as const,
  },
  filterGroup: {
    position: 'relative',
  },
  selectWrapper: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
  },
  filterIcon: {
    position: 'absolute',
    left: '12px',
    pointerEvents: 'none',
    color: '#666',
    zIndex: 1,
  },
  chevronIcon: {
    position: 'absolute',
    right: '12px',
    pointerEvents: 'none',
    color: '#666',
    zIndex: 1,
  },
  filterDropdownButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 36px 7px 32px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#000',
    backgroundColor: '#fff',
    border: '1px solid #eaeaea',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
  },
  clearFiltersButton: {
    padding: '7px 12px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#666',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
  },
};
