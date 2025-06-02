import React, { useEffect, useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Player from '@/components/Player'
import Timeline from '@/components/Timeline'

interface FileDisplayAreaProps {
  files: File[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

const FileDisplayArea: React.FC<FileDisplayAreaProps> = ({ files, activeIndex, onIndexChange }) => {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  const videoRef = useCallback((element: HTMLVideoElement | null) => {
    setVideoElement(element);
  }, []);

  useEffect(() => {
    const activeFile = files[activeIndex];
    if (!activeFile) {
      setCurrentUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(activeFile);
    setCurrentUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
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
      <div className="flex items-center justify-between p-4 border-b">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handlePrevious}
          disabled={activeIndex === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {activeIndex + 1}/{files.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {currentFile?.name}
          </span>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleNext}
          disabled={activeIndex === files.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
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
          />
        </div>
      </div>
    </div>
  )
}

export default FileDisplayArea 