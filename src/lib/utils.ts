import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const truncateFileName = (fileName: string, maxLength: number = 20): string => {
  if (fileName.length <= maxLength) return fileName;
  
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return fileName.substring(0, maxLength - 3) + '...';
  }
  
  const name = fileName.substring(0, lastDotIndex);
  const extension = fileName.substring(lastDotIndex);
  const availableLength = maxLength - extension.length - 3;
  
  if (availableLength <= 0) {
    return fileName.substring(0, maxLength - 3) + '...';
  }
  
  return name.substring(0, availableLength) + '...' + extension;
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Clamps the viewBoxStartTime to ensure it stays within valid bounds.
 * Uses the generic clamp function.
 */
export const clampViewBoxStartTime = (
  newViewBoxStartTime: number,
  totalDuration: number,
  displayedDuration: number
): number => {
  if (displayedDuration >= totalDuration || totalDuration === 0) {
    return 0;
  }
  // Clamp between 0 and the maximum possible start time (totalDuration - displayedDuration).
  return clamp(newViewBoxStartTime, 0, totalDuration - displayedDuration);
};

// ... existing code ...
export function formatTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return "00:00.000";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds - mins * 60 - secs) * 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export const formatTime = (seconds: number, zoomLevel: number = 1, displayedDuration: number = Infinity) => {
  const showMilliseconds = zoomLevel > 5 || displayedDuration < 15;

  if (isNaN(seconds) || seconds < 0) {
    return showMilliseconds ? "00:00.00" : "00:00";
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  const minutesString = String(mins).padStart(2, '0');
  const secondsString = String(secs).padStart(2, '0');

  if (showMilliseconds) { 
      const millis = Math.floor((seconds - (mins * 60) - secs) * 100);
      const millisString = String(millis).padStart(2, '0');
      return `${minutesString}:${secondsString}.${millisString}`;
  }
  return `${minutesString}:${secondsString}`;
};