import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Minus, Plus } from "lucide-react"
import { useAudioProcessing } from '@/hooks/useAudioProcessing';
import { useTimelineControls } from '@/hooks/useTimelineControls';
import WaveformCanvas from '@/components/WaveformCanvas';
import CustomScrollbar from '@/components/CustomScrollbar';
import { clampViewBoxStartTime } from '@/lib/utils';
import { useInteractionDebouncer } from '@/hooks/useInteractionDebouncer';
import type { Label } from '@/hooks/useLabels';

interface TimelineProps {
  url: string | null;
  videoElement: HTMLVideoElement | null;
  labels: Label[];
  panToTimestampTarget: number | null;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 10;
const MOUSE_WHEEL_PAN_SENSITIVITY_FACTOR = 0.60;
const USER_INTERACTION_DEBOUNCE_TIME = 1000; // 1 second
const PLAYBACK_PAN_BUFFER_RATIO = 0.2;
const PLAYBACK_REPOSITION_FACTOR_LEFT = 0.3;
const PLAYBACK_REPOSITION_FACTOR_RIGHT = 0.7;
const VIEWBOX_UPDATE_THRESHOLD = 0.001;

const Timeline: React.FC<TimelineProps> = ({ url, videoElement, labels, panToTimestampTarget }) => {
  const canvasForwardRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const processedPanTargetRef = useRef<number | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(MIN_ZOOM);
  const [viewBoxStartTime, setViewBoxStartTime] = useState(0);
  const [isUserInteracting, pingUserInteraction] = useInteractionDebouncer(USER_INTERACTION_DEBOUNCE_TIME);
  const [prevUrl, setPrevUrl] = useState<string | null>(url);

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
    viewBoxStartTime,
    setViewBoxStartTime,
    displayedDuration,
  });

  useEffect(() => {
    if (
      panToTimestampTarget !== null &&
      panToTimestampTarget !== processedPanTargetRef.current &&
      duration > 0 && 
      zoomLevel > 0
    ) {
      const timeToCenter = panToTimestampTarget;
      const newDisplayedDuration = duration / zoomLevel;
      let newTargetViewBoxStartTime = timeToCenter - newDisplayedDuration / 2;

      newTargetViewBoxStartTime = clampViewBoxStartTime(
          newTargetViewBoxStartTime,
          duration,
          newDisplayedDuration
      );

      if (Math.abs(newTargetViewBoxStartTime - viewBoxStartTime) > VIEWBOX_UPDATE_THRESHOLD) {
          pingUserInteraction();
          setViewBoxStartTime(newTargetViewBoxStartTime);
      }
      processedPanTargetRef.current = panToTimestampTarget;
    }
    if (panToTimestampTarget === null && processedPanTargetRef.current !== null) {
      processedPanTargetRef.current = null;
    }
  }, [panToTimestampTarget, duration, zoomLevel, viewBoxStartTime, setViewBoxStartTime, pingUserInteraction]);

  useEffect(() => {
    if (duration === 0 || zoomLevel === MIN_ZOOM) {
        if (viewBoxStartTime !== 0) setViewBoxStartTime(0);
        return;
    }
    if (!isPlaying || isUserInteracting || isDragging) {
        return;
    }

    const newDisplayedDuration = displayedDuration;
    let newTargetViewBoxStartTime = viewBoxStartTime;
    const buffer = newDisplayedDuration * PLAYBACK_PAN_BUFFER_RATIO;
    let shouldAdjust = false;

    if (currentTime < viewBoxStartTime + buffer) {
        newTargetViewBoxStartTime = currentTime - newDisplayedDuration * PLAYBACK_REPOSITION_FACTOR_LEFT;
        shouldAdjust = true;
    } else if (currentTime > viewBoxStartTime + newDisplayedDuration - buffer) {
        newTargetViewBoxStartTime = currentTime - newDisplayedDuration * PLAYBACK_REPOSITION_FACTOR_RIGHT;
        shouldAdjust = true;
    }

    if (shouldAdjust) {
        newTargetViewBoxStartTime = clampViewBoxStartTime(
            newTargetViewBoxStartTime,
            duration,
            newDisplayedDuration
        );
        
        if (Math.abs(newTargetViewBoxStartTime - viewBoxStartTime) > VIEWBOX_UPDATE_THRESHOLD) {
            setViewBoxStartTime(newTargetViewBoxStartTime);
        }
    }
  }, [currentTime, duration, zoomLevel, viewBoxStartTime, isPlaying, isDragging, displayedDuration, setViewBoxStartTime, isUserInteracting, pingUserInteraction]);

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

  const handleCanvasSeekStart = useCallback((time: number) => {
    if (videoElement) {
      onCanvasSeekStart(time);
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
    
    newViewBoxStartTimeZoom = clampViewBoxStartTime(
        newViewBoxStartTimeZoom,
        duration,
        newDisplayedDurationZoom
    );

    setZoomLevel(newZoom);
    setViewBoxStartTime(newViewBoxStartTimeZoom);
    if (newZoom === MIN_ZOOM && viewBoxStartTime !== 0) setViewBoxStartTime(0);
  };

  const handleWheelScroll = useCallback((e: React.WheelEvent) => {
    const canvas = canvasForwardRef.current;
    if (!canvas || duration === 0 || isDragging) return;

    pingUserInteraction();

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
        calculatedViewBoxStartTime = clampViewBoxStartTime(
            calculatedViewBoxStartTime,
            duration,
            displayedDuration
        );
        
        if (Math.abs(calculatedViewBoxStartTime - viewBoxStartTime) > 0.00001) {
            setViewBoxStartTime(calculatedViewBoxStartTime);
        }
    }
  }, [zoomLevel, viewBoxStartTime, duration, displayedDuration, isDragging, canvasForwardRef, setViewBoxStartTime, pingUserInteraction]);

  const handleScrollbarScrub = useCallback((newStartTime: number) => {
    pingUserInteraction();

    setViewBoxStartTime(newStartTime);
  }, [setViewBoxStartTime, pingUserInteraction]);

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
          labels={labels}
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
              <Minus className="h-3.5 w-3.5" />
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
              <Plus className="h-3.5 w-3.5" />
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
