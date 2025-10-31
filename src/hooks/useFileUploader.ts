import { useRef, useState, useCallback } from 'react';

export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4', 'video/webm', 'video/ogg',
];

interface useFileUploaderProps {
  onFilesUploaded?: (files: File[]) => void;
  acceptedTypes?: string[];
}

export function useFileUploader({ onFilesUploaded, acceptedTypes = ACCEPTED_VIDEO_TYPES }: useFileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!onFilesUploaded || !fileList) return;
    
    const filteredFiles = Array.from(fileList).filter(f => acceptedTypes.includes(f.type));
    
    if (filteredFiles.length > 0) {
      onFilesUploaded(filteredFiles);
    }
  }, [acceptedTypes, onFilesUploaded]);

  const handleAddFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (e.target) {
        e.target.value = ''; // Reset input
    }
  };

  const onDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Keep drag active state for functionality but don't use it for visual indicators
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return { 
    fileInputRef, 
    handleAddFiles, 
    handleFileChange, 
    dragActive, 
    onDrag, 
    onDrop,
    acceptedTypes
  };
} 