import React from 'react';
import Player from '@/components/file-display/Player';
import Timeline from '@/components/Timeline';
import { useFileUploader } from '@/hooks/useFileUploader';
import { useMediaPlayer } from '@/hooks/useMediaPlayer';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useFileNavigation } from '@/hooks/useFileNavigation';
import { FileDisplayHeader } from './file-display/FileDisplayHeader';

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
    acceptedTypes 
  } = useFileUploader({ onFilesUploaded });
  
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

  if (files.length === 0) {
    return null;
  }

  const currentFile = files[activeIndex];

  return (
    <div className="h-full flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />
      <FileDisplayHeader
        activeIndex={activeIndex}
        filesLength={files.length}
        currentFileName={currentFile?.name}
        onAddFiles={handleAddFiles}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />
      
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
            onCreateLabel={onCreateLabel}
          />
        </div>
      </div>
    </div>
  )
}

export default FileDisplayArea; 