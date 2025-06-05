import { useState, useCallback, useRef, useEffect } from 'react';
import { clampViewBoxStartTime } from '@/lib/utils';

// Constants for timeline controls
const SCRUB_AUDIO_GAIN = 0.3;
const SCRUB_AUDIO_DURATION = 0.04; // 40ms scrub duration

// Constants for drag-panning logic
const PAN_EDGE_BUFFER_RATIO = 0.1; 
const PAN_REPOSITION_FACTOR_LEFT = 0.2;
const PAN_REPOSITION_FACTOR_RIGHT = 0.8;
const MIN_VIEWBOX_CHANGE_THRESHOLD = 0.001;

interface UseTimelineControlsProps {
  videoElement: HTMLVideoElement | null;
  audioContextRef: React.RefObject<AudioContext | null>;
  audioBufferRef: React.RefObject<AudioBuffer | null>;
  duration: number;
  setCurrentTime: (time: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  viewBoxStartTime: number;
  displayedDuration: number;
  resetDebounce?: () => void;
  setViewBoxStartTime: (time: number) => void;
}

export interface UseTimelineControlsReturn {
  isDragging: boolean;
  isPlaying: boolean;
  togglePlayPause: () => void;
  handleSeekStart: (startTime: number) => void;
  handleSeekMove: (currentMouseX: number) => void;
  handleSeekEnd: () => void;
}

// Helper to calculate time from mouse position on canvas
const calculateTimeFromMousePosition = (
  currentMouseX: number,
  canvasRect: DOMRect,
  viewBoxStartTime: number,
  displayedDuration: number,
  totalDuration: number
): number => {
  const mouseXRelativeToCanvas = currentMouseX - canvasRect.left;
  const clampedMouseX = Math.max(0, Math.min(mouseXRelativeToCanvas, canvasRect.width));
  const progressInView = canvasRect.width === 0 ? 0 : clampedMouseX / canvasRect.width; // Avoid division by zero
  const time = viewBoxStartTime + progressInView * displayedDuration;
  return Math.max(0, Math.min(totalDuration, time));
};

// Helper to calculate if and how the viewBox should pan during playhead drag
const calculateViewBoxPanOnSeek = (
  timeAtMouse: number,
  currentViewBoxStartTime: number,
  displayedDuration: number,
  totalDuration: number
): number | null => { // Returns new viewBoxStartTime or null if no pan
  if (displayedDuration === 0) return null; // Avoid division by zero if displayedDuration is 0
  const edgeBuffer = displayedDuration * PAN_EDGE_BUFFER_RATIO;
  let newVBoxStartTime: number | null = null;

  if (timeAtMouse < currentViewBoxStartTime + edgeBuffer && currentViewBoxStartTime > 0) {
    newVBoxStartTime = timeAtMouse - displayedDuration * PAN_REPOSITION_FACTOR_LEFT;
  } else if (timeAtMouse > currentViewBoxStartTime + displayedDuration - edgeBuffer && (currentViewBoxStartTime + displayedDuration) < totalDuration) {
    newVBoxStartTime = timeAtMouse - displayedDuration * PAN_REPOSITION_FACTOR_RIGHT;
  }

  if (newVBoxStartTime !== null) {
    const clampedNewVBoxStartTime = clampViewBoxStartTime(
      newVBoxStartTime,
      totalDuration,
      displayedDuration
    );
    if (Math.abs(clampedNewVBoxStartTime - currentViewBoxStartTime) > MIN_VIEWBOX_CHANGE_THRESHOLD) {
      return clampedNewVBoxStartTime;
    }
  }
  return null; 
};

export const useTimelineControls = ({ 
  videoElement,
  audioContextRef,
  audioBufferRef,
  duration,
  setCurrentTime,
  canvasRef,
  viewBoxStartTime,
  displayedDuration,
  resetDebounce,
  setViewBoxStartTime,
}: UseTimelineControlsProps): UseTimelineControlsReturn => {
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const scrubAudioRef = useRef<AudioBufferSourceNode | null>(null);
  const scrubGainRef = useRef<GainNode | null>(null);

  const togglePlayPause = useCallback(() => {
    if (!videoElement) return;
    if (videoElement.paused) {
      videoElement.play().catch(error => {
        console.error("Error attempting to play video:", error);
        setIsPlaying(false);
      });
    } else {
      videoElement.pause();
    }
  }, [videoElement]);

  useEffect(() => {
    if (!videoElement) return;
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    setIsPlaying(!videoElement.paused);
    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
    };
  }, [videoElement]);

  const startAudioScrubbing = useCallback((time: number) => {
    if (!audioContextRef.current || !audioBufferRef.current || duration === 0) return;
    stopAudioScrubbing(); // Stop any previous scrubbing instance
    try {
      const audioCtx = audioContextRef.current;
      const source = audioCtx.createBufferSource();
      const gainNode = audioCtx.createGain();
      source.buffer = audioBufferRef.current;
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      gainNode.gain.value = SCRUB_AUDIO_GAIN;
      // Ensure scrub time is within buffer bounds
      const scrubStartTime = Math.max(0, Math.min(time, audioBufferRef.current.duration - SCRUB_AUDIO_DURATION));
      source.start(0, scrubStartTime, SCRUB_AUDIO_DURATION);
      scrubAudioRef.current = source;
      scrubGainRef.current = gainNode;
    } catch (error) {
      console.error('Error during audio scrubbing:', error);
      scrubAudioRef.current = null; // Ensure refs are cleared on error
      scrubGainRef.current = null;
    }
  }, [audioContextRef, audioBufferRef, duration]); // Removed stopAudioScrubbing from deps, added duration

  const stopAudioScrubbing = useCallback(() => {
    if (scrubAudioRef.current) { 
      try { scrubAudioRef.current.stop(); scrubAudioRef.current.disconnect(); } catch (e) { /* Ignore errors on stop/disconnect */ }
      scrubAudioRef.current = null; 
    }
    if (scrubGainRef.current) { 
      try { scrubGainRef.current.disconnect(); } catch(e) { /* Ignore errors on disconnect */ }
      scrubGainRef.current = null; 
    }
  }, []);

  const handleSeekStart = useCallback((time: number) => {
    if (!videoElement || duration === 0) return;
    resetDebounce?.();
    setIsDragging(true);
    videoElement.pause();
    const clampedTime = Math.max(0, Math.min(time, duration));
    videoElement.currentTime = clampedTime;
    setCurrentTime(clampedTime);
    startAudioScrubbing(clampedTime);
  }, [videoElement, duration, setCurrentTime, startAudioScrubbing, resetDebounce]);

  const handleSeekMove = useCallback((currentMouseX: number) => {
    if (!isDragging || !canvasRef.current || !videoElement || duration === 0 ) return;
    // displayedDuration check removed from here, handled by helper or pan logic if necessary
    
    resetDebounce?.();
    const canvasRect = canvasRef.current.getBoundingClientRect();

    let timeAtMouse = calculateTimeFromMousePosition(
      currentMouseX,
      canvasRect,
      viewBoxStartTime,
      displayedDuration,
      duration
    );

    const newVBoxStartTimeOnPan = calculateViewBoxPanOnSeek(
      timeAtMouse,
      viewBoxStartTime,
      displayedDuration,
      duration
    );

    let currentViewBoxStartTimeForCalc = viewBoxStartTime;
    if (newVBoxStartTimeOnPan !== null) {
      setViewBoxStartTime(newVBoxStartTimeOnPan);
      currentViewBoxStartTimeForCalc = newVBoxStartTimeOnPan; // Use the new viewBox for subsequent time calculation
      // Recalculate time based on the new viewbox to keep playhead under cursor
      timeAtMouse = calculateTimeFromMousePosition(
        currentMouseX,
        canvasRect,
        currentViewBoxStartTimeForCalc,
        displayedDuration,
        duration
      );
    }
    
    const clampedFinalNewTime = Math.max(0, Math.min(duration, timeAtMouse));

    if (Math.abs(videoElement.currentTime - clampedFinalNewTime) > 0.01) { 
      videoElement.currentTime = clampedFinalNewTime;
      setCurrentTime(clampedFinalNewTime);
      startAudioScrubbing(clampedFinalNewTime);
    }
  }, [
    isDragging, 
    canvasRef, 
    videoElement, 
    duration, 
    viewBoxStartTime, 
    displayedDuration, 
    setCurrentTime, 
    startAudioScrubbing,
    resetDebounce,
    setViewBoxStartTime,
  ]);

  const handleSeekEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    stopAudioScrubbing();
  }, [isDragging, stopAudioScrubbing]);

  useEffect(() => {
    if (!isDragging) return;
    const handleGlobalMouseMove = (e: MouseEvent) => handleSeekMove(e.clientX);
    const handleGlobalMouseUp = () => handleSeekEnd();
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, handleSeekMove, handleSeekEnd]);

  return {
    isDragging,
    isPlaying,
    togglePlayPause,
    handleSeekStart,
    handleSeekMove,
    handleSeekEnd,
  };
}; 