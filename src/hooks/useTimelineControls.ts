import { useState, useCallback, useRef, useEffect } from 'react';
import { clampViewBoxStartTime } from '@/lib/utils';

// Constants for timeline controls
const SCRUB_AUDIO_GAIN = 0.3;
const SCRUB_AUDIO_DURATION = 0.04; // 40ms scrub duration

// Constants for drag-panning logic (restored)
const PAN_EDGE_BUFFER_RATIO = 0.1; 
const PAN_REPOSITION_FACTOR_LEFT = 0.2;
const PAN_REPOSITION_FACTOR_RIGHT = 0.8;
const MIN_VIEWBOX_CHANGE_THRESHOLD = 0.001;

interface UseTimelineControlsProps {
  videoElement: HTMLVideoElement | null;
  audioContextRef: React.RefObject<AudioContext | null>;
  audioBufferRef: React.RefObject<AudioBuffer | null>;
  duration: number; // Total duration
  setVideoCurrentTime: (time: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  viewBoxStartTime: number;
  displayedDuration: number;
  pingUserInteraction?: () => void;
  setViewBoxStartTime: (time: number) => void; // Added back for drag-panning
}

export interface UseTimelineControlsReturn {
  isDragging: boolean;
  isPlaying: boolean;
  togglePlayPause: () => void;
  handleSeekStart: (startTime: number) => void;
  handleSeekMove: (currentMouseX: number) => void;
  handleSeekEnd: () => void;
}

export const useTimelineControls = ({ 
  videoElement,
  audioContextRef,
  audioBufferRef,
  duration, // Total duration
  setVideoCurrentTime,
  canvasRef,
  viewBoxStartTime,
  displayedDuration,
  pingUserInteraction,
  setViewBoxStartTime, // Added back
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
    if (!audioContextRef.current || !audioBufferRef.current) return;
    if (scrubAudioRef.current) {
      try { scrubAudioRef.current.stop(); scrubAudioRef.current.disconnect(); } catch (e) {}
      scrubAudioRef.current = null;
    }
    if (scrubGainRef.current) {
        try { scrubGainRef.current.disconnect(); } catch(e) {}
        scrubGainRef.current = null;
    }
    try {
      const source = audioContextRef.current.createBufferSource();
      const gainNode = audioContextRef.current.createGain();
      source.buffer = audioBufferRef.current;
      source.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      gainNode.gain.value = SCRUB_AUDIO_GAIN;
      source.start(0, time, SCRUB_AUDIO_DURATION);
      scrubAudioRef.current = source;
      scrubGainRef.current = gainNode;
    } catch (error) {
      console.error('Error during audio scrubbing:', error);
      if (scrubAudioRef.current) { try { scrubAudioRef.current.disconnect(); } catch (e) {} scrubAudioRef.current = null; }
      if (scrubGainRef.current) { try { scrubGainRef.current.disconnect(); } catch (e) {} scrubGainRef.current = null; }
    }
  }, [audioContextRef, audioBufferRef]);

  const stopAudioScrubbing = useCallback(() => {
    if (scrubAudioRef.current) { try { scrubAudioRef.current.stop(); scrubAudioRef.current.disconnect(); } catch (e) {} scrubAudioRef.current = null; }
    if (scrubGainRef.current) { try { scrubGainRef.current.disconnect(); } catch (e) {} scrubGainRef.current = null; }
  }, []);

  const handleSeekStart = useCallback((time: number) => {
    if (!videoElement || duration === 0) return;
    pingUserInteraction?.();
    setIsDragging(true);
    videoElement.pause();
    videoElement.currentTime = time;
    setVideoCurrentTime(time);
    startAudioScrubbing(time);
  }, [videoElement, duration, setVideoCurrentTime, startAudioScrubbing, pingUserInteraction]);

  // Restored original handleSeekMove logic
  const handleSeekMove = useCallback((currentMouseX: number) => {
    if (!isDragging || !canvasRef.current || !videoElement || duration === 0 || displayedDuration === 0) return;
    pingUserInteraction?.();

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseXRelativeToCanvas = currentMouseX - rect.left;
    const progressInView = mouseXRelativeToCanvas / rect.width;

    let referenceViewBoxStartTime = viewBoxStartTime;
    let timeBasedOnCurrentView = viewBoxStartTime + progressInView * displayedDuration;
    timeBasedOnCurrentView = Math.max(0, Math.min(duration, timeBasedOnCurrentView));

    const edgeBuffer = displayedDuration * PAN_EDGE_BUFFER_RATIO;
    let potentialNewViewBoxStartTime = viewBoxStartTime;
    let panConditionMet = false;

    if (timeBasedOnCurrentView < viewBoxStartTime + edgeBuffer && viewBoxStartTime > 0) {
      potentialNewViewBoxStartTime = timeBasedOnCurrentView - displayedDuration * PAN_REPOSITION_FACTOR_LEFT;
      panConditionMet = true;
    } else if (timeBasedOnCurrentView > viewBoxStartTime + displayedDuration - edgeBuffer && (viewBoxStartTime + displayedDuration) < duration) {
      potentialNewViewBoxStartTime = timeBasedOnCurrentView - displayedDuration * PAN_REPOSITION_FACTOR_RIGHT;
      panConditionMet = true;
    }

    if (panConditionMet) {
      potentialNewViewBoxStartTime = clampViewBoxStartTime(
        potentialNewViewBoxStartTime,
        duration,
        displayedDuration
      );
      if (Math.abs(potentialNewViewBoxStartTime - viewBoxStartTime) > MIN_VIEWBOX_CHANGE_THRESHOLD) {
        setViewBoxStartTime(potentialNewViewBoxStartTime); 
        referenceViewBoxStartTime = potentialNewViewBoxStartTime;
      }
    }

    const finalNewTime = referenceViewBoxStartTime + progressInView * displayedDuration;
    const clampedFinalNewTime = Math.max(0, Math.min(duration, finalNewTime));

    if (Math.abs(videoElement.currentTime - clampedFinalNewTime) > 0.01) { 
      videoElement.currentTime = clampedFinalNewTime;
      setVideoCurrentTime(clampedFinalNewTime);
      startAudioScrubbing(clampedFinalNewTime);
    }
  }, [
    isDragging, 
    canvasRef, 
    videoElement, 
    duration, 
    viewBoxStartTime, 
    displayedDuration, 
    setVideoCurrentTime, 
    startAudioScrubbing,
    pingUserInteraction,
    setViewBoxStartTime, // Added dependency
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