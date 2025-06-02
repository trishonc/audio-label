import { useState } from 'react'
import { ThemeProvider } from "@/components/ThemeProvider"
import { Header } from "@/components/Header"
import UploadArea from '@/components/UploadArea'
import FileDisplayArea from '@/components/FileDisplayArea'
import { InfoSidebar } from "@/components/InfoSidebar"

function App() {
  const [files, setFiles] = useState<File[]>([])
  const [activeIndex, setActiveIndex] = useState<number>(0)

  const handleFilesUploaded = (newFiles: File[]) => {
    setFiles(prevFiles => {
      const updatedFiles = [...prevFiles, ...newFiles]
      // Ensure no duplicate file names which can mess with navigation
      const uniqueFiles = Array.from(new Map(updatedFiles.map(f => [f.name, f])).values());
      if (uniqueFiles.length > prevFiles.length && uniqueFiles.length > 0) {
        setActiveIndex(prevFiles.length) // Set active index to the first of the *newly* uploaded files
      }
      return uniqueFiles;
    })
  }

  const handleIndexChange = (index: number) => {
    setActiveIndex(index)
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
              />
            )}
          </div>
          <div className="w-1/3 min-h-0">
            <InfoSidebar />
          </div>
        </main>
      </div>
    </ThemeProvider>
  )
}

export default App
