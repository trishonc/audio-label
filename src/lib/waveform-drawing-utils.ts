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

// Helper function to draw the waveform bars with enhanced quality
export const renderBars = (
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

  // Enable anti-aliasing for smoother rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const barWidthOnCanvas = canvasWidth / dataToDraw.length; // Width of each bar on the canvas

  dataToDraw.forEach((value, index) => {
    const barCssHeight = Math.max(0.5, value * drawingAreaCssHeight * 0.9); // Bar height in CSS pixels
    const barDrawHeightOnCanvas = barCssHeight * dpr; // Convert CSS pixel height to device pixels for drawing
    const xOnCanvas = index * barWidthOnCanvas;
    const yOnCanvas = (canvasHeight - barDrawHeightOnCanvas) / 2; // Center vertically in the device pixel canvas

    const actualDataIndex = firstVisibleIndex + index;
    const barTime = (actualDataIndex / fullWaveformLength) * totalDuration;
    const isPlayed = barTime < currentPlayTime;
    
    ctx.fillStyle = isPlayed ? playedBarColor : unplayedBarColor;
    const actualBarWidthOnCanvas = Math.max(1 * dpr, barWidthOnCanvas - 0.5 * dpr);
    
    // Add subtle rounded corners for smoother appearance
    const cornerRadius = Math.min(actualBarWidthOnCanvas * 0.1, 2 * dpr);
    
    if (cornerRadius > 0 && barDrawHeightOnCanvas > cornerRadius * 2) {
      // Draw rounded rectangle
      ctx.beginPath();
      ctx.roundRect(xOnCanvas, yOnCanvas, actualBarWidthOnCanvas, barDrawHeightOnCanvas, cornerRadius);
      ctx.fill();
    } else {
      // Fallback to regular rectangle
      ctx.fillRect(xOnCanvas, yOnCanvas, actualBarWidthOnCanvas, barDrawHeightOnCanvas);
    }
  });
};

// Helper function to draw smooth label markers with glow effect
export const renderLabelMarkers = (
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
      
      // Add subtle glow effect
      ctx.shadowColor = markerColor;
      ctx.shadowBlur = 4 * dpr;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      ctx.strokeStyle = markerColor;
      ctx.lineWidth = 2 * dpr;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(markerX, 0);
      ctx.lineTo(markerX, canvasHeight);
      ctx.stroke();
      
      // Reset shadow
      ctx.shadowBlur = 0;
    }
  });
};

// Helper function to draw smooth playhead with glow effect
export const renderPlayhead = (
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
    
    // Add glow effect for playhead
    ctx.shadowColor = playheadColor;
    ctx.shadowBlur = 6 * dpr;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.strokeStyle = playheadColor;
    ctx.lineWidth = 2.5 * dpr;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(progressXOnCanvas, 0);
    ctx.lineTo(progressXOnCanvas, canvasHeight);
    ctx.stroke();
    
    // Draw a subtle wider line behind for more visibility
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 4 * dpr;
    ctx.beginPath();
    ctx.moveTo(progressXOnCanvas, 0);
    ctx.lineTo(progressXOnCanvas, canvasHeight);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}; 