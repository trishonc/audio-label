import { useState, useCallback, useEffect } from 'react';

interface useMediaPlayerProps {
  files: File[];
  activeIndex: number;
  onVideoElementChange?: (element: HTMLVideoElement | null) => void;
}

export function useMediaPlayer({ files, activeIndex, onVideoElementChange }: useMediaPlayerProps) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);  
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [audioScrubFunction, setAudioScrubFunction] = useState<((time: number) => void) | null>(null);

  const videoRef = useCallback((element: HTMLVideoElement | null) => {
    setVideoElement(element);
    if (onVideoElementChange) {
      onVideoElementChange(element);
    }
  }, [onVideoElementChange]);

  const handleAudioScrubReady = useCallback((scrubFunction: (time: number) => void) => {
    setAudioScrubFunction(() => scrubFunction);
  }, []);

  // Function to play audio segment without affecting main timeline
  const playAudioSegment = useCallback(async (timestamp: number, windowMs: number = 150) => {
    if (!currentUrl) return;

    const halfWindow = windowMs / 2;
    const startTime = Math.max(0, timestamp - halfWindow / 1000); // Convert to seconds

    // Create a temporary audio element for playback
    const tempAudio = new Audio(currentUrl);
    tempAudio.currentTime = startTime;
    
    const playPromise = tempAudio.play();
    
    // Handle the promise properly
    if (playPromise) {
      try {
        await playPromise;
        
        // Stop playback after the window duration
        setTimeout(() => {
          tempAudio.pause();
          tempAudio.currentTime = 0;
        }, windowMs);
      } catch (error) {
        console.error('Error playing audio segment:', error);
      }
    }
  }, [currentUrl]);

  useEffect(() => {
    const activeFile = files[activeIndex];
    if (!activeFile) {
      setCurrentUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(activeFile);
    setCurrentUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [activeIndex, files]);

  return {
    currentUrl,
    videoElement,
    audioScrubFunction,
    videoRef,
    handleAudioScrubReady,
    playAudioSegment,
  };
} 