import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import Player from '@/components/Player'
import Timeline from '@/components/Timeline'

interface FileDisplayAreaProps {
  files: File[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onVideoElementChange?: (element: HTMLVideoElement | null) => void;
  onCreateLabel?: () => void;
  onFilesUploaded?: (files: File[]) => void;
}

// Assume 30fps for frame navigation - can be made configurable later
const DEFAULT_FPS = 30;
const ACCEPTED_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'audio/mpeg', 'audio/wav', 'audio/ogg'];

const FileDisplayArea: React.FC<FileDisplayAreaProps> = ({ 
  files, 
  activeIndex, 
  onIndexChange, 
  onVideoElementChange,
  onCreateLabel,
  onFilesUploaded
}) => {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);  
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [audioScrubFunction, setAudioScrubFunction] = useState<((time: number) => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const videoRef = useCallback((element: HTMLVideoElement | null) => {
    setVideoElement(element);
    if (onVideoElementChange) {
      onVideoElementChange(element);
    }
  }, [onVideoElementChange]);

  const handleAudioScrubReady = useCallback((scrubFunction: (time: number) => void) => {
    setAudioScrubFunction(() => scrubFunction);
  }, []);

  const handleAddFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && onFilesUploaded) {
      const filteredFiles = Array.from(fileList).filter(f => ACCEPTED_TYPES.includes(f.type));
      if (filteredFiles.length > 0) {
        onFilesUploaded(filteredFiles);
      }
    }
    e.target.value = ''; // Reset input
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore keyboard events if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

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
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [videoElement, onCreateLabel, audioScrubFunction]);

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

  const handlePrevious = () => {
    if (activeIndex > 0) {
      onIndexChange(activeIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeIndex < files.length - 1) {
      onIndexChange(activeIndex + 1);
    }
  };

  if (files.length === 0) {
    return null
  }

  const currentFile = files[activeIndex];

  return (
    <div className="h-full flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrevious}
            disabled={activeIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleNext}
            disabled={activeIndex === files.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {activeIndex + 1}/{files.length}
          </span>
          <span className="text-sm text-muted-foreground truncate" title={currentFile?.name}>
            {currentFile?.name}
          </span>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleAddFiles}
          title="Add more files"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 min-h-0 flex flex-col gap-4 p-4">
        <div className="flex-1 min-h-0">
          <Player 
            file={currentFile} 
            url={currentUrl} 
            videoRef={videoRef}
          />
        </div>
        <div>
          <Timeline 
            url={currentUrl} 
            videoElement={videoElement}
            onAudioScrubReady={handleAudioScrubReady}
          />
        </div>
      </div>
    </div>
  )
}

export default FileDisplayArea 