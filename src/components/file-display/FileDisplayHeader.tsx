import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Plus, Download, RotateCcw } from "lucide-react";
import { useSessionStore } from "@/store/sessionStore";
import { getAllLabelsFromDB } from "@/lib/db";
import { exportAllLabelsToCSV } from "@/lib/csvExport";
import { useEffect, useState } from "react";

interface FileDisplayHeaderProps {
  activeIndex: number;
  filesLength: number;
  currentFileName?: string;
  onAddFiles: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function FileDisplayHeader({
  activeIndex,
  filesLength,
  currentFileName,
  onAddFiles,
  onPrevious,
  onNext
}: FileDisplayHeaderProps) {
  const resetAllData = useSessionStore(state => state.resetAllData);
  const [totalLabelsAllClips, setTotalLabelsAllClips] = useState(0);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const loadTotalLabelsCount = async () => {
      const allLabels = await getAllLabelsFromDB();
      setTotalLabelsAllClips(allLabels.length);
    };
    loadTotalLabelsCount();
  }, []);

  const handleExportAllData = async () => {
    await exportAllLabelsToCSV();
  };

  const handleResetAllData = async () => {
    setIsResetting(true);
    try {
      await resetAllData();
      // Refresh the count after reset
      setTotalLabelsAllClips(0);
    } catch (error) {
      console.error('Failed to reset data:', error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onAddFiles}
          title="Add more files"
        >
          <Plus className="size-4" />
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleExportAllData}
          disabled={totalLabelsAllClips === 0}
          title="Export all data"
        >
          <Download className="size-4" />
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isResetting}
              title="Reset all data"
            >
              <RotateCcw className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset All Data</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove ALL files and labels? This action cannot be undone and will permanently delete all your data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleResetAllData}
              >
                Reset All Data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      
      <div className="flex items-center">
        <span className="text-sm text-muted-foreground truncate" title={currentFileName}>
          {currentFileName}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {activeIndex + 1}/{filesLength}
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onPrevious}
          disabled={activeIndex === 0}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onNext}
          disabled={activeIndex === filesLength - 1}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
} 