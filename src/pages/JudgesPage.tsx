/**
 * JudgesPage - Main page for managing AI judges
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { JudgeList } from '../components/JudgeList';
import { JudgeForm } from '../components/JudgeForm';
import { getErrorMessage } from '../lib/errors';
import type { Judge } from '../types';
import {
  listJudges,
  createJudge,
  updateJudge,
  deleteJudge,
  type CreateJudgeInput,
} from '../services/judgeService';

export function JudgesPage() {
  const navigate = useNavigate();
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJudge, setEditingJudge] = useState<Judge | undefined>(
    undefined
  );
  const [deleteConfirm, setDeleteConfirm] = useState<Judge | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load judges with useCallback to prevent unnecessary re-renders
  const loadJudges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listJudges();
      setJudges(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load judges'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load judges on mount
  useEffect(() => {
    loadJudges();
  }, [loadJudges]);

  const handleCreate = () => {
    setEditingJudge(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (judge: Judge) => {
    setEditingJudge(judge);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (input: CreateJudgeInput) => {
    setActionLoading(true);
    try {
      if (editingJudge) {
        // Update existing judge
        const updated = await updateJudge(editingJudge.id, input);
        // Optimistic update
        setJudges((prev) =>
          prev.map((j) => (j.id === updated.id ? updated : j))
        );
        toast.success(`Judge "${updated.name}" updated successfully!`);
      } else {
        // Create new judge
        const created = await createJudge(input);
        // Optimistic update
        setJudges((prev) => [created, ...prev]);
        toast.success(`Judge "${created.name}" created successfully!`);
      }
      setIsFormOpen(false);
      setEditingJudge(undefined);
    } catch (err) {
      const errorMessage = getErrorMessage(
        err,
        editingJudge ? 'Failed to update judge' : 'Failed to create judge'
      );
      setError(errorMessage);
      toast.error(errorMessage);
      throw err; // Re-throw so JudgeForm can handle it
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (judge: Judge) => {
    setDeleteConfirm(judge);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    setActionLoading(true);
    const judgeToDelete = deleteConfirm;

    try {
      // Optimistic delete
      setJudges((prev) => prev.filter((j) => j.id !== judgeToDelete.id));
      setDeleteConfirm(null);

      await deleteJudge(judgeToDelete.id);
      toast.success(`Judge "${judgeToDelete.name}" deleted successfully!`);
    } catch (err) {
      const errorMessage = getErrorMessage(err, 'Failed to delete judge');
      setError(errorMessage);
      toast.error(errorMessage);
      // Rollback on error - reload all judges
      await loadJudges();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Back button */}
      <button style={styles.backButton} onClick={() => navigate('/queues')}>
        <ArrowLeft size={16} />
        <span>Back to Queues</span>
      </button>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Manage Judges</h1>
          <p style={styles.subtitle}>
            Manage AI judges that evaluate human annotations
          </p>
        </div>
        <button style={styles.createButton} onClick={handleCreate}>
          <Plus size={20} />
          <span>Create Judge</span>
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Judge list */}
      <JudgeList
        judges={judges}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Create/Edit form modal */}
      <JudgeForm
        judge={editingJudge}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <>
          <div
            style={styles.backdrop}
            onClick={() => setDeleteConfirm(null)}
            aria-hidden="true"
          />
          <div
            style={styles.deleteModal}
            role="alertdialog"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description"
            aria-modal="true"
          >
            <h3 id="delete-dialog-title" style={styles.deleteTitle}>
              Delete Judge
            </h3>
            <p id="delete-dialog-description" style={styles.deleteText}>
              Are you sure you want to delete{' '}
              <strong>{deleteConfirm.name}</strong>? This action cannot be
              undone.
            </p>
            <div style={styles.deleteActions}>
              <button
                style={styles.cancelButton}
                onClick={() => setDeleteConfirm(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                style={styles.deleteButton}
                onClick={confirmDelete}
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 24px 40px',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginBottom: '16px',
    transition: 'background-color 0.15s',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  createButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#4f46e5',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    marginBottom: '24px',
    fontSize: '14px',
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  deleteModal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    padding: '24px',
    width: '90%',
    maxWidth: '400px',
    zIndex: 1000,
  },
  deleteTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '12px',
  },
  deleteText: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
    marginBottom: '24px',
  },
  deleteActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};
