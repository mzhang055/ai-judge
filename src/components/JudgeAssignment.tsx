/**
 * JudgeAssignment - Component for assigning judges to a question
 */

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import type { Judge, JudgeAssignment as JudgeAssignmentType } from '../types';
import { listJudges } from '../services/judgeService';
import {
  assignJudge,
  unassignJudgeFromQuestion,
  getAssignmentsForQuestion,
} from '../services/judgeAssignmentService';

interface JudgeAssignmentProps {
  queueId: string;
  questionId: string;
  questionText: string;
}

export function JudgeAssignment({
  queueId,
  questionId,
  questionText,
}: JudgeAssignmentProps) {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [assignments, setAssignments] = useState<JudgeAssignmentType[]>([]);
  const [assignedJudgeIds, setAssignedJudgeIds] = useState<Set<string>>(
    new Set()
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadJudges();
    loadAssignments();
  }, [queueId, questionId]);

  useEffect(() => {
    // Update assigned judge IDs when assignments change
    setAssignedJudgeIds(new Set(assignments.map((a) => a.judge_id)));
  }, [assignments]);

  const loadJudges = async () => {
    try {
      const data = await listJudges(true); // Only active judges
      setJudges(data);
    } catch (err) {
      console.error('Failed to load judges:', err);
    }
  };

  const loadAssignments = async () => {
    try {
      const data = await getAssignmentsForQuestion(queueId, questionId);
      setAssignments(data);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    }
  };

  const handleAssign = async (judgeId: string) => {
    setLoading(true);
    try {
      await assignJudge({
        queue_id: queueId,
        question_id: questionId,
        judge_id: judgeId,
      });
      await loadAssignments();
      setShowDropdown(false);
    } catch (err) {
      console.error('Failed to assign judge:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async (judgeId: string) => {
    setLoading(true);
    try {
      await unassignJudgeFromQuestion(queueId, questionId, judgeId);
      await loadAssignments();
    } catch (err) {
      console.error('Failed to unassign judge:', err);
    } finally {
      setLoading(false);
    }
  };

  const getJudgeName = (judgeId: string): string => {
    return judges.find((j) => j.id === judgeId)?.name || 'Unknown Judge';
  };

  const availableJudges = judges.filter((j) => !assignedJudgeIds.has(j.id));

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.questionText}>{questionText}</h3>
          <p style={styles.questionId}>ID: {questionId}</p>
        </div>
      </div>

      <div style={styles.assignments}>
        {assignments.length === 0 ? (
          <p style={styles.emptyText}>No judges assigned yet</p>
        ) : (
          <div style={styles.judgeList}>
            {assignments.map((assignment) => (
              <div key={assignment.id} style={styles.judgeBadge}>
                <span>{getJudgeName(assignment.judge_id)}</span>
                <button
                  style={styles.removeButton}
                  onClick={() => handleUnassign(assignment.judge_id)}
                  disabled={loading}
                  title="Remove judge"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add judge dropdown */}
        <div style={styles.dropdownContainer}>
          {!showDropdown ? (
            <button
              style={styles.addButton}
              onClick={() => setShowDropdown(true)}
              disabled={availableJudges.length === 0}
            >
              <Plus size={16} />
              <span>Assign Judge</span>
            </button>
          ) : (
            <div style={styles.dropdown}>
              <div style={styles.dropdownHeader}>
                <span style={styles.dropdownTitle}>Select a judge</span>
                <button
                  style={styles.closeDropdown}
                  onClick={() => setShowDropdown(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div style={styles.dropdownList}>
                {availableJudges.map((judge) => (
                  <button
                    key={judge.id}
                    style={styles.dropdownItem}
                    onClick={() => handleAssign(judge.id)}
                    disabled={loading}
                  >
                    <div style={styles.judgeInfo}>
                      <span style={styles.judgeName}>{judge.name}</span>
                      <span style={styles.judgeModel}>{judge.model_name}</span>
                    </div>
                  </button>
                ))}
                {availableJudges.length === 0 && (
                  <p style={styles.noJudges}>All judges have been assigned</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    marginBottom: '16px',
  },
  header: {
    marginBottom: '16px',
  },
  questionText: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#111827',
    marginBottom: '4px',
  },
  questionId: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
  },
  assignments: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#9ca3af',
    fontStyle: 'italic',
    margin: 0,
  },
  judgeList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  judgeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: '#e0e7ff',
    color: '#4f46e5',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: 500,
  },
  removeButton: {
    padding: '2px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#6366f1',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    transition: 'background-color 0.15s',
  },
  dropdownContainer: {
    position: 'relative' as const,
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#4f46e5',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  dropdown: {
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  dropdownHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
  },
  dropdownTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#111827',
  },
  closeDropdown: {
    padding: '4px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    borderRadius: '4px',
  },
  dropdownList: {
    maxHeight: '200px',
    overflowY: 'auto' as const,
  },
  dropdownItem: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'background-color 0.15s',
  },
  judgeInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  judgeName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  judgeModel: {
    fontSize: '12px',
    color: '#6b7280',
  },
  noJudges: {
    padding: '16px',
    fontSize: '13px',
    color: '#9ca3af',
    textAlign: 'center' as const,
    margin: 0,
  },
};
