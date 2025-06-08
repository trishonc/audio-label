import { useEffect } from 'react';
import { useSessionStore } from '@/store/sessionStore';

const DEFAULT_FPS = 30;

interface useKeyboardShortcutsProps {
  videoElement: HTMLVideoElement | null;
  onCreateLabel?: () => void;
  onNavigateToLabel: (timestamp: number) => void;
  audioScrubFunction: ((time: number) => void) | null;
}

export function useKeyboardShortcuts({
  videoElement,
  onCreateLabel,
  onNavigateToLabel,
  audioScrubFunction,
}: useKeyboardShortcutsProps) {
  const labels = useSessionStore(state => state.labels);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore keyboard events if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const sortedLabels = [...labels].sort((a, b) => a.timestamp - b.timestamp);

      switch (event.code) {
        case 'KeyL':
          event.preventDefault();
          if (onCreateLabel) {
            onCreateLabel();
          }
          break;

        case 'Space':
          event.preventDefault();
          if (videoElement) {
            if (videoElement.paused) {
              videoElement.play();
            } else {
              videoElement.pause();
            }
          }
          break;

        case 'ArrowLeft':
          event.preventDefault();
          if (videoElement && videoElement.duration) {
            const frameTime = 1 / DEFAULT_FPS;
            const newTime = Math.max(0, videoElement.currentTime - frameTime);
            videoElement.currentTime = newTime;
            // Play audio scrub for frame navigation
            if (audioScrubFunction) {
              audioScrubFunction(newTime);
            }
          }
          break;

        case 'ArrowRight':
          event.preventDefault();
          if (videoElement && videoElement.duration) {
            const frameTime = 1 / DEFAULT_FPS;
            const newTime = Math.min(videoElement.duration, videoElement.currentTime + frameTime);
            videoElement.currentTime = newTime;
            // Play audio scrub for frame navigation
            if (audioScrubFunction) {
              audioScrubFunction(newTime);
            }
          }
          break;

        case 'ArrowUp':
          event.preventDefault();
          if (videoElement && sortedLabels.length > 0) {
            const currentTime = videoElement.currentTime;
            const previousLabel = sortedLabels.filter(l => l.timestamp < currentTime).pop();
            if (previousLabel) {
              onNavigateToLabel(previousLabel.timestamp);
            }
          }
          break;

        case 'ArrowDown':
          event.preventDefault();
          if (videoElement && sortedLabels.length > 0) {
            const currentTime = videoElement.currentTime;
            const nextLabel = sortedLabels.find(l => l.timestamp > currentTime);
            if (nextLabel) {
              onNavigateToLabel(nextLabel.timestamp);
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [videoElement, onCreateLabel, onNavigateToLabel, audioScrubFunction, labels]);
} 