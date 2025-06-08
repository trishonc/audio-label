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
  };
} 