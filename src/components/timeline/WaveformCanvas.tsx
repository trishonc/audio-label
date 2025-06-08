import React, { useRef, useEffect, useCallback, forwardRef, useState } from 'react';
import type { Label } from '@/lib/types'; // Updated import path
import { useTheme } from '@/components/ThemeProvider';
import {
  renderBackground,
  renderBars,
  renderLabelMarkers,
  renderPlayhead,
} from '../../lib/waveform-drawing-utils';

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

// Renamed from _getVisibleData, kept within WaveformCanvas.tsx
const getVisibleData = (
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
  const { theme } = useTheme();
  const [themeColors, setThemeColors] = useState({
    backgroundColor: '#000000', // Default fallback
    primaryColor: '#FFFFFF',
    mutedForegroundColor: '#888888',
    destructiveColor: '#FF0000',
  });

  useEffect(() => {
    requestAnimationFrame(() => {
      const styles = getComputedStyle(document.documentElement);
      setThemeColors({
        backgroundColor: styles.getPropertyValue('--background').trim(),
        primaryColor: styles.getPropertyValue('--primary').trim(),
        mutedForegroundColor: styles.getPropertyValue('--muted-foreground').trim(),
        destructiveColor: styles.getPropertyValue('--destructive').trim(),
      });
    });
  }, [theme]);

  const drawWaveform = useCallback(() => {
    const canvas = ref && typeof ref !== 'function' ? ref.current : null;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use the same enhanced DPR as in updateCanvasSize
    const dpr = Math.min(window.devicePixelRatio * 1.5, 3);
    const { width: canvasWidth, height: canvasHeight } = canvas; // These are pixel dimensions (scaled by DPR)
    
    // Enable high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // This is the canvas height in CSS pixels, which acts as the context for bar height calculation.
    const cssCanvasHeight = canvasHeight / dpr; 

    renderBackground(ctx, canvasWidth, canvasHeight, themeColors.backgroundColor);

    if ((waveformData.length === 0 && !isLoading) || duration === 0) return;

    const { 
      visibleSegment,
      startIndex,
      displayedDuration 
    } = getVisibleData(waveformData, duration, zoomLevel, viewBoxStartTime);

    if (visibleSegment.length === 0 && !isLoading) return;

    renderBars(
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

    renderLabelMarkers(
      ctx,
      labels,
      viewBoxStartTime,
      displayedDuration,
      canvasWidth,
      canvasHeight,
      '#22c55e', // Green color for markers (Tailwind green-500)
      dpr
    );

    renderPlayhead(
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
    // Use higher DPR for smoother rendering, up to 3x for better quality
    const dpr = Math.min(window.devicePixelRatio * 1.5, 3);
    
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;
    
    // Enable better canvas rendering
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
    
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