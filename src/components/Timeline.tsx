import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause } from "lucide-react"
import { useAudioProcessing } from '@/hooks/useAudioProcessing';
import { useTimelineControls } from '@/hooks/useTimelineControls';
import WaveformCanvas from '@/components/WaveformCanvas';
import CustomScrollbar from '@/components/CustomScrollbar';

interface TimelineProps {
  url: string | null
  videoElement: HTMLVideoElement | null
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 10;
const MOUSE_WHEEL_PAN_SENSITIVITY_FACTOR = 0.60;
const USER_INTERACTION_DEBOUNCE_TIME = 1000; // 1 second

const Timeline: React.FC<TimelineProps> = ({ url, videoElement }) => {
  const canvasForwardRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Added for interaction debounce

  const [currentTime, setCurrentTime] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(MIN_ZOOM)
  const [viewBoxStartTime, setViewBoxStartTime] = useState(0)
  const [userInteractingView, setUserInteractingView] = useState(false); // Added state for user interaction

  const {
    isLoading: isAudioLoading,
    duration,
    waveformData,
    audioContextRef,
    audioBufferRef,
    processAudioData,
    setWaveformData,
    setDuration,
  } = useAudioProcessing();

  const displayedDuration = duration / zoomLevel;

  const {
    isPlaying,
    isDragging,
    togglePlayPause,
    handleSeekStart: onCanvasSeekStart,
  } = useTimelineControls({
    videoElement,
    audioContextRef,
    audioBufferRef,
    duration,
    setVideoCurrentTime: setCurrentTime,
    canvasRef: canvasForwardRef,
    zoomLevel,
    viewBoxStartTime,
    setViewBoxStartTime,
    displayedDuration,
  });

  useEffect(() => {
    if (url) {
      processAudioData(url)
      setZoomLevel(MIN_ZOOM)
      setViewBoxStartTime(0)
    } else {
      setWaveformData([])
      setDuration(0)
      setCurrentTime(0)
      setZoomLevel(MIN_ZOOM)
      setViewBoxStartTime(0)
    }
  }, [url, processAudioData, setWaveformData, setDuration, setCurrentTime])

  useEffect(() => {
    if (duration === 0 || zoomLevel === MIN_ZOOM) {
        if (viewBoxStartTime !== 0) setViewBoxStartTime(0);
        return;
    }
    if (!isPlaying || isDragging || userInteractingView) {
        return;
    }

    const newDisplayedDuration = displayedDuration;
    let newTargetViewBoxStartTime = viewBoxStartTime;

    const buffer = newDisplayedDuration * 0.2;

    let shouldAdjust = false;
    if (currentTime < viewBoxStartTime + buffer && currentTime > 0) {
        newTargetViewBoxStartTime = currentTime - newDisplayedDuration * 0.3;
        shouldAdjust = true;
    } else if (currentTime > viewBoxStartTime + newDisplayedDuration - buffer) {
        newTargetViewBoxStartTime = currentTime - newDisplayedDuration * 0.7;
        shouldAdjust = true;
    }

    if (shouldAdjust) {
        newTargetViewBoxStartTime = Math.max(0, Math.min(newTargetViewBoxStartTime, duration - newDisplayedDuration));
        
        if (duration - newDisplayedDuration <= 0) {
            newTargetViewBoxStartTime = 0;
        }

        if (Math.abs(newTargetViewBoxStartTime - viewBoxStartTime) > 0.001) {
            setViewBoxStartTime(newTargetViewBoxStartTime);
        }
    }
  }, [currentTime, duration, zoomLevel, viewBoxStartTime, isPlaying, isDragging, displayedDuration, setViewBoxStartTime, userInteractingView]);

  useEffect(() => {
    if (!videoElement) return
    const animate = () => {
      if (videoElement && !isDragging) {
        setCurrentTime(videoElement.currentTime)
      }
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    animationFrameRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [videoElement, isDragging, setCurrentTime])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const millis = Math.floor((seconds - (mins * 60) - secs) * 100);
    if (zoomLevel > 5 || displayedDuration < 15) { 
        return `${mins}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleCanvasSeekStart = useCallback((time: number, clientX: number) => {
    if (videoElement) {
      onCanvasSeekStart(time, clientX)
    }
  }, [videoElement, onCanvasSeekStart])

  const handleZoomSliderChange = (value: number[]) => {
    const newZoom = value[0];
    if (newZoom === zoomLevel) return;
    const canvas = canvasForwardRef.current;
    if (!canvas || duration === 0) {
      setZoomLevel(newZoom);
      if (newZoom === MIN_ZOOM) setViewBoxStartTime(0);
      return;
    }
    const centerTimeOfView = viewBoxStartTime + displayedDuration / 2;
    const newDisplayedDurationZoom = duration / newZoom;
    let newViewBoxStartTimeZoom = centerTimeOfView - newDisplayedDurationZoom / 2;
    newViewBoxStartTimeZoom = Math.max(0, Math.min(newViewBoxStartTimeZoom, duration - newDisplayedDurationZoom));
    if (duration - newDisplayedDurationZoom <= 0) newViewBoxStartTimeZoom = 0;
    setZoomLevel(newZoom);
    setViewBoxStartTime(newViewBoxStartTimeZoom);
    if (newZoom === MIN_ZOOM && viewBoxStartTime !== 0) setViewBoxStartTime(0);
  };

  const handleWheelScroll = useCallback((e: React.WheelEvent) => {
    const canvas = canvasForwardRef.current;
    if (!canvas || duration === 0 || isDragging) return;

    // Clear any existing timeout and mark as interacting
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    setUserInteractingView(true);

    const { deltaX, deltaY, metaKey, shiftKey } = e;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    let calculatedViewBoxStartTime = viewBoxStartTime;
    let intentToPan = false;

    const isPixelScroll = e.deltaMode === WheelEvent.DOM_DELTA_PIXEL;
    const minDeltaThreshold = isPixelScroll ? 2 : 0.2; 

    // 1. Meta Key (Cmd/Windows) for browser default behavior (e.g., page zoom)
    if (metaKey) {
        return; // Do not prevent default, let browser handle it
    }

    // 2. Explicit Pan with Shift key
    if (shiftKey && (absDeltaX > minDeltaThreshold || absDeltaY > minDeltaThreshold)) {
        e.preventDefault();
        e.stopPropagation();
        intentToPan = true;
        const panDelta = absDeltaX > absDeltaY * 0.5 ? deltaX : deltaY; // Prioritize X, fallback to Y for trackpads
        const timeDelta = (panDelta / canvas.getBoundingClientRect().width) * displayedDuration * MOUSE_WHEEL_PAN_SENSITIVITY_FACTOR;
        calculatedViewBoxStartTime = viewBoxStartTime + timeDelta;
    }
    // 3. Unmodified Mouse Wheel or Trackpad Swipe (horizontal pan only)
    else if (!metaKey && !shiftKey) {
        if (absDeltaX > minDeltaThreshold) { // Horizontal Pan only
            e.preventDefault();
            e.stopPropagation();
            intentToPan = true;
            const timeDelta = (deltaX / canvas.getBoundingClientRect().width) * displayedDuration * MOUSE_WHEEL_PAN_SENSITIVITY_FACTOR;
            calculatedViewBoxStartTime = viewBoxStartTime + timeDelta;
        }
    }

    // Apply pan changes if needed
    if (intentToPan) {
        // Clamp calculatedViewBoxStartTime
        calculatedViewBoxStartTime = Math.max(0, Math.min(calculatedViewBoxStartTime, duration - displayedDuration));
        if (duration - displayedDuration <= 0) {
            calculatedViewBoxStartTime = 0;
        }
        
        if (Math.abs(calculatedViewBoxStartTime - viewBoxStartTime) > 0.00001) {
            setViewBoxStartTime(calculatedViewBoxStartTime);
        }
    }

    // Set a timeout to mark interaction as ended
    interactionTimeoutRef.current = setTimeout(() => {
      setUserInteractingView(false);
    }, USER_INTERACTION_DEBOUNCE_TIME);
  }, [zoomLevel, viewBoxStartTime, duration, displayedDuration, isDragging, canvasForwardRef, setViewBoxStartTime]);

  const handleScrollbarScrub = (newStartTime: number) => {
    // Clear any existing timeout and mark as interacting
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    setUserInteractingView(true);

    setViewBoxStartTime(newStartTime);

    // Set a timeout to mark interaction as ended
    interactionTimeoutRef.current = setTimeout(() => {
      setUserInteractingView(false);
    }, USER_INTERACTION_DEBOUNCE_TIME);
  };

  return (
    <div className="w-full space-y-1">
      <div 
        ref={waveformContainerRef} 
        onWheel={handleWheelScroll} 
        className="w-full relative cursor-grab active:cursor-grabbing select-none touch-none"
        tabIndex={-1} 
      >
        <WaveformCanvas
          ref={canvasForwardRef}
          waveformData={waveformData}
          currentTime={currentTime}
          duration={duration}
          isLoading={isAudioLoading}
          onSeekStart={handleCanvasSeekStart}
          zoomLevel={zoomLevel}
          viewBoxStartTime={viewBoxStartTime}
        />
      </div>
      <div className="px-1 pb-1">
        <CustomScrollbar
          totalDuration={duration}
          viewBoxStartTime={viewBoxStartTime}
          displayedDuration={displayedDuration}
          onScrub={handleScrollbarScrub}
          disabled={isAudioLoading || duration === 0 || zoomLevel <= MIN_ZOOM + 0.001}
        />
      </div>
      <div className="flex justify-between items-center text-xs text-muted-foreground font-mono pt-1">
        <span className="bg-muted px-2 py-1 rounded min-w-[70px] text-center tabular-nums">{formatTime(viewBoxStartTime)}</span>
        <div className="flex items-center gap-2 flex-grow justify-center px-1 max-w-md mx-auto">
          <Button
              variant="outline"
              size="icon"
              onClick={() => handleZoomSliderChange([Math.max(MIN_ZOOM, zoomLevel / 1.5)])}
              disabled={zoomLevel <= MIN_ZOOM || isAudioLoading || duration === 0}
              className="h-7 w-7 p-0"
              title="Zoom Out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </Button>
          <Slider
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={zoomLevel < 5 ? 0.1 : (zoomLevel < 20 ? 0.5 : 1)} 
            value={[zoomLevel]}
            onValueChange={handleZoomSliderChange}
            disabled={isAudioLoading || duration === 0}
            className="w-full min-w-[120px] max-w-[200px] data-[disabled]:opacity-50 mx-1"
            aria-label="Zoom Level"
          />
           <Button
              variant="outline"
              size="icon"
              onClick={() => handleZoomSliderChange([Math.min(MAX_ZOOM, zoomLevel * 1.5)])}
              disabled={zoomLevel >= MAX_ZOOM || isAudioLoading || duration === 0}
              className="h-7 w-7 p-0"
              title="Zoom In"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={togglePlayPause}
            disabled={!videoElement || duration === 0 || isAudioLoading}
            className="h-8 w-8 p-0 ml-2"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
          </Button>
        </div>
        <span className="bg-muted px-2 py-1 rounded min-w-[70px] text-center tabular-nums">{formatTime(Math.min(viewBoxStartTime + displayedDuration, duration))}</span>
      </div>
    </div>
  )
}

export default Timeline
