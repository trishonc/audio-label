import { useEffect, useCallback } from 'react';
import { clampViewBoxStartTime } from '@/lib/utils';
import { timelineChannel } from '@/lib/events';

const MOUSE_WHEEL_PAN_SENSITIVITY_FACTOR = 0.6;
const PLAYBACK_PAN_BUFFER_RATIO = 0.2;
const PLAYBACK_REPOSITION_FACTOR_LEFT = 0.3;
const PLAYBACK_REPOSITION_FACTOR_RIGHT = 0.7;
const VIEWBOX_UPDATE_THRESHOLD = 0.001;

interface UseTimelinePanProps {
  duration: number;
  zoomLevel: number;
  viewBoxStartTime: number;
  setViewBoxStartTime: (time: number) => void;
  currentTime: number;
  isPlaying: boolean;
  isDragging: boolean;
  isInteracting: boolean;
  resetDebounce: () => void;
}

interface UseTimelinePanReturn {
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
  isDragging,
  isInteracting,
  resetDebounce,
}: UseTimelinePanProps): UseTimelinePanReturn => {
  const displayedDuration = duration > 0 && zoomLevel > 0 ? duration / zoomLevel : 0;

  const handleWheelPan = useCallback((event: WheelEvent, canvasWidth: number) => {
    if (duration === 0 || displayedDuration === 0) return;
    resetDebounce();

    const panDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const timeDelta = (panDelta / canvasWidth) * displayedDuration * MOUSE_WHEEL_PAN_SENSITIVITY_FACTOR;
    let newViewBoxStartTime = viewBoxStartTime + timeDelta;
    newViewBoxStartTime = clampViewBoxStartTime(newViewBoxStartTime, duration, displayedDuration);

    if (Math.abs(newViewBoxStartTime - viewBoxStartTime) > VIEWBOX_UPDATE_THRESHOLD) {
      setViewBoxStartTime(newViewBoxStartTime);
    }
  }, [viewBoxStartTime, duration, displayedDuration, resetDebounce, setViewBoxStartTime, zoomLevel]);

  const handleScrollbarScrub = useCallback((newScrubStartTime: number) => {
    resetDebounce();
    const newClampedTime = clampViewBoxStartTime(newScrubStartTime, duration, displayedDuration);
    if (Math.abs(newClampedTime - viewBoxStartTime) > VIEWBOX_UPDATE_THRESHOLD) {
      setViewBoxStartTime(newClampedTime);
    }
  }, [duration, displayedDuration, viewBoxStartTime, resetDebounce, setViewBoxStartTime, zoomLevel]);

  useEffect(() => {
    const handleCenterOn = (timeToCenter: number) => {
      if (duration > 0 && zoomLevel > 0) {
        const currentDisplayedDuration = duration / zoomLevel;
        let newTargetViewBoxStartTime = timeToCenter - currentDisplayedDuration / 2;
        newTargetViewBoxStartTime = clampViewBoxStartTime(newTargetViewBoxStartTime, duration, currentDisplayedDuration);

        if (Math.abs(newTargetViewBoxStartTime - viewBoxStartTime) > VIEWBOX_UPDATE_THRESHOLD) {
          resetDebounce();
          setViewBoxStartTime(newTargetViewBoxStartTime);
        }
      }
    };

    timelineChannel.on('centerOn', handleCenterOn);
    return () => {
      timelineChannel.off('centerOn', handleCenterOn);
    };
  }, [duration, zoomLevel, viewBoxStartTime, setViewBoxStartTime, resetDebounce]);

  useEffect(() => {
    const currentEffectDisplayedDuration = duration > 0 && zoomLevel > 0 ? duration / zoomLevel : 0;
    if (duration === 0 || currentEffectDisplayedDuration === 0) return;

    if (!isPlaying || isDragging || isInteracting) {
      return;
    }

    let newTargetViewBoxStartTime = viewBoxStartTime;
    const buffer = currentEffectDisplayedDuration * PLAYBACK_PAN_BUFFER_RATIO;
    let shouldAdjust = false;

    if (currentTime < viewBoxStartTime + buffer && viewBoxStartTime > 0) {
      newTargetViewBoxStartTime = currentTime - currentEffectDisplayedDuration * PLAYBACK_REPOSITION_FACTOR_LEFT;
      shouldAdjust = true;
    } else if (currentTime > viewBoxStartTime + currentEffectDisplayedDuration - buffer && (viewBoxStartTime + currentEffectDisplayedDuration) < duration - 0.01) {
      newTargetViewBoxStartTime = currentTime - currentEffectDisplayedDuration * PLAYBACK_REPOSITION_FACTOR_RIGHT;
      shouldAdjust = true;
    }

    if (shouldAdjust) {
      newTargetViewBoxStartTime = clampViewBoxStartTime(
        newTargetViewBoxStartTime,
        duration,
        currentEffectDisplayedDuration
      );
      if (Math.abs(newTargetViewBoxStartTime - viewBoxStartTime) > VIEWBOX_UPDATE_THRESHOLD) {
        setViewBoxStartTime(newTargetViewBoxStartTime);
      }
    }
  }, [
    isPlaying,
    currentTime,
    viewBoxStartTime,
    zoomLevel,
    duration,
    isDragging,
    isInteracting,
    setViewBoxStartTime,
  ]);

  return {
    handleWheelPan,
    handleScrollbarScrub,
  };
}; 