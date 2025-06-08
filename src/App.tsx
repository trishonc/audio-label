import { useState, useEffect, useMemo } from 'react'
import { ThemeProvider } from "@/components/ThemeProvider"
import { Header } from "@/components/Header"
import UploadArea from '@/components/UploadArea'
import FileDisplayArea from '@/components/FileDisplayArea'
import { FileSidebar } from "@/components/FileSidebar"
import { useLabels } from '@/hooks/useLabels';
import { useSessionStore } from '@/store/sessionStore'; // Import the new session store

function App() {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  const {
    files,
    activeFileId,
    isLoading,
    loadFilesFromDB,
    addFiles,
    setActiveFileId,
  } = useSessionStore();

  // Load files from IndexedDB on initial mount
  useEffect(() => {
    loadFilesFromDB();
  }, [loadFilesFromDB]);

  const fileObjects = useMemo(() => {
    return files.map(f => new File([f.data], f.name, { type: f.type, lastModified: f.lastModified }))
  }, [files]);

  // Use the refactored custom hook for label actions
  const {
    createLabelAtCurrentTimestamp,
    removeLabel,
    navigateToLabel,
  } = useLabels({ videoElement }); // Pass only videoElement

  const handleFilesUploaded = async (newFiles: File[]) => {
    await addFiles(newFiles);
  };

  const handleIndexChange = (index: number) => {
    const file = files[index];
    if (file?.id) {
      setActiveFileId(file.id);
    }
  };

  const activeIndex = activeFileId ? files.findIndex(f => f.id === activeFileId) : -1;
  const currentFile = activeIndex !== -1 ? files[activeIndex] : null;

  if (isLoading && files.length === 0) {
    return (
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground">
          <p>Loading files from local storage...</p> {/* Or a spinner component */}
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="h-screen flex flex-col bg-background text-foreground">
        <Header />
        <main className="flex flex-1 min-h-0">
          <div className="w-2/3 flex flex-col min-h-0">
            <UploadArea onFilesUploaded={handleFilesUploaded} showDropzone={files.length === 0} />
            {files.length > 0 && activeIndex !== -1 && currentFile && (
              <FileDisplayArea
                files={fileObjects}
                activeIndex={activeIndex}
                onIndexChange={handleIndexChange}
                onVideoElementChange={setVideoElement}
                onCreateLabel={createLabelAtCurrentTimestamp}
                onNavigateToLabel={navigateToLabel}
                onFilesUploaded={handleFilesUploaded}
              />
            )}
          </div>
          {files.length > 0 && (
            <div className="w-1/3 min-h-0">
              <FileSidebar
                currentClipName={currentFile ? currentFile.name : "No file selected"}
                onCreateLabel={createLabelAtCurrentTimestamp}
                onDeleteLabel={removeLabel}
                onNavigateToLabel={navigateToLabel}
              />
            </div>
          )}
        </main>
      </div>
    </ThemeProvider>
  )
}

export default App
