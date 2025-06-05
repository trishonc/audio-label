import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Minus, Plus } from "lucide-react"
import { useAudioProcessing } from '@/hooks/useAudioProcessing';
import { useTimelineControls } from '@/hooks/useTimelineControls';
import { useTimelineZoom, MIN_ZOOM } from '@/hooks/useTimelineZoom';
import { useTimelinePan } from '@/hooks/useTimelinePan';
import WaveformCanvas from '@/components/WaveformCanvas';
import CustomScrollbar from '@/components/CustomScrollbar';
import { formatTime } from '@/lib/utils';
import { useInteractionDebouncer } from '@/hooks/useInteractionDebouncer';
import { useSessionStore } from '@/store/sessionStore';

interface TimelineProps {
  url: string | null;
  videoElement: HTMLVideoElement | null;
  onAudioScrubReady?: (scrubFunction: (time: number) => void) => void;
}

const USER_INTERACTION_DEBOUNCE_TIME = 1000; // 1 second

const Timeline: React.FC<TimelineProps> = ({ url, videoElement, onAudioScrubReady }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const waveformContainerRef = useRef<HTMLDivElement>(null);

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

  const { handleZoomSliderChange, handleWheelZoom, increaseZoom, decreaseZoom } = useTimelineZoom({
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
  
  useEffect(() => {
    const container = waveformContainerRef.current;
    if (container && !isLoading) {
      const wheelListener = (event: WheelEvent) => handleWheelScroll(event);
      container.addEventListener('wheel', wheelListener, { passive: false });
      return () => {
        container.removeEventListener('wheel', wheelListener);
      };
    }
  }, [handleWheelScroll, waveformContainerRef, isLoading]);

  
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
      <div ref={waveformContainerRef} className="waveform-container relative">
        <WaveformCanvas
          ref={canvasRef}
          waveformData={waveformData}
          currentTime={currentTime}
          duration={duration}
          isLoading={isLoading}
          onSeekStart={handleCanvasSeekStart}
          height={80}
          zoomLevel={zoomLevel}
          viewBoxStartTime={viewBoxStartTime}
          labels={labels}
        />
      </div>
      
      {duration > 0 && (
        <CustomScrollbar
          viewBoxStartTime={viewBoxStartTime}
          displayedDuration={displayedDuration}
          totalDuration={duration}
          onScrub={handleScrollbarScrub}
          disabled={isLoading}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button onClick={togglePlayPause} variant="outline" size="icon" disabled={isLoading || duration === 0}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <div className="text-xs text-muted-foreground font-mono min-w-[70px] text-center tabular-nums bg-muted px-2 py-1 rounded">
            {formatTime(currentTime, zoomLevel, displayedDuration)}
          </div>
        </div>

        <div className="flex-grow flex items-center justify-center gap-2 max-w-xs">
          <Button onClick={decreaseZoom} variant="outline" size="icon" disabled={isLoading || zoomLevel <= MIN_ZOOM}>
            <Minus className="h-4 w-4" />
          </Button>
          <Slider
            min={MIN_ZOOM}
            max={20} // MAX_ZOOM is 20 (defined in useTimelineZoom)
            step={0.1}
            value={[zoomLevel]}
            onValueChange={handleZoomSliderChange}
            disabled={isLoading || duration === 0}
            className="w-full"
          />
          <Button onClick={increaseZoom} variant="outline" size="icon" disabled={isLoading || zoomLevel >= 20}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground font-mono min-w-[70px] text-center tabular-nums bg-muted px-2 py-1 rounded">
          {formatTime(duration, zoomLevel, displayedDuration)}
        </div>
      </div>
    </div>
  )
}

export default Timeline

