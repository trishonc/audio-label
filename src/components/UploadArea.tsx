import React, { useRef, useState } from 'react'
import { Button } from "@/components/ui/button"

const ACCEPTED_TYPES = [
  'video/mp4', 'video/webm', 'video/ogg',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3',
]

interface UploadAreaProps {
  onFilesUploaded: (files: File[]) => void;
  showDropzone: boolean;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onFilesUploaded, showDropzone }) => {
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filterFiles = (fileList: FileList | null) => {
    if (!fileList) return []
    return Array.from(fileList).filter(f => ACCEPTED_TYPES.includes(f.type))
  }

  const handleFiles = (fileList: FileList | null) => {
    const filtered = filterFiles(fileList)
    if (filtered.length) {
      onFilesUploaded(filtered)
    }
  }

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    if (e.type === 'dragleave') setDragActive(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }

  const onButtonClick = () => {
    inputRef.current?.click()
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    e.target.value = ''
  }

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
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={onFileChange}
      />
      <Button onClick={onButtonClick} variant="outline" size="lg">
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