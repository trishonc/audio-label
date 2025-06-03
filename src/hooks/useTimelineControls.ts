import { useState, useCallback, useRef, useEffect } from 'react';

interface UseTimelineControlsProps {
  videoElement: HTMLVideoElement | null;
  audioContextRef: React.RefObject<AudioContext | null>;
  audioBufferRef: React.RefObject<AudioBuffer | null>;
  duration: number; // Total duration
  setVideoCurrentTime: (time: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  zoomLevel: number;
  viewBoxStartTime: number;
  setViewBoxStartTime: (time: number) => void;
  displayedDuration: number;
}

export interface UseTimelineControlsReturn {
  isDragging: boolean;
  isPlaying: boolean;
  togglePlayPause: () => void;
  handleSeekStart: (startTime: number, initialMouseX: number) => void;
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
  zoomLevel,
  viewBoxStartTime,
  setViewBoxStartTime,
  displayedDuration,
}: UseTimelineControlsProps): UseTimelineControlsReturn => {
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const scrubAudioRef = useRef<AudioBufferSourceNode | null>(null);
  const scrubGainRef = useRef<GainNode | null>(null);
  const dragStartTimeRef = useRef<number>(0); 
  const dragStartMouseXRef = useRef<number>(0);
  // Store the viewBoxStartTime at the moment the drag started
  const dragStartViewBoxTimeRef = useRef<number>(0); 

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

    // Stop and disconnect any existing scrubbing sound source
    if (scrubAudioRef.current) {
      try {
        scrubAudioRef.current.stop();
        scrubAudioRef.current.disconnect();
      } catch (e) {
        // Errors can occur if the node is already stopped or in an invalid state, which is fine.
      }
      scrubAudioRef.current = null;
    }

    // Disconnect the previous gain node if it exists
    if (scrubGainRef.current) {
        try {
            scrubGainRef.current.disconnect();
        } catch(e) {
            // Errors can occur if the node is already disconnected, which is fine.
        }
        scrubGainRef.current = null;
    }

    try {
      const source = audioContextRef.current.createBufferSource();
      const gainNode = audioContextRef.current.createGain();

      source.buffer = audioBufferRef.current;
      source.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      gainNode.gain.value = 0.3;
      
      // Play a shorter segment for scrubbing feedback to reduce perceived repetition
      const scrubDuration = 0.04; // Changed from 0.1 to 0.04 (40ms)
      
      // The start method handles clamping if (time + scrubDuration) exceeds buffer duration
      source.start(0, time, scrubDuration);

      scrubAudioRef.current = source;
      scrubGainRef.current = gainNode;
    } catch (error) {
      console.error('Error during audio scrubbing:', error);
      // Defensive cleanup on error
      if (scrubAudioRef.current) {
          try { scrubAudioRef.current.disconnect(); } catch (e) {}
          scrubAudioRef.current = null;
      }
      if (scrubGainRef.current) {
          try { scrubGainRef.current.disconnect(); } catch (e) {}
          scrubGainRef.current = null;
      }
    }
  }, [audioContextRef, audioBufferRef]);

  const stopAudioScrubbing = useCallback(() => {
    if (scrubAudioRef.current) {
      try {
        scrubAudioRef.current.stop();
        scrubAudioRef.current.disconnect();
      } catch (e) {
        // Errors can occur, which is fine.
      }
      scrubAudioRef.current = null;
    }
    if (scrubGainRef.current) {
      try {
        scrubGainRef.current.disconnect();
      } catch (e) {
        // Errors can occur, which is fine.
      }
      scrubGainRef.current = null;
    }
  }, []);

  const handleSeekStart = useCallback((time: number, initialMouseX: number) => {
    if (!videoElement || duration === 0) return;
    setIsDragging(true);
    videoElement.pause(); // Pause video during drag for smoother seeking
    videoElement.currentTime = time;
    setVideoCurrentTime(time);
    startAudioScrubbing(time);
    dragStartTimeRef.current = time;
    dragStartMouseXRef.current = initialMouseX;
    dragStartViewBoxTimeRef.current = viewBoxStartTime; // Store viewBoxStartTime at drag start
  }, [videoElement, duration, setVideoCurrentTime, startAudioScrubbing, viewBoxStartTime]);

  const handleSeekMove = useCallback((currentMouseX: number) => {
    if (!isDragging || !canvasRef.current || !videoElement || duration === 0) return;

    const rect = canvasRef.current.getBoundingClientRect();
    
    // Calculate pixelsPerSecond based on the *currently visible* duration in the canvas
    const pixelsPerSecondInView = rect.width / displayedDuration;
    const mouseDeltaX = currentMouseX - dragStartMouseXRef.current;
    const timeDelta = mouseDeltaX / pixelsPerSecondInView;
    
    // The new time is calculated relative to the time when the drag started.
    // This is crucial for zoomed views, as the `viewBoxStartTime` might change if `Timeline.tsx` tries to auto-scroll.
    // However, for drag purposes, we want the seeking to be relative to the initial state of the drag.
    let newTime = dragStartTimeRef.current + timeDelta;
    
    newTime = Math.max(0, Math.min(duration, newTime)); // Clamp to total duration
    
    // Auto-pan logic when dragging playhead near edges
    const edgeBuffer = displayedDuration * 0.1; // 10% buffer from each edge
    let newViewBoxStartTime = viewBoxStartTime;
    let shouldPan = false;

    if (newTime < viewBoxStartTime + edgeBuffer) { // Playhead approaching left edge
      newViewBoxStartTime = newTime - displayedDuration * 0.2; // Position playhead 20% from left
      shouldPan = true;
    } else if (newTime > viewBoxStartTime + displayedDuration - edgeBuffer) { // Playhead approaching right edge
      newViewBoxStartTime = newTime - displayedDuration * 0.8; // Position playhead 80% from left (20% from right)
      shouldPan = true;
    }

    if (shouldPan) {
      newViewBoxStartTime = Math.max(0, Math.min(newViewBoxStartTime, duration - displayedDuration));
      if (duration - displayedDuration <= 0) {
        newViewBoxStartTime = 0;
      }
      if (Math.abs(newViewBoxStartTime - viewBoxStartTime) > 0.001) {
        setViewBoxStartTime(newViewBoxStartTime);
      }
    }
    
    videoElement.currentTime = newTime;
    setVideoCurrentTime(newTime);
    startAudioScrubbing(newTime);
  }, [
    isDragging, 
    canvasRef, 
    videoElement, 
    duration, 
    zoomLevel, 
    setVideoCurrentTime, 
    startAudioScrubbing, 
    dragStartMouseXRef, 
    dragStartTimeRef,
    viewBoxStartTime,
    setViewBoxStartTime,
    displayedDuration
  ]);
  // Note: We use dragStartTimeRef and dragStartMouseXRef to make seeking relative to the drag start point.
  // dragStartViewBoxTimeRef.current could be used if we needed to adjust based on the viewBox at drag initiation, but for now, direct time calculation is cleaner.

  const handleSeekEnd = useCallback(() => {
    if (!videoElement || !isDragging) return;
    setIsDragging(false);
    stopAudioScrubbing();
    // Optionally, resume playback if it was playing before drag started
    // This needs isPlayingBeforeDrag state, for now, it remains paused.
    // if (isPlayingBeforeDragRef.current && videoElement) {
    //   videoElement.play();
    // }
  }, [videoElement, isDragging, stopAudioScrubbing]);

  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleSeekMove(e.clientX);
    };

    const handleGlobalMouseUp = () => {
      handleSeekEnd();
    };

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