import React, { useRef, useEffect, useCallback, forwardRef, useState } from 'react';
import type { Label } from '../hooks/useLabels'; // Updated import path

interface WaveformCanvasProps {
  waveformData: number[];
  currentTime: number;
  duration: number; // This is the total duration
  isLoading: boolean;
  onSeekStart: (time: number) => void;
  height?: number;
  zoomLevel: number;
  viewBoxStartTime: number;
  labels: Label[]; // Added labels prop
}

// Helper function to clear and draw the background
const _renderBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string
) => {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
};

// Helper function to calculate the visible segment of waveform data
const _getVisibleData = (
  fullWaveformData: number[],
  totalDuration: number,
  currentZoomLevel: number,
  currentViewBoxStartTime: number
): { visibleSegment: number[]; startIndex: number; endIndex: number, displayedDuration: number } => {
  if (totalDuration === 0 || currentZoomLevel === 0) {
    return { visibleSegment: [], startIndex: 0, endIndex: 0, displayedDuration: 0 };
  }
  const displayedDuration = totalDuration / currentZoomLevel;
  const startIndex = Math.floor((currentViewBoxStartTime / totalDuration) * fullWaveformData.length);
  const endIndex = Math.ceil(((currentViewBoxStartTime + displayedDuration) / totalDuration) * fullWaveformData.length);
  const visibleSegment = fullWaveformData.slice(startIndex, endIndex);
  return { visibleSegment, startIndex, endIndex, displayedDuration };
};

// Helper function to draw the waveform bars
const _renderBars = (
  ctx: CanvasRenderingContext2D,
  dataToDraw: number[],
  canvasWidth: number,
  canvasHeight: number,
  drawingAreaCssHeight: number, // The CSS height of the area in which bars are drawn
  fullWaveformLength: number,
  totalDuration: number,
  currentPlayTime: number,
  playedBarColor: string,
  unplayedBarColor: string,
  firstVisibleIndex: number, // The index in the *full* waveformData array that corresponds to dataToDraw[0]
  dpr: number
) => {
  if (dataToDraw.length === 0 || totalDuration === 0) return;

  const barWidthOnCanvas = canvasWidth / dataToDraw.length; // Width of each bar on the canvas

  dataToDraw.forEach((value, index) => {
    // Calculate bar height based on its value, the CSS height of the drawing area, and a scaling factor (0.9)
    const barCssHeight = Math.max(0.5, value * drawingAreaCssHeight * 0.9); // Bar height in CSS pixels
    const barDrawHeightOnCanvas = barCssHeight * dpr; // Convert CSS pixel height to device pixels for drawing
    const xOnCanvas = index * barWidthOnCanvas;
    const yOnCanvas = (canvasHeight - barDrawHeightOnCanvas) / 2; // Center vertically in the device pixel canvas

    const actualDataIndex = firstVisibleIndex + index;
    const barTime = (actualDataIndex / fullWaveformLength) * totalDuration;
    const isPlayed = barTime < currentPlayTime;
    
    ctx.fillStyle = isPlayed ? playedBarColor : unplayedBarColor;
    // Ensure minimum bar width is 1 physical pixel, with a small gap
    const actualBarWidthOnCanvas = Math.max(1 * dpr, barWidthOnCanvas - 0.5 * dpr);
    ctx.fillRect(xOnCanvas, yOnCanvas, actualBarWidthOnCanvas, barDrawHeightOnCanvas);
  });
};

// Helper function to draw label markers
const _renderLabelMarkers = (
  ctx: CanvasRenderingContext2D,
  labels: Label[],
  viewBoxStartTime: number,
  displayedDuration: number,
  canvasWidth: number,
  canvasHeight: number,
  markerColor: string,
  dpr: number
) => {
  if (displayedDuration === 0 || labels.length === 0) return;

  labels.forEach(label => {
    if (label.timestamp >= viewBoxStartTime && label.timestamp <= viewBoxStartTime + displayedDuration) {
      const relativeTimestamp = label.timestamp - viewBoxStartTime;
      const markerX = (relativeTimestamp / displayedDuration) * canvasWidth;
      
      ctx.strokeStyle = markerColor;
      ctx.lineWidth = 1.5 * dpr; // Make it slightly thicker than 1dpr for visibility
      ctx.beginPath();
      ctx.moveTo(markerX, 0);
      ctx.lineTo(markerX, canvasHeight);
      ctx.stroke();
    }
  });
};

// Helper function to draw the playhead
const _renderPlayhead = (
  ctx: CanvasRenderingContext2D,
  currentPlayTime: number,
  currentViewBoxStartTime: number,
  currentDisplayedDuration: number,
  canvasWidth: number,
  canvasHeight: number,
  playheadColor: string,
  dpr: number
) => {
  if (currentDisplayedDuration === 0) return;
  if (currentPlayTime >= currentViewBoxStartTime && currentPlayTime <= currentViewBoxStartTime + currentDisplayedDuration) {
    const progressRatioInView = (currentPlayTime - currentViewBoxStartTime) / currentDisplayedDuration;
    const progressXOnCanvas = progressRatioInView * canvasWidth;
    ctx.strokeStyle = playheadColor;
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(progressXOnCanvas, 0);
    ctx.lineTo(progressXOnCanvas, canvasHeight);
    ctx.stroke();
  }
};

const WaveformCanvas = forwardRef<HTMLCanvasElement, WaveformCanvasProps>((
  {
    waveformData,
    currentTime,
    duration, // Total duration
    isLoading,
    onSeekStart,
    height = 80,
    zoomLevel,
    viewBoxStartTime,
    labels, // Destructure labels
  },
  ref
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [themeColors, setThemeColors] = useState({
    backgroundColor: '#000000', // Default fallback
    primaryColor: '#FFFFFF',
    mutedForegroundColor: '#888888',
    destructiveColor: '#FF0000',
  });

  useEffect(() => {
    // Fetch theme colors once on mount
    const styles = getComputedStyle(document.documentElement);
    setThemeColors({
      backgroundColor: styles.getPropertyValue('--muted').trim() || '#000000',
      primaryColor: styles.getPropertyValue('--primary').trim() || '#FFFFFF',
      mutedForegroundColor: styles.getPropertyValue('--muted-foreground').trim() || '#888888',
      destructiveColor: styles.getPropertyValue('--destructive').trim() || '#FF0000',
    });
  }, []); // Empty dependency array ensures this runs only once

  const drawWaveform = useCallback(() => {
    const canvas = ref && typeof ref !== 'function' ? ref.current : null;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { width: canvasWidth, height: canvasHeight } = canvas; // These are pixel dimensions (scaled by DPR)
    
    // CORRECTED: This is the canvas height in CSS pixels, which acts as the context for bar height calculation.
    const cssCanvasHeight = canvasHeight / dpr; 

    _renderBackground(ctx, canvasWidth, canvasHeight, themeColors.backgroundColor);

    if ((waveformData.length === 0 && !isLoading) || duration === 0) return;

    const { 
      visibleSegment,
      startIndex,
      // endIndex, // not directly used by drawing helpers but good to have from _getVisibleData
      displayedDuration 
    } = _getVisibleData(waveformData, duration, zoomLevel, viewBoxStartTime);

    if (visibleSegment.length === 0 && !isLoading) return;

    _renderBars(
      ctx,
      visibleSegment,
      canvasWidth,
      canvasHeight,
      cssCanvasHeight, // Pass the CSS height of the canvas as the context for bar scaling
      waveformData.length,
      duration,
      currentTime,
      themeColors.primaryColor,
      themeColors.mutedForegroundColor,
      startIndex,
      dpr
    );

    // Add call to render label markers (after bars, before playhead)
    _renderLabelMarkers(
      ctx,
      labels,
      viewBoxStartTime,
      displayedDuration,
      canvasWidth,
      canvasHeight,
      '#22c55e', // Green color for markers (Tailwind green-500)
      dpr
    );

    _renderPlayhead(
      ctx,
      currentTime,
      viewBoxStartTime,
      displayedDuration,
      canvasWidth,
      canvasHeight,
      themeColors.destructiveColor,
      dpr
    );
  }, [
    waveformData, 
    currentTime, 
    duration, 
    isLoading, 
    ref, 
    zoomLevel, 
    viewBoxStartTime, 
    labels, // Add labels to dependency array
    themeColors
  ]);

  const updateCanvasSize = useCallback(() => {
    const canvas = ref && typeof ref !== 'function' ? ref.current : null;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;
    
    drawWaveform();
  }, [drawWaveform, height, ref]);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [updateCanvasSize]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform, themeColors]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = ref && typeof ref !== 'function' ? ref.current : null;
    if (!canvas || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const progressInView = (e.clientX - rect.left) / rect.width;
    const displayedDuration = duration / zoomLevel;
    // Calculate time based on the visible portion of the waveform
    const time = viewBoxStartTime + progressInView * displayedDuration;
    const clampedTime = Math.max(0, Math.min(duration, time)); // Clamp to total duration

    onSeekStart(clampedTime);
  };

  return (
    <div 
      ref={containerRef}
      className="relative bg-background border border-border rounded-md overflow-hidden shadow-sm"
    >
      <canvas
        ref={ref}
        className="w-full cursor-pointer hover:bg-muted/50 transition-colors"
        onMouseDown={handleMouseDown}
        style={{ height: `${height}px` }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent animate-spin rounded-full" />
            Loading waveform...
          </div>
        </div>
      )}
    </div>
  );
});

WaveformCanvas.displayName = 'WaveformCanvas';

export default WaveformCanvas; 