import React, { useRef, useEffect, useCallback, forwardRef } from 'react';

interface WaveformCanvasProps {
  waveformData: number[];
  currentTime: number;
  duration: number; // This is the total duration
  isLoading: boolean;
  onSeekStart: (time: number, clientX: number) => void;
  height?: number;
  zoomLevel: number;
  viewBoxStartTime: number;
}

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
  },
  ref
) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const drawWaveform = useCallback(() => {
    const canvas = ref && typeof ref !== 'function' ? ref.current : null;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height: canvasHeight } = canvas;
    const scaledHeight = canvasHeight / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, width, canvasHeight);

    const styles = getComputedStyle(document.documentElement);
    const backgroundColor = styles.getPropertyValue('--muted').trim();
    const primaryColor = styles.getPropertyValue('--primary').trim();
    const mutedForegroundColor = styles.getPropertyValue('--muted-foreground').trim();
    const destructiveColor = styles.getPropertyValue('--destructive').trim();

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, canvasHeight);

    if (waveformData.length === 0 && !isLoading) return;
    if (duration === 0) return; // Don't draw if duration is 0

    // Calculate the segment of waveformData to display
    const displayedDuration = duration / zoomLevel;
    const startIndex = Math.floor((viewBoxStartTime / duration) * waveformData.length);
    const endIndex = Math.ceil(((viewBoxStartTime + displayedDuration) / duration) * waveformData.length);
    const visibleWaveformData = waveformData.slice(startIndex, endIndex);
    
    if (visibleWaveformData.length === 0 && !isLoading) return; // if no data in view after slicing

    const barWidth = width / visibleWaveformData.length;

    visibleWaveformData.forEach((value, index) => {
      const barHeightValue = Math.max(0.5, value * scaledHeight * 0.9);
      const barDrawHeight = barHeightValue * (window.devicePixelRatio || 1);
      const x = index * barWidth;
      const y = (canvasHeight - barDrawHeight) / 2;

      // Determine if the bar is played relative to the overall currentTime and viewBoxStartTime
      const actualDataIndex = startIndex + index;
      const barTime = (actualDataIndex / waveformData.length) * duration;
      const isPlayed = barTime < currentTime;
      
      ctx.fillStyle = isPlayed ? primaryColor : mutedForegroundColor;
      ctx.fillRect(x, y, Math.max(1 * (window.devicePixelRatio || 1), barWidth - 0.5 * (window.devicePixelRatio || 1)), barDrawHeight);
    });

    // Draw progress line relative to the current viewBox
    if (currentTime >= viewBoxStartTime && currentTime <= viewBoxStartTime + displayedDuration) {
      const progressRatioInView = (currentTime - viewBoxStartTime) / displayedDuration;
      const progressX = progressRatioInView * width;
      ctx.strokeStyle = destructiveColor;
      ctx.lineWidth = 2 * (window.devicePixelRatio || 1);
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, canvasHeight);
      ctx.stroke();
    }
  }, [waveformData, currentTime, duration, isLoading, ref, zoomLevel, viewBoxStartTime]);

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
  }, [drawWaveform]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = ref && typeof ref !== 'function' ? ref.current : null;
    if (!canvas || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const progressInView = (e.clientX - rect.left) / rect.width;
    const displayedDuration = duration / zoomLevel;
    // Calculate time based on the visible portion of the waveform
    const time = viewBoxStartTime + progressInView * displayedDuration;
    const clampedTime = Math.max(0, Math.min(duration, time)); // Clamp to total duration

    onSeekStart(clampedTime, e.clientX);
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