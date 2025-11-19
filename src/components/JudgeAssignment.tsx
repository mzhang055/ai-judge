/**
 * JudgeAssignment - Component for assigning judges to a question
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../lib/errors';
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
  const [error, setError] = useState<string | null>(null);

  const loadJudges = useCallback(async () => {
    try {
      const data = await listJudges(true); // Only active judges
      setJudges(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load judges'));
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    try {
      const data = await getAssignmentsForQuestion(queueId, questionId);
      setAssignments(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load assignments'));
    }
  }, [queueId, questionId]);

  // Check for inactive judges and remove them
  const checkAndRemoveInactiveJudges = useCallback(async () => {
    const allJudges = await listJudges(); // Get all judges (including inactive)
    const activeJudgeIds = new Set(
      allJudges.filter((j) => j.is_active).map((j) => j.id)
    );

    for (const assignment of assignments) {
      if (!activeJudgeIds.has(assignment.judge_id)) {
        // Judge is inactive, remove assignment
        const inactiveJudge = allJudges.find(
          (j) => j.id === assignment.judge_id
        );
        const judgeName = inactiveJudge?.name || 'Unknown Judge';

        try {
          await unassignJudgeFromQuestion(
            queueId,
            questionId,
            assignment.judge_id
          );
          toast.error(`Judge "${judgeName}" is inactive. It has been removed.`);
        } catch (err) {
          console.error('Failed to remove inactive judge:', err);
        }
      }
    }

    // Reload assignments to reflect changes
    await loadAssignments();
  }, [assignments, queueId, questionId, loadAssignments]);

  useEffect(() => {
    loadJudges();
    loadAssignments();
  }, [loadJudges, loadAssignments]);

  useEffect(() => {
    // Check for inactive judges after assignments and judges are loaded
    if (assignments.length > 0 && judges.length > 0) {
      checkAndRemoveInactiveJudges();
    }
  }, [assignments.length, judges.length, checkAndRemoveInactiveJudges]);

  useEffect(() => {
    // Update assigned judge IDs when assignments change
    setAssignedJudgeIds(new Set(assignments.map((a) => a.judge_id)));
  }, [assignments]);

  const handleAssign = async (judgeId: string) => {
    setLoading(true);
    setError(null);
    const judgeName = getJudgeName(judgeId);
    try {
      await assignJudge({
        queue_id: queueId,
        question_id: questionId,
        judge_id: judgeId,
      });
      await loadAssignments();
      setShowDropdown(false);
      toast.success(`Judge "${judgeName}" assigned successfully!`);
    } catch (err) {
      const errorMessage = getErrorMessage(err, 'Failed to assign judge');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async (judgeId: string) => {
    setLoading(true);
    setError(null);
    const judgeName = getJudgeName(judgeId);
    try {
      await unassignJudgeFromQuestion(queueId, questionId, judgeId);
      await loadAssignments();
      toast.success(`Judge "${judgeName}" unassigned successfully!`);
    } catch (err) {
      const errorMessage = getErrorMessage(err, 'Failed to unassign judge');
      setError(errorMessage);
      toast.error(errorMessage);
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

      {/* Error message */}
      {error && (
        <div style={styles.errorBanner} role="alert">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

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
                      <span style={styles.judgeModel}>GPT-5-mini</span>
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
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    marginBottom: '12px',
    fontSize: '13px',
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
    color: '#4f46e5',
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
