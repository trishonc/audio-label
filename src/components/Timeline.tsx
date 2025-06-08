import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useAudioProcessing } from '@/hooks/useAudioProcessing';
import { useTimelineControls } from '@/hooks/useTimelineControls';
import { useTimelineZoom, MIN_ZOOM } from '@/hooks/useTimelineZoom';
import { useTimelinePan } from '@/hooks/useTimelinePan';
import { useInteractionDebouncer } from '@/hooks/useInteractionDebouncer';
import { useSessionStore } from '@/store/sessionStore';
import TimelineControls from './timeline/TimelineControls';
import TimelineWaveform from './timeline/TimelineWaveform';

interface TimelineProps {
  url: string | null;
  videoElement: HTMLVideoElement | null;
  onAudioScrubReady?: (scrubFunction: (time: number) => void) => void;
  onCreateLabel?: () => void;
}

const USER_INTERACTION_DEBOUNCE_TIME = 1000; // 1 second
const FRAME_DURATION = 1/30; // Assuming 30fps for frame navigation

const Timeline: React.FC<TimelineProps> = ({ url, videoElement, onAudioScrubReady, onCreateLabel }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const [currentTime, setCurrentTime] = useState(0);
  const [prevUrl, setPrevUrl] = useState<string | null>(url);
  const [isInteracting, resetDebounce] = useInteractionDebouncer(USER_INTERACTION_DEBOUNCE_TIME);

  const [zoomLevel, setZoomLevel] = useState<number>(MIN_ZOOM);
  const [viewBoxStartTime, setViewBoxStartTime] = useState<number>(0);

  const labels = useSessionStore(state => state.labels);

  const {
    isLoading,
    duration,
    waveformData,
    audioContextRef,
    audioBufferRef,
    processAudioData,
    setWaveformData,
    setDuration,
  } = useAudioProcessing();

  const displayedDuration = duration > 0 && zoomLevel > 0 ? duration / zoomLevel : 0;

  const {
    isDragging,
    isPlaying,
    togglePlayPause,
    handleSeekStart,
  } = useTimelineControls({
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
  });

  const { handleZoomSliderChange, handleWheelZoom } = useTimelineZoom({
    duration,
    zoomLevel,
    setZoomLevel,
    viewBoxStartTime,
    setViewBoxStartTime,
    displayedDuration,
    canvasRef,
    resetDebounce,
  });

  const { handleWheelPan, handleScrollbarScrub } = useTimelinePan({
    duration,
    zoomLevel,
    viewBoxStartTime,
    setViewBoxStartTime,
    currentTime,
    isPlaying,
    isDragging,
    isInteracting,
    resetDebounce,
  });

  // Frame navigation functions
  const handlePreviousFrame = useCallback(() => {
    if (!videoElement || duration === 0) return;
    const newTime = Math.max(0, videoElement.currentTime - FRAME_DURATION);
    videoElement.currentTime = newTime;
    resetDebounce();
  }, [videoElement, duration, resetDebounce]);

  const handleNextFrame = useCallback(() => {
    if (!videoElement || duration === 0) return;
    const newTime = Math.min(duration, videoElement.currentTime + FRAME_DURATION);
    videoElement.currentTime = newTime;
    resetDebounce();
  }, [videoElement, duration, resetDebounce]);

  // Label navigation functions
  const handlePreviousLabel = useCallback(() => {
    if (!videoElement || duration === 0 || labels.length === 0) return;
    
    const currentVideoTime = videoElement.currentTime;
    const sortedLabels = [...labels].sort((a, b) => a.timestamp - b.timestamp);
    const previousLabel = sortedLabels
      .reverse()
      .find(label => label.timestamp < currentVideoTime - 0.1); // Small threshold to avoid current label
    
    if (previousLabel) {
      videoElement.currentTime = previousLabel.timestamp;
      resetDebounce();
    }
  }, [videoElement, duration, labels, resetDebounce]);

  const handleNextLabel = useCallback(() => {
    if (!videoElement || duration === 0 || labels.length === 0) return;
    
    const currentVideoTime = videoElement.currentTime;
    const sortedLabels = [...labels].sort((a, b) => a.timestamp - b.timestamp);
    const nextLabel = sortedLabels.find(label => label.timestamp > currentVideoTime + 0.1); // Small threshold to avoid current label
    
    if (nextLabel) {
      videoElement.currentTime = nextLabel.timestamp;
      resetDebounce();
    }
  }, [videoElement, duration, labels, resetDebounce]);

  // Audio scrubbing function for frame navigation
  const startAudioScrubbing = useCallback((time: number) => {
    if (!audioContextRef.current || !audioBufferRef.current || duration === 0) return;
    
    const SCRUB_AUDIO_GAIN = 0.3;
    const SCRUB_AUDIO_DURATION = 0.04; // 40ms scrub duration
    
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
    } catch (error) {
      console.error('Error during audio scrubbing:', error);
    }
  }, [audioContextRef, audioBufferRef, duration]);

  // Expose audio scrubbing function to parent
  useEffect(() => {
    if (onAudioScrubReady && audioContextRef.current && audioBufferRef.current) {
      onAudioScrubReady(startAudioScrubbing);
    }
  }, [onAudioScrubReady, startAudioScrubbing, audioContextRef.current, audioBufferRef.current]);

  const handleWheelScroll = useCallback((event: WheelEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || duration === 0 || isDragging) return;

    resetDebounce();
    event.preventDefault();
    event.stopPropagation();

    const { ctrlKey, metaKey } = event;
    const rect = canvas.getBoundingClientRect();
    const mouseXRelative = event.clientX - rect.left;

    if (ctrlKey || metaKey) {
      handleWheelZoom(event, mouseXRelative, rect.width);
    } else {
      handleWheelPan(event, rect.width);
    }
  }, [
    canvasRef,
    duration,
    isDragging,
    resetDebounce,
    handleWheelZoom,
    handleWheelPan
  ]);
  
  if (url !== prevUrl) {
    setPrevUrl(url);
    if (url) {
      processAudioData(url);
      setZoomLevel(MIN_ZOOM); 
      setViewBoxStartTime(0);   
    } else {
      setWaveformData([]);
      setDuration(0);
      setCurrentTime(0);
      setZoomLevel(MIN_ZOOM); 
      setViewBoxStartTime(0);   
    }
  }
  
  if (duration === 0) {
    if (viewBoxStartTime !== 0) setViewBoxStartTime(0);
    if (zoomLevel !== MIN_ZOOM) setZoomLevel(MIN_ZOOM);
  }

  useEffect(() => {
    if (!videoElement) return;
    const animate = () => {
      if (videoElement && !isDragging) {
        setCurrentTime(videoElement.currentTime);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [videoElement, isDragging, setCurrentTime]);

  const handleCanvasSeekStart = useCallback((time: number) => {
    if (videoElement) {
      handleSeekStart(time);
    }
  }, [videoElement, handleSeekStart]);

  return (
    <div className="flex flex-col gap-2 select-none">
      <TimelineWaveform
        ref={canvasRef}
        waveformData={waveformData}
        currentTime={currentTime}
        duration={duration}
        isLoading={isLoading}
        onSeekStart={handleCanvasSeekStart}
        zoomLevel={zoomLevel}
        viewBoxStartTime={viewBoxStartTime}
        labels={labels}
        displayedDuration={displayedDuration}
        onScrub={handleScrollbarScrub}
        handleWheelScroll={handleWheelScroll}
      />
      
      <TimelineControls
        togglePlayPause={togglePlayPause}
        isPlaying={isPlaying}
        isLoading={isLoading}
        duration={duration}
        currentTime={currentTime}
        zoomLevel={zoomLevel}
        handleZoomSliderChange={handleZoomSliderChange}
        displayedDuration={displayedDuration}
        onPreviousFrame={handlePreviousFrame}
        onNextFrame={handleNextFrame}
        onPreviousLabel={handlePreviousLabel}
        onNextLabel={handleNextLabel}
        onCreateLabel={onCreateLabel}
      />
    </div>
  )
}

export default Timeline

