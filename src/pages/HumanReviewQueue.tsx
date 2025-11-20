/**
 * HumanReviewQueue - Container component with logic only
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../lib/errors';
import {
  getReviewQueue,
  getReviewQueueStats,
  getReviewQueueIds,
  type ReviewQueueStats,
} from '../services/humanReviewService';
import { HumanReviewQueueUI } from '../components/ui/HumanReviewQueueUI';
import type { HumanReviewQueueItemWithContext, QueueStatus } from '../types';

export function HumanReviewQueue() {
  const navigate = useNavigate();
  const [reviewItems, setReviewItems] = useState<
    HumanReviewQueueItemWithContext[]
  >([]);
  const [stats, setStats] = useState<ReviewQueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] =
    useState<HumanReviewQueueItemWithContext | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<QueueStatus | ''>(
    'pending'
  );
  const [availableQueueIds, setAvailableQueueIds] = useState<string[]>([]);

  const loadReviewQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: {
        queueId?: string;
        status?: QueueStatus;
      } = {};

      if (selectedQueueId) {
        filters.queueId = selectedQueueId;
      }

      if (selectedStatus) {
        filters.status = selectedStatus as QueueStatus;
      }

      const [items, queueStats, queueIds] = await Promise.all([
        getReviewQueue(filters),
        getReviewQueueStats(selectedQueueId || undefined),
        getReviewQueueIds(),
      ]);

      setReviewItems(items);
      setStats(queueStats);
      setAvailableQueueIds(queueIds);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load review queue'));
      toast.error(getErrorMessage(err, 'Failed to load review queue'));
    } finally {
      setLoading(false);
    }
  }, [selectedQueueId, selectedStatus]);

  useEffect(() => {
    loadReviewQueue();
  }, [loadReviewQueue]);

  const handleReviewClick = (item: HumanReviewQueueItemWithContext) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleReviewComplete = () => {
    setShowModal(false);
    setSelectedItem(null);
    loadReviewQueue(); // Reload to update stats and list
    toast.success('Review submitted successfully!');
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  const handleClearFilters = () => {
    setSelectedQueueId('');
    setSelectedStatus('');
  };

  const handleBackClick = () => {
    navigate('/queues');
  };

  return (
    <HumanReviewQueueUI
      loading={loading}
      error={error}
      reviewItems={reviewItems}
      stats={stats}
      selectedItem={selectedItem}
      showModal={showModal}
      availableQueueIds={availableQueueIds}
      selectedQueueId={selectedQueueId}
      selectedStatus={selectedStatus}
      onBackClick={handleBackClick}
      onReviewClick={handleReviewClick}
      onReviewComplete={handleReviewComplete}
      onModalClose={handleModalClose}
      onQueueIdChange={setSelectedQueueId}
      onStatusChange={setSelectedStatus}
      onClearFilters={handleClearFilters}
    />
  );
}
