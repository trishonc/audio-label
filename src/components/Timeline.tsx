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
import type { Label } from '@/hooks/useLabels';

interface TimelineProps {
  url: string | null;
  videoElement: HTMLVideoElement | null;
  labels: Label[];
  panToTimestampTarget: number | null;
}

const USER_INTERACTION_DEBOUNCE_TIME = 1000; // 1 second

const Timeline: React.FC<TimelineProps> = ({ url, videoElement, labels, panToTimestampTarget }) => {
  const canvasForwardRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const waveformContainerRef = useRef<HTMLDivElement>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [prevUrl, setPrevUrl] = useState<string | null>(url);

  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);

  const [isUserInteractingDebounced, pingUserInteraction] = useInteractionDebouncer(USER_INTERACTION_DEBOUNCE_TIME);

  // State for zoom and pan, managed by Timeline component
  const [zoomLevel, setZoomLevel] = useState<number>(MIN_ZOOM);
  const [viewBoxStartTime, setViewBoxStartTime] = useState<number>(0);

  const {
    isLoading: isAudioLoading,
    duration,
    waveformData,
    audioContextRef,
    audioBufferRef,
    processAudioData,
    setWaveformData,
    setDuration: setAudioDuration,
  } = useAudioProcessing();

  // Calculate displayedDuration based on current duration and zoomLevel
  const actualDisplayedDuration = duration > 0 && zoomLevel > 0 ? duration / zoomLevel : 0;

  const { handleZoomSliderChange, handleWheelZoom } = useTimelineZoom({
    duration,
    zoomLevel,
    setZoomLevel,
    viewBoxStartTime,
    setViewBoxStartTime,
    displayedDuration: actualDisplayedDuration,
    canvasForwardRef,
    pingUserInteraction,
  });

  const { 
    // displayedDuration is also returned by useTimelinePan, ensure it matches actualDisplayedDuration if used
    handleWheelPan, 
    handleScrollbarScrub 
  } = useTimelinePan({
    duration,
    zoomLevel, // Pass zoomLevel to calculate displayedDuration internally if needed
    viewBoxStartTime,
    setViewBoxStartTime,
    currentTime,
    isPlaying: isPlayingTimeline,
    isDraggingMediaSlider: isDraggingTimeline,
    isUserInteractingWithTimeline: isUserInteractingDebounced,
    pingUserInteraction,
    panToTimestampTarget,
    canvasForwardRef, // For potential internal use, though handleWheelPan takes canvasWidth
  });

  const {
    isPlaying: actualIsPlaying,
    isDragging: actualIsDragging,
    togglePlayPause,
    handleSeekStart,
  } = useTimelineControls({
    videoElement,
    audioContextRef,
    audioBufferRef,
    duration,
    setVideoCurrentTime: setCurrentTime,
    canvasRef: canvasForwardRef,
    viewBoxStartTime, 
    displayedDuration: actualDisplayedDuration, 
    pingUserInteraction,
    setViewBoxStartTime: setViewBoxStartTime, // Pass down the setter
  });

  useEffect(() => {
    setIsPlayingTimeline(actualIsPlaying);
  }, [actualIsPlaying]);

  useEffect(() => {
    setIsDraggingTimeline(actualIsDragging);
  }, [actualIsDragging]);

  // Combined wheel handler
  const handleWheelScroll = useCallback((event: WheelEvent) => {
    const canvas = canvasForwardRef.current;
    if (!canvas || duration === 0 || isDraggingTimeline) return;

    pingUserInteraction();
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
    canvasForwardRef, 
    duration, 
    isDraggingTimeline, 
    pingUserInteraction,
    handleWheelZoom, 
    handleWheelPan
  ]);
  
  useEffect(() => {
    const container = waveformContainerRef.current;
    if (container && handleWheelScroll) { 
      const wheelListener = (event: WheelEvent) => {
        handleWheelScroll(event);
      };
      container.addEventListener('wheel', wheelListener, { passive: false });
      return () => {
        container.removeEventListener('wheel', wheelListener);
      };
    }
  }, [handleWheelScroll, waveformContainerRef]);

  useEffect(() => {
    if (url !== prevUrl) {
      setPrevUrl(url);
      if (url) {
        processAudioData(url);
        setZoomLevel(MIN_ZOOM); // Reset zoom to min
        setViewBoxStartTime(0);   // Reset pan to start
      } else {
        setWaveformData([]);
        setAudioDuration(0);
        setCurrentTime(0);
        setZoomLevel(MIN_ZOOM); // Reset zoom to min
        setViewBoxStartTime(0);   // Reset pan to start
      }
    }
  }, [url, prevUrl, processAudioData, setWaveformData, setAudioDuration, setCurrentTime, setZoomLevel, setViewBoxStartTime]);
  
  // Effect to reset view if duration becomes 0 (e.g. audio error or cleared)
  useEffect(() => {
    if (duration === 0) {
        if (viewBoxStartTime !== 0) setViewBoxStartTime(0);
        if (zoomLevel !== MIN_ZOOM) setZoomLevel(MIN_ZOOM);
    }
  }, [duration, viewBoxStartTime, zoomLevel]); // setViewBoxStartTime & setZoomLevel are stable setters from useState

  useEffect(() => {
    if (!videoElement) return;
    const animate = () => {
      if (videoElement && !actualIsDragging) { 
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
  }, [videoElement, actualIsDragging, setCurrentTime]);

  const handleCanvasSeekStart = useCallback((time: number) => {
    if (videoElement) {
      handleSeekStart(time);
    }
  }, [videoElement, handleSeekStart]);

  const increaseZoom = () => {
    const newZoom = Math.min(zoomLevel + 1, 20); // MAX_ZOOM is 20
    if (newZoom !== zoomLevel) {
      handleZoomSliderChange([newZoom]);
    }
  };

  const decreaseZoom = () => {
    const newZoom = Math.max(zoomLevel - 1, MIN_ZOOM);
    if (newZoom !== zoomLevel) {
      handleZoomSliderChange([newZoom]);
    }
  };

  return (
    <div className="flex flex-col gap-2 select-none">
      <div ref={waveformContainerRef} className="waveform-container relative">
        <WaveformCanvas
          ref={canvasForwardRef}
          waveformData={waveformData}
          currentTime={currentTime}
          duration={duration}
          isLoading={isAudioLoading}
          onSeekStart={handleCanvasSeekStart}
          height={80}
          zoomLevel={zoomLevel} // Pass current zoomLevel state
          viewBoxStartTime={viewBoxStartTime} // Pass current viewBoxStartTime state
          labels={labels}
        />
      </div>
      
      {duration > 0 && (
        <CustomScrollbar
          viewBoxStartTime={viewBoxStartTime} // Pass current viewBoxStartTime state
          displayedDuration={actualDisplayedDuration} // Pass calculated displayed duration
          totalDuration={duration}
          onScrub={handleScrollbarScrub} // From useTimelinePan
          disabled={isAudioLoading}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button onClick={togglePlayPause} variant="outline" size="icon" disabled={isAudioLoading || duration === 0}>
            {actualIsPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <div className="text-xs text-muted-foreground font-mono min-w-[70px] text-center tabular-nums bg-muted px-2 py-1 rounded">
            {formatTime(currentTime, zoomLevel, actualDisplayedDuration)}
          </div>
        </div>

        <div className="flex-grow flex items-center justify-center gap-2 max-w-xs">
          <Button onClick={decreaseZoom} variant="outline" size="icon" disabled={isAudioLoading || zoomLevel <= MIN_ZOOM}>
            <Minus className="h-4 w-4" />
          </Button>
          <Slider
            min={MIN_ZOOM} // Use exported MIN_ZOOM
            max={20}       // MAX_ZOOM is 20 (can be imported or hardcoded if stable)
            step={0.1}
            value={[zoomLevel]}
            onValueChange={handleZoomSliderChange} // From useTimelineZoom
            disabled={isAudioLoading || duration === 0}
            className="w-full"
          />
          <Button onClick={increaseZoom} variant="outline" size="icon" disabled={isAudioLoading || zoomLevel >= 20}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground font-mono min-w-[70px] text-center tabular-nums bg-muted px-2 py-1 rounded">
          {formatTime(duration, zoomLevel, actualDisplayedDuration)}
        </div>
      </div>
    </div>
  )
}

export default Timeline

