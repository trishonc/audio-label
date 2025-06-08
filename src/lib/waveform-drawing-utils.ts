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

// Helper function to interpolate between points for smooth curves
const interpolatePoints = (points: { x: number; y: number }[], tension: number = 0.3): { x: number; y: number }[] => {
  if (points.length < 3) return points;
  
  const interpolated: { x: number; y: number }[] = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    
    // Add the original point
    interpolated.push(p1);
    
    // Add interpolated points between p1 and p2
    const steps = 3; // Number of interpolated points between each pair
    for (let j = 1; j < steps; j++) {
      const t = j / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      
      // Catmull-Rom spline interpolation
      const x = 0.5 * ((2 * p1.x) + 
                      (-p0.x + p2.x) * t + 
                      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + 
                      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      
      const y = 0.5 * ((2 * p1.y) + 
                      (-p0.y + p2.y) * t + 
                      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + 
                      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
      
      interpolated.push({ x, y });
    }
  }
  
  // Add the last point
  interpolated.push(points[points.length - 1]);
  return interpolated;
};

// Helper function to draw smooth waveform with curves and gradients
export const renderBars = (
  ctx: CanvasRenderingContext2D,
  dataToDraw: number[],
  canvasWidth: number,
  canvasHeight: number,
  drawingAreaCssHeight: number,
  fullWaveformLength: number,
  totalDuration: number,
  currentPlayTime: number,
  playedBarColor: string,
  unplayedBarColor: string,
  firstVisibleIndex: number,
  dpr: number
) => {
  if (dataToDraw.length === 0 || totalDuration === 0) return;

  // Enable anti-aliasing for smoother rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const centerY = canvasHeight / 2;
  const stepWidth = canvasWidth / (dataToDraw.length - 1 || 1);
  
  // Generate points for smooth curves
  const topPoints: { x: number; y: number }[] = [];
  const bottomPoints: { x: number; y: number }[] = [];
  
  dataToDraw.forEach((value, index) => {
    const x = index * stepWidth;
    const amplitude = Math.max(1 * dpr, value * drawingAreaCssHeight * 0.45 * dpr);
    
    topPoints.push({ x, y: centerY - amplitude });
    bottomPoints.push({ x, y: centerY + amplitude });
  });

  // Interpolate points for smoother curves
  const smoothTopPoints = interpolatePoints(topPoints);
  const smoothBottomPoints = interpolatePoints(bottomPoints);

  // Find the split point for played/unplayed sections
  let splitIndex = smoothTopPoints.length;
  if (totalDuration > 0 && currentPlayTime > 0) {
    const progressRatio = Math.min(1, currentPlayTime / totalDuration);
    const visibleStartRatio = (firstVisibleIndex / fullWaveformLength);
    const visibleEndRatio = ((firstVisibleIndex + dataToDraw.length) / fullWaveformLength);
    
    if (progressRatio >= visibleStartRatio && progressRatio <= visibleEndRatio) {
      const localProgressRatio = (progressRatio - visibleStartRatio) / (visibleEndRatio - visibleStartRatio);
      splitIndex = Math.floor(localProgressRatio * smoothTopPoints.length);
    } else if (progressRatio < visibleStartRatio) {
      splitIndex = 0;
    }
  }

  // Draw played section (left side)
  if (splitIndex > 0) {
    ctx.fillStyle = playedBarColor;
    ctx.beginPath();
    
    // Start from bottom-left
    ctx.moveTo(0, centerY);
    
    // Draw top curve (played section)
    for (let i = 0; i < Math.min(splitIndex, smoothTopPoints.length); i++) {
      if (i === 0) {
        ctx.lineTo(smoothTopPoints[i].x, smoothTopPoints[i].y);
      } else {
        const cp1x = smoothTopPoints[i - 1].x + (smoothTopPoints[i].x - smoothTopPoints[i - 1].x) * 0.3;
        const cp1y = smoothTopPoints[i - 1].y;
        const cp2x = smoothTopPoints[i].x - (smoothTopPoints[i].x - smoothTopPoints[i - 1].x) * 0.3;
        const cp2y = smoothTopPoints[i].y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, smoothTopPoints[i].x, smoothTopPoints[i].y);
      }
    }
    
    // Connect to bottom curve at split point
    if (splitIndex < smoothBottomPoints.length) {
      ctx.lineTo(smoothBottomPoints[splitIndex].x, smoothBottomPoints[splitIndex].y);
    }
    
    // Draw bottom curve back (played section)
    for (let i = Math.min(splitIndex, smoothBottomPoints.length - 1); i >= 0; i--) {
      if (i === Math.min(splitIndex, smoothBottomPoints.length - 1)) {
        ctx.lineTo(smoothBottomPoints[i].x, smoothBottomPoints[i].y);
      } else {
        const cp1x = smoothBottomPoints[i + 1].x - (smoothBottomPoints[i + 1].x - smoothBottomPoints[i].x) * 0.3;
        const cp1y = smoothBottomPoints[i + 1].y;
        const cp2x = smoothBottomPoints[i].x + (smoothBottomPoints[i + 1].x - smoothBottomPoints[i].x) * 0.3;
        const cp2y = smoothBottomPoints[i].y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, smoothBottomPoints[i].x, smoothBottomPoints[i].y);
      }
    }
    
    ctx.closePath();
    ctx.fill();
  }

  // Draw unplayed section (right side)
  if (splitIndex < smoothTopPoints.length) {
    ctx.fillStyle = unplayedBarColor;
    ctx.beginPath();
    
    // Start from split point
    const startX = splitIndex < smoothTopPoints.length ? smoothTopPoints[splitIndex].x : canvasWidth;
    ctx.moveTo(startX, centerY);
    
    // Draw top curve (unplayed section)
    for (let i = splitIndex; i < smoothTopPoints.length; i++) {
      if (i === splitIndex) {
        ctx.lineTo(smoothTopPoints[i].x, smoothTopPoints[i].y);
      } else {
        const cp1x = smoothTopPoints[i - 1].x + (smoothTopPoints[i].x - smoothTopPoints[i - 1].x) * 0.3;
        const cp1y = smoothTopPoints[i - 1].y;
        const cp2x = smoothTopPoints[i].x - (smoothTopPoints[i].x - smoothTopPoints[i - 1].x) * 0.3;
        const cp2y = smoothTopPoints[i].y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, smoothTopPoints[i].x, smoothTopPoints[i].y);
      }
    }
    
    // Connect to bottom curve at the end
    ctx.lineTo(canvasWidth, centerY);
    
    // Draw bottom curve back (unplayed section)
    for (let i = smoothBottomPoints.length - 1; i >= splitIndex; i--) {
      if (i === smoothBottomPoints.length - 1) {
        ctx.lineTo(smoothBottomPoints[i].x, smoothBottomPoints[i].y);
      } else {
        const cp1x = smoothBottomPoints[i + 1].x - (smoothBottomPoints[i + 1].x - smoothBottomPoints[i].x) * 0.3;
        const cp1y = smoothBottomPoints[i + 1].y;
        const cp2x = smoothBottomPoints[i].x + (smoothBottomPoints[i + 1].x - smoothBottomPoints[i].x) * 0.3;
        const cp2y = smoothBottomPoints[i].y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, smoothBottomPoints[i].x, smoothBottomPoints[i].y);
      }
    }
    
    ctx.closePath();
    ctx.fill();
  }

  // Add subtle gradient overlay for depth
  const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
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