import { useEffect, useCallback, useRef } from 'react';
import { clampViewBoxStartTime } from '@/lib/utils';

const MOUSE_WHEEL_PAN_SENSITIVITY_FACTOR = 0.6;
const PLAYBACK_PAN_BUFFER_RATIO = 0.2;
const PLAYBACK_REPOSITION_FACTOR_LEFT = 0.3;
const PLAYBACK_REPOSITION_FACTOR_RIGHT = 0.7;
const VIEWBOX_UPDATE_THRESHOLD = 0.001;

interface UseTimelinePanProps {
  duration: number;
  zoomLevel: number; // To calculate displayedDuration
  viewBoxStartTime: number;
  setViewBoxStartTime: (time: number) => void;
  currentTime: number; // Video's current time
  isPlaying: boolean;
  isDraggingMediaSlider: boolean;
  isUserInteractingWithTimeline: boolean;
  pingUserInteraction: () => void;
  panToTimestampTarget: number | null;
  // canvasForwardRef is not strictly needed if canvasWidth is passed to handleWheelPan
  // but keeping it for consistency or future direct use if any part needs it.
  canvasForwardRef: React.RefObject<HTMLCanvasElement | null>; 
}

interface UseTimelinePanReturn {
  displayedDuration: number;
  handleWheelPan: (event: WheelEvent, canvasWidth: number) => void;
  handleScrollbarScrub: (newViewBoxStartTime: number) => void;
}

export const useTimelinePan = ({
  duration,
  zoomLevel,
  viewBoxStartTime,
  setViewBoxStartTime,
  currentTime,
  isPlaying,
  isDraggingMediaSlider,
  isUserInteractingWithTimeline,
  pingUserInteraction,
  panToTimestampTarget,
}: UseTimelinePanProps): UseTimelinePanReturn => {
  const processedPanTargetRef = useRef<number | null>(null);
  const displayedDuration = duration > 0 && zoomLevel > 0 ? duration / zoomLevel : 0;

  const handleWheelPan = useCallback((event: WheelEvent, canvasWidth: number) => {
    if (duration === 0 || displayedDuration === 0) return;
    pingUserInteraction(); // Already called in Timeline.tsx wrapper, but good for standalone use

    const panDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const timeDelta = (panDelta / canvasWidth) * displayedDuration * MOUSE_WHEEL_PAN_SENSITIVITY_FACTOR;
    let newViewBoxStartTime = viewBoxStartTime + timeDelta;
    newViewBoxStartTime = clampViewBoxStartTime(newViewBoxStartTime, duration, displayedDuration);

    if (Math.abs(newViewBoxStartTime - viewBoxStartTime) > VIEWBOX_UPDATE_THRESHOLD) {
      setViewBoxStartTime(newViewBoxStartTime);
    }
  }, [viewBoxStartTime, duration, displayedDuration, pingUserInteraction, setViewBoxStartTime]);

  const handleScrollbarScrub = useCallback((newScrubStartTime: number) => {
    pingUserInteraction();
    const newClampedTime = clampViewBoxStartTime(newScrubStartTime, duration, displayedDuration);
    if (Math.abs(newClampedTime - viewBoxStartTime) > VIEWBOX_UPDATE_THRESHOLD) {
      setViewBoxStartTime(newClampedTime);
    }
  }, [duration, displayedDuration, viewBoxStartTime, pingUserInteraction, setViewBoxStartTime]);

  useEffect(() => {
    if (panToTimestampTarget !== null && panToTimestampTarget !== processedPanTargetRef.current && duration > 0 && zoomLevel > 0) {
      const timeToCenter = panToTimestampTarget;
      const currentDisplayedDuration = duration / zoomLevel; // Recalculate as zoomLevel might have updated
      let newTargetViewBoxStartTime = timeToCenter - currentDisplayedDuration / 2;
      newTargetViewBoxStartTime = clampViewBoxStartTime(newTargetViewBoxStartTime, duration, currentDisplayedDuration);
      
      if (Math.abs(newTargetViewBoxStartTime - viewBoxStartTime) > VIEWBOX_UPDATE_THRESHOLD) {
        pingUserInteraction();
        setViewBoxStartTime(newTargetViewBoxStartTime);
      }
      processedPanTargetRef.current = panToTimestampTarget;
    }
    // Reset processed target if the external target is cleared
    if (panToTimestampTarget === null && processedPanTargetRef.current !== null) {
      processedPanTargetRef.current = null;
    }
  }, [panToTimestampTarget, duration, zoomLevel, viewBoxStartTime, pingUserInteraction, setViewBoxStartTime]);

  useEffect(() => {
    if (duration === 0 || displayedDuration === 0) return;

    if (!isPlaying || isDraggingMediaSlider || isUserInteractingWithTimeline) {
      return;
    }

    let newTargetViewBoxStartTime = viewBoxStartTime;
    const buffer = displayedDuration * PLAYBACK_PAN_BUFFER_RATIO;
    let shouldAdjust = false;

    if (currentTime < viewBoxStartTime + buffer && viewBoxStartTime > 0) {
      newTargetViewBoxStartTime = currentTime - displayedDuration * PLAYBACK_REPOSITION_FACTOR_LEFT;
      shouldAdjust = true;
    } else if (currentTime > viewBoxStartTime + displayedDuration - buffer && (viewBoxStartTime + displayedDuration) < duration - 0.01) {
      newTargetViewBoxStartTime = currentTime - displayedDuration * PLAYBACK_REPOSITION_FACTOR_RIGHT;
      shouldAdjust = true;
    }

    if (shouldAdjust) {
      newTargetViewBoxStartTime = clampViewBoxStartTime(
        newTargetViewBoxStartTime,
        duration,
        displayedDuration
      );
      if (Math.abs(newTargetViewBoxStartTime - viewBoxStartTime) > VIEWBOX_UPDATE_THRESHOLD) {
        setViewBoxStartTime(newTargetViewBoxStartTime);
      }
    }
  }, [
    isPlaying,
    currentTime,
    viewBoxStartTime,
    zoomLevel, // Added to re-calculate displayedDuration if it changes
    duration,
    displayedDuration, // Keep for direct use
    isDraggingMediaSlider,
    isUserInteractingWithTimeline,
    setViewBoxStartTime,
  ]);

  return {
    displayedDuration,
    handleWheelPan,
    handleScrollbarScrub,
  };
}; 