import type { Label } from '@/lib/types';

// Helper function to clear and draw the background
export const renderBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string
) => {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
};

// Helper function to draw the waveform bars
export const renderBars = (
  ctx: CanvasRenderingContext2D,
  dataToDraw: number[],
  width: number,
  height: number,
  fullWaveformLength: number,
  totalDuration: number,
  currentPlayTime: number,
  playedBarColor: string,
  unplayedBarColor: string,
  firstVisibleIndex: number
) => {
  if (dataToDraw.length === 0 || totalDuration === 0) return;

  const barWidth = width / dataToDraw.length;
  const centerY = height / 2;

  dataToDraw.forEach((value, index) => {
    const barHeight = Math.max(0.5, value * height * 0.9);
    const x = index * barWidth;
    const y = centerY - barHeight / 2;

    const actualDataIndex = firstVisibleIndex + index;
    const barTime = (actualDataIndex / fullWaveformLength) * totalDuration;
    const isPlayed = barTime < currentPlayTime;
    
    ctx.fillStyle = isPlayed ? playedBarColor : unplayedBarColor;
    
    const actualBarWidth = Math.max(1, barWidth - 0.5);
    const cornerRadius = Math.min(actualBarWidth * 0.1, 2);
    
    if (cornerRadius > 0 && barHeight > cornerRadius * 2) {
      ctx.beginPath();
      ctx.roundRect(x, y, actualBarWidth, barHeight, cornerRadius);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, actualBarWidth, barHeight);
    }
  });
};

// Helper function to draw label markers
export const renderLabelMarkers = (
  ctx: CanvasRenderingContext2D,
  labels: Label[],
  viewBoxStartTime: number,
  displayedDuration: number,
  width: number,
  height: number,
  markerColor: string
) => {
  if (displayedDuration === 0 || labels.length === 0) return;

  labels.forEach(label => {
    if (label.timestamp >= viewBoxStartTime && label.timestamp <= viewBoxStartTime + displayedDuration) {
      const relativeTimestamp = label.timestamp - viewBoxStartTime;
      const markerX = (relativeTimestamp / displayedDuration) * width;
      
      ctx.strokeStyle = markerColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(markerX, 0);
      ctx.lineTo(markerX, height);
      ctx.stroke();
    }
  });
};

// Helper function to draw playhead
export const renderPlayhead = (
  ctx: CanvasRenderingContext2D,
  currentPlayTime: number,
  currentViewBoxStartTime: number,
  currentDisplayedDuration: number,
  width: number,
  height: number,
  playheadColor: string
) => {
  if (currentDisplayedDuration === 0) return;
  if (currentPlayTime >= currentViewBoxStartTime && currentPlayTime <= currentViewBoxStartTime + currentDisplayedDuration) {
    const progressRatioInView = (currentPlayTime - currentViewBoxStartTime) / currentDisplayedDuration;
    const progressX = progressRatioInView * width;
    
    ctx.strokeStyle = playheadColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.stroke();
  }
}; 