import React from 'react'
import { Button } from "@/components/ui/button"
import { useFileUploader, ACCEPTED_VIDEO_TYPES } from '@/hooks/useFileUploader'

interface UploadAreaProps {
  onFilesUploaded: (files: File[]) => void;
  showDropzone: boolean;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onFilesUploaded, showDropzone }) => {
  const {
    fileInputRef,
    handleAddFiles,
    handleFileChange,
    dragActive,
    onDrag,
    onDrop,
    acceptedTypes,
  } = useFileUploader({
    onFilesUploaded,
    acceptedTypes: ACCEPTED_VIDEO_TYPES,
  });


  if (!showDropzone) {
    return null
  }

  return (
    <div
      onDragEnter={onDrag}
      onDragOver={onDrag}
      onDragLeave={onDrag}
      onDrop={onDrop}
      className={`fixed inset-0 flex flex-col items-center justify-center bg-background transition-colors ${dragActive ? 'border-4 border-primary/60 bg-primary/5' : ''}`}
      style={{ zIndex: 10 }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />
      <Button onClick={handleAddFiles} variant="outline" size="lg">
        Upload Files
      </Button>
      {dragActive && (
        <div
          className="absolute inset-0 pointer-events-none rounded transition-all"
          style={{
            border: '2px dashed',
            borderColor: 'var(--primary)',
            background: 'rgba(var(--primary-rgb), 0.06)',
            borderRadius: 'inherit',
            boxSizing: 'border-box',
            borderImage: 'none',
            borderStyle: 'dashed',
            borderWidth: '2px',
            borderSpacing: '0',
            filter: 'drop-shadow(0 0 0.5rem var(--primary)/10%)'
          }}
        />
      )}
    </div>
  )
}

export default UploadArea 