import { useState } from 'react'
import { ThemeProvider } from "@/components/ThemeProvider"
import { Header } from "@/components/Header"
import UploadArea from '@/components/UploadArea'
import FileDisplayArea from '@/components/FileDisplayArea'
import { InfoSidebar } from "@/components/InfoSidebar"
import { useLabels } from '@/hooks/useLabels'; // Import the hook

function App() {
  const [files, setFiles] = useState<File[]>([])
  const [activeIndex, setActiveIndex] = useState<number>(0)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [panToTimestampTarget, setPanToTimestampTarget] = useState<number | null>(null);

  const currentFile = files[activeIndex];

  const handleRequestTimelinePan = (timestamp: number) => {
    setPanToTimestampTarget(timestamp);
    // Optionally, reset panToTimestampTarget to null after a short delay or after Timeline processes it,
    // but Timeline will use a ref to only process new values, so direct reset might not be strictly needed here.
    // For now, let Timeline manage not re-processing the same target.
  };

  // Use the custom hook for labels
  const {
    labels,
    addLabel,
    deleteLabel,
    navigateToTimestamp,
  } = useLabels({ 
    videoElement, 
    currentFileIdentifier: currentFile?.name, 
    requestTimelinePan: handleRequestTimelinePan 
  });

  const handleFilesUploaded = (newFiles: File[]) => {
    setFiles(prevFiles => {
      const updatedFiles = [...prevFiles, ...newFiles]
      const uniqueFiles = Array.from(new Map(updatedFiles.map(f => [f.name, f])).values());
      if (uniqueFiles.length > prevFiles.length && uniqueFiles.length > 0) {
        setActiveIndex(prevFiles.length)
        setPanToTimestampTarget(null); // Reset pan target when new files are uploaded
      }
      return uniqueFiles;
    })
  }

  const handleIndexChange = (index: number) => {
    setActiveIndex(index);
    setPanToTimestampTarget(null); // Reset pan target when active file changes
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="h-screen flex flex-col bg-background text-foreground">
        <Header />
        <main className="flex flex-1 p-2 min-h-0 gap-2">
          <div className="w-2/3 flex flex-col min-h-0">
            <UploadArea onFilesUploaded={handleFilesUploaded} showDropzone={files.length === 0} />
            {files.length > 0 && (
              <FileDisplayArea
                files={files}
                activeIndex={activeIndex}
                onIndexChange={handleIndexChange}
                onVideoElementChange={setVideoElement}
                labels={labels}
                panToTimestampTarget={panToTimestampTarget}
              />
            )}
          </div>
          <div className="w-1/3 min-h-0">
            <InfoSidebar
              currentClipName={currentFile ? currentFile.name : "No file selected"}
              labels={labels}
              onAddLabel={addLabel}
              onDeleteLabel={deleteLabel}
              onNavigateToTimestamp={navigateToTimestamp}
            />
          </div>
        </main>
      </div>
    </ThemeProvider>
  )
}

export default App
