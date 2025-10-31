import React from 'react';
import Player from '@/components/file-display/Player';
import Timeline from '@/components/Timeline';
import { useFileUploader, ACCEPTED_VIDEO_TYPES } from '@/hooks/useFileUploader';
import { useMediaPlayer } from '@/hooks/useMediaPlayer';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useFileNavigation } from '@/hooks/useFileNavigation';
import { FileDisplayHeader } from './file-display/FileDisplayHeader';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface FileDisplayAreaProps {
  files: File[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onVideoElementChange?: (element: HTMLVideoElement | null) => void;
  onCreateLabel?: () => void;
  onNavigateToLabel: (timestamp: number) => void;
  onFilesUploaded?: (files: File[]) => void;
  onPlayAudioSegment?: (playFunction: (timestamp: number) => void) => void;
}

const FileDisplayArea: React.FC<FileDisplayAreaProps> = ({ 
  files, 
  activeIndex, 
  onIndexChange, 
  onVideoElementChange,
  onCreateLabel,
  onNavigateToLabel,
  onFilesUploaded,
  onPlayAudioSegment
}) => {
  const { 
    fileInputRef, 
    handleAddFiles, 
    handleFileChange, 
    acceptedTypes,
    onDrag,
    onDrop
  } = useFileUploader({ 
    onFilesUploaded,
    acceptedTypes: ACCEPTED_VIDEO_TYPES
  });
  
  const { 
    currentUrl, 
    videoElement, 
    audioScrubFunction, 
    videoRef, 
    handleAudioScrubReady,
    playAudioSegment
  } = useMediaPlayer({ files, activeIndex, onVideoElementChange });
  
  useKeyboardShortcuts({ videoElement, onCreateLabel, onNavigateToLabel, audioScrubFunction });

  const { handlePrevious, handleNext } = useFileNavigation({ 
    activeIndex, 
    filesLength: files.length, 
    onIndexChange 
  });

  // Pass the playAudioSegment function up to parent
  React.useEffect(() => {
    if (onPlayAudioSegment) {
      onPlayAudioSegment(playAudioSegment);
    }
  }, [playAudioSegment, onPlayAudioSegment]);

  const currentFile = files.length > 0 && activeIndex !== -1 ? files[activeIndex] : null;
  const hasFiles = files.length > 0 && activeIndex !== -1;

  return (
    <div 
      className="h-full flex flex-col"
      onDragEnter={onDrag}
      onDragOver={onDrag}
      onDragLeave={onDrag}
      onDrop={onDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />
      <FileDisplayHeader
        activeIndex={activeIndex !== -1 ? activeIndex : 0}
        filesLength={files.length}
        currentFileName={currentFile?.name}
        onAddFiles={handleAddFiles}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />
      
      <div className="flex-1 min-h-0 flex flex-col gap-4 p-4">
        <div className="flex-1 min-h-0">
          {hasFiles && currentFile ? (
            <Player 
              file={currentFile} 
              url={currentUrl} 
              videoRef={videoRef}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 h-full">
              <Button
                onClick={handleAddFiles}
                size="lg"
                variant="default"
                className="gap-2"
              >
                <Plus className="size-5" />
                Add Files
              </Button>
              <p className="text-sm text-muted-foreground">
                Upload audio or video files to get started
              </p>
            </div>
          )}
        </div>
        {hasFiles && (
          <div>
            <Timeline
              url={currentUrl} 
              videoElement={videoElement}
              onAudioScrubReady={handleAudioScrubReady}
              onCreateLabel={onCreateLabel}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default FileDisplayArea; 