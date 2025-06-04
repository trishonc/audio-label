import { useState, useEffect, useCallback } from 'react';

// Define the Label interface directly in the hook for now
export interface Label {
  id: string;
  timestamp: number; // in seconds
}

interface UseLabelsProps {
  videoElement: HTMLVideoElement | null;
  currentFileIdentifier: string | undefined; // To detect when the active file changes
  // Callback to request the timeline to pan
  requestTimelinePan: (timestamp: number) => void; 
}

export function useLabels({ 
  videoElement, 
  currentFileIdentifier, 
  requestTimelinePan 
}: UseLabelsProps) {
  const [labels, setLabels] = useState<Label[]>([]);

  // Effect to reset labels when the current file changes
  useEffect(() => {
    setLabels([]); // Clear labels for the new/unloaded file
  }, [currentFileIdentifier]);

  const addLabel = useCallback(() => {
    if (videoElement && videoElement.duration > 0) { // Ensure video has a duration
      const newLabel: Label = {
        id: Date.now().toString(), // Simple unique ID
        timestamp: videoElement.currentTime,
      };
      // Add and sort labels by timestamp
      setLabels(prevLabels => 
        [...prevLabels, newLabel].sort((a, b) => a.timestamp - b.timestamp)
      );
    }
  }, [videoElement]);

  const deleteLabel = useCallback((labelId: string) => {
    setLabels(prevLabels => prevLabels.filter(label => label.id !== labelId));
  }, []);

  const navigateToTimestamp = useCallback((timestampToNavigate: number) => {
    if (videoElement) {
      videoElement.currentTime = timestampToNavigate;
      requestTimelinePan(timestampToNavigate); // Call the callback to request pan
    }
  }, [videoElement, requestTimelinePan]);

  return {
    labels,
    addLabel,
    deleteLabel,
    navigateToTimestamp,
    setLabels, // Expose setLabels directly for more complex scenarios if needed, or for initial hydration
  };
} 