import { useCallback } from 'react';
import type { RefObject as ReactRefObjectType } from 'react';
import { clampViewBoxStartTime } from '@/lib/utils';

export const MIN_ZOOM = 1; // Minimum zoom level (1x = full view)
const MAX_ZOOM = 20; // Maximum zoom level (e.g., 20x)
const MOUSE_WHEEL_ZOOM_SENSITIVITY = 0.1; // How much zoom changes per wheel tick

interface UseTimelineZoomProps {
  duration: number;
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  viewBoxStartTime: number;
  setViewBoxStartTime: (time: number) => void;
  displayedDuration: number;
  canvasRef: ReactRefObjectType<HTMLCanvasElement | null>;
  resetDebounce: () => void;
}

interface UseTimelineZoomReturn {
  handleZoomSliderChange: (value: number[]) => void;
  handleWheelZoom: (event: WheelEvent, mouseXRelative: number, canvasWidth: number) => void;
  increaseZoom: () => void;
  decreaseZoom: () => void;
}

export const useTimelineZoom = ({
  duration,
  zoomLevel,
  setZoomLevel,
  viewBoxStartTime,
  setViewBoxStartTime,
  displayedDuration,
  canvasRef,
  resetDebounce,
}: UseTimelineZoomProps): UseTimelineZoomReturn => {

  const handleZoomSliderChange = useCallback((value: number[]) => {
    const newZoom = value[0];
    if (newZoom === zoomLevel) return;

    resetDebounce();
    const canvas = canvasRef.current;

    if (!canvas || duration === 0) {
      setZoomLevel(newZoom);
      if (newZoom === MIN_ZOOM) setViewBoxStartTime(0);
      return;
    }

    const centerTimeOfView = viewBoxStartTime + displayedDuration / 2;
    const newDisplayedDurationZoom = duration / newZoom;
    let newViewBoxStartTimeZoom = centerTimeOfView - newDisplayedDurationZoom / 2;
    newViewBoxStartTimeZoom = clampViewBoxStartTime(newViewBoxStartTimeZoom, duration, newDisplayedDurationZoom);

    setZoomLevel(newZoom);
    setViewBoxStartTime(newViewBoxStartTimeZoom);

    if (newZoom === MIN_ZOOM && viewBoxStartTime !== 0) {
      setViewBoxStartTime(0);
    }
  }, [zoomLevel, duration, viewBoxStartTime, displayedDuration, canvasRef, resetDebounce, setZoomLevel, setViewBoxStartTime]);

  const handleWheelZoom = useCallback((event: WheelEvent, mouseXRelative: number, canvasWidth: number) => {
    resetDebounce();
    
    const zoomDirection = event.deltaY < 0 ? 1 : -1;
    const oldZoomLevel = zoomLevel;
    let newZoom = oldZoomLevel * (1 + zoomDirection * MOUSE_WHEEL_ZOOM_SENSITIVITY * 2);
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

    if (newZoom !== oldZoomLevel) {
      const timeAtMouse = viewBoxStartTime + (mouseXRelative / canvasWidth) * displayedDuration;
      const newDisplayedDuration = duration / newZoom;
      let newViewBoxStartTime = timeAtMouse - (mouseXRelative / canvasWidth) * newDisplayedDuration;
      newViewBoxStartTime = clampViewBoxStartTime(newViewBoxStartTime, duration, newDisplayedDuration);
      
      setZoomLevel(newZoom);
      setViewBoxStartTime(newViewBoxStartTime);
    }
  }, [zoomLevel, viewBoxStartTime, duration, displayedDuration, resetDebounce, setZoomLevel, setViewBoxStartTime]);

  const increaseZoom = useCallback(() => {
    const newZoom = Math.min(zoomLevel + 1, MAX_ZOOM);
    if (newZoom !== zoomLevel) {
      handleZoomSliderChange([newZoom]);
    }
  }, [zoomLevel, handleZoomSliderChange]);

  const decreaseZoom = useCallback(() => {
    const newZoom = Math.max(zoomLevel - 1, MIN_ZOOM);
    if (newZoom !== zoomLevel) {
      handleZoomSliderChange([newZoom]);
    }
  }, [zoomLevel, handleZoomSliderChange]);

  return {
    handleZoomSliderChange,
    handleWheelZoom,
    increaseZoom,
    decreaseZoom,
  };
}; 