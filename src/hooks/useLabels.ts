import { useCallback } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { timelineChannel } from '@/lib/events';

interface UseLabelsProps {
  videoElement: HTMLVideoElement | null;
}

export function useLabels({ videoElement }: UseLabelsProps) {
  const addLabelToStore = useSessionStore(state => state.addLabel);
  const deleteLabelFromStore = useSessionStore(state => state.deleteLabel);

  const createLabelAtCurrentTimestamp = useCallback(() => {
    if (videoElement && videoElement.duration > 0 && videoElement.readyState >= 1) { // Ensure video has metadata and is ready
      addLabelToStore(videoElement.currentTime);
    } else {
      console.warn("Cannot add label: Video element not ready or has no duration.");
    }
  }, [videoElement, addLabelToStore]);

  const removeLabel = useCallback((labelId: string) => {
    deleteLabelFromStore(labelId);
  }, [deleteLabelFromStore]);

  const navigateToLabel = useCallback((timestampToNavigate: number) => {
    if (videoElement) {
      videoElement.currentTime = timestampToNavigate;
      timelineChannel.emit('centerOn', timestampToNavigate);
    }
  }, [videoElement]);

  return {
    createLabelAtCurrentTimestamp,
    removeLabel,
    navigateToLabel,
  };
} 