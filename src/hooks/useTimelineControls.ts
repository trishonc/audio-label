import { useState, useCallback, useRef, useEffect } from 'react';
import { clampViewBoxStartTime } from '@/lib/utils';

// Constants for timeline controls
const SCRUB_AUDIO_GAIN = 0.3;
const SCRUB_AUDIO_DURATION = 0.04; // 40ms scrub duration
const PAN_EDGE_BUFFER_RATIO = 0.1; // 10% buffer from each edge for auto-pan
const PAN_REPOSITION_FACTOR_LEFT = 0.2; // When panning left, position playhead 20% from the new left edge
const PAN_REPOSITION_FACTOR_RIGHT = 0.8; // When panning right, position playhead 80% from the new left edge (20% from right)
const MIN_VIEWBOX_CHANGE_THRESHOLD = 0.001; // Minimum change to trigger setViewBoxStartTime

interface UseTimelineControlsProps {
  videoElement: HTMLVideoElement | null;
  audioContextRef: React.RefObject<AudioContext | null>;
  audioBufferRef: React.RefObject<AudioBuffer | null>;
  duration: number; // Total duration
  setVideoCurrentTime: (time: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  viewBoxStartTime: number;
  setViewBoxStartTime: (time: number) => void;
  displayedDuration: number;
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
  setViewBoxStartTime,
  displayedDuration,
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
      gainNode.gain.value = SCRUB_AUDIO_GAIN;
      
      // Play a shorter segment for scrubbing feedback to reduce perceived repetition
      const scrubDuration = SCRUB_AUDIO_DURATION; 
      
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

  const handleSeekStart = useCallback((time: number) => {
    if (!videoElement || duration === 0) return;
    setIsDragging(true);
    videoElement.pause(); // Pause video during drag for smoother seeking
    videoElement.currentTime = time;
    setVideoCurrentTime(time);
    startAudioScrubbing(time);
  }, [videoElement, duration, setVideoCurrentTime, startAudioScrubbing]);

  const handleSeekMove = useCallback((currentMouseX: number) => {
    if (!isDragging || !canvasRef.current || !videoElement || duration === 0) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseXRelativeToCanvas = currentMouseX - rect.left;
    const progressInView = mouseXRelativeToCanvas / rect.width; // Ratio of mouse position within the canvas width

    // Default reference for viewBoxStartTime is the current one for calculating the playhead position
    let referenceViewBoxStartTime = viewBoxStartTime;

    // Calculate a preliminary newTime based on the current viewBoxStartTime.
    // This is used to check if panning is needed.
    let timeBasedOnCurrentView = viewBoxStartTime + progressInView * displayedDuration;
    timeBasedOnCurrentView = Math.max(0, Math.min(duration, timeBasedOnCurrentView)); // Clamp

    // Auto-pan logic
    const edgeBuffer = displayedDuration * PAN_EDGE_BUFFER_RATIO;
    let potentialNewViewBoxStartTime = viewBoxStartTime;
    let panConditionMet = false;

    // Check for panning left: playhead approaching left edge AND not already at the very beginning of the timeline view
    if (timeBasedOnCurrentView < viewBoxStartTime + edgeBuffer && viewBoxStartTime > 0) {
      potentialNewViewBoxStartTime = timeBasedOnCurrentView - displayedDuration * PAN_REPOSITION_FACTOR_LEFT;
      panConditionMet = true;
    // Check for panning right: playhead approaching right edge AND not already at the very end of the timeline view
    } else if (timeBasedOnCurrentView > viewBoxStartTime + displayedDuration - edgeBuffer && (viewBoxStartTime + displayedDuration) < duration) {
      potentialNewViewBoxStartTime = timeBasedOnCurrentView - displayedDuration * PAN_REPOSITION_FACTOR_RIGHT;
      panConditionMet = true;
    }

    if (panConditionMet) {
      // Clamp the potential new viewBoxStartTime to valid range
      potentialNewViewBoxStartTime = clampViewBoxStartTime(
        potentialNewViewBoxStartTime,
        duration,
        displayedDuration
      );

      // If a pan is actually going to happen (i.e., the change is significant enough)
      if (Math.abs(potentialNewViewBoxStartTime - viewBoxStartTime) > MIN_VIEWBOX_CHANGE_THRESHOLD) {
        setViewBoxStartTime(potentialNewViewBoxStartTime);
        // For THIS mouse event, the playhead's target time should be calculated relative to where the view WILL BE.
        referenceViewBoxStartTime = potentialNewViewBoxStartTime;
      }
    }

    // Calculate the final newTime for the video/audio using the determined referenceViewBoxStartTime.
    // This ensures the playhead targets the time under the mouse, considering the pan that was just decided (if any).
    const finalNewTime = referenceViewBoxStartTime + progressInView * displayedDuration;
    const clampedFinalNewTime = Math.max(0, Math.min(duration, finalNewTime));

    videoElement.currentTime = clampedFinalNewTime;
    setVideoCurrentTime(clampedFinalNewTime);
    startAudioScrubbing(clampedFinalNewTime);
  }, [
    isDragging, 
    canvasRef, 
    videoElement, 
    duration, 
    setVideoCurrentTime, 
    startAudioScrubbing, 
    viewBoxStartTime,
    setViewBoxStartTime,
    displayedDuration
  ]);

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