import type { Label } from '../hooks/useLabels';

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
    const barCssHeight = Math.max(0.5, value * drawingAreaCssHeight * 0.9); // Bar height in CSS pixels
    const barDrawHeightOnCanvas = barCssHeight * dpr; // Convert CSS pixel height to device pixels for drawing
    const xOnCanvas = index * barWidthOnCanvas;
    const yOnCanvas = (canvasHeight - barDrawHeightOnCanvas) / 2; // Center vertically in the device pixel canvas

    const actualDataIndex = firstVisibleIndex + index;
    const barTime = (actualDataIndex / fullWaveformLength) * totalDuration;
    const isPlayed = barTime < currentPlayTime;
    
    ctx.fillStyle = isPlayed ? playedBarColor : unplayedBarColor;
    const actualBarWidthOnCanvas = Math.max(1 * dpr, barWidthOnCanvas - 0.5 * dpr);
    ctx.fillRect(xOnCanvas, yOnCanvas, actualBarWidthOnCanvas, barDrawHeightOnCanvas);
  });
};

// Helper function to draw label markers
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
      
      ctx.strokeStyle = markerColor;
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(markerX, 0);
      ctx.lineTo(markerX, canvasHeight);
      ctx.stroke();
    }
  });
};

// Helper function to draw the playhead
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
    ctx.strokeStyle = playheadColor;
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(progressXOnCanvas, 0);
    ctx.lineTo(progressXOnCanvas, canvasHeight);
    ctx.stroke();
  }
}; 