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

/**
 * Clamps the viewBoxStartTime to ensure it stays within valid bounds.
 * @param newViewBoxStartTime The proposed new start time for the viewbox.
 * @param totalDuration The total duration of the media.
 * @param displayedDuration The duration currently visible in the viewbox.
 * @returns The clamped viewBoxStartTime.
 */
export const clampViewBoxStartTime = (
  newViewBoxStartTime: number,
  totalDuration: number,
  displayedDuration: number
): number => {
  // If the entire duration (or more) is displayed, viewBoxStartTime must be 0.
  if (displayedDuration >= totalDuration) {
    return 0;
  }
  // Otherwise, clamp between 0 and the maximum possible start time (totalDuration - displayedDuration).
  return Math.max(0, Math.min(newViewBoxStartTime, totalDuration - displayedDuration));
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return "00:00.000";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds - mins * 60 - secs) * 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
} 