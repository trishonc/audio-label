import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { XCircle, Trash2, RotateCcw } from "lucide-react";
import { useSessionStore } from "@/store/sessionStore";
import { formatTimestamp } from "@/lib/utils";
import { exportAllLabelsToCSV, exportClipLabelsToCSV } from "@/lib/csvExport";
import { getAllLabelsFromDB } from "@/lib/db";
import { useEffect, useState } from "react";

interface InfoSidebarProps {
  currentClipName: string;
  onCreateLabel: () => void;
  onDeleteLabel: (id: string) => void;
  onNavigateToLabel: (timestamp: number) => void;
}

export function InfoSidebar({ 
  currentClipName,
  onCreateLabel,
  onDeleteLabel,
  onNavigateToLabel
}: InfoSidebarProps) {
  const labels = useSessionStore(state => state.labels);
  const activeFileId = useSessionStore(state => state.activeFileId);
  const removeFile = useSessionStore(state => state.removeFile);
  const resetAllData = useSessionStore(state => state.resetAllData);
  const [totalLabelsAllClips, setTotalLabelsAllClips] = useState(0);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Load total labels count from database
  useEffect(() => {
    const loadTotalLabelsCount = async () => {
      const allLabels = await getAllLabelsFromDB();
      setTotalLabelsAllClips(allLabels.length);
    };
    loadTotalLabelsCount();
  }, [labels]); // Refresh when current labels change

  const handleExportClipData = async () => {
    if (!activeFileId) {
      return;
    }
    await exportClipLabelsToCSV(activeFileId);
  };

  const handleExportAllData = async () => {
    await exportAllLabelsToCSV();
  };

  const handleRemoveFile = async () => {
    if (!activeFileId) return;

    setIsRemoving(true);
    try {
      await removeFile(activeFileId);
    } catch (error) {
      console.error('Failed to remove file:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleResetAllData = async () => {
    setIsResetting(true);
    try {
      await resetAllData();
    } catch (error) {
      console.error('Failed to reset data:', error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 bg-muted/30 border-l rounded-lg">
      <h2 className="text-xl font-semibold mb-2 border-b pb-2">Options & Info</h2>

      {/* Actions Section */}
      <div className="flex flex-col gap-2">
        <Button className="w-full justify-between" onClick={onCreateLabel}>
          <span>Label</span>
          <span className="text-xs text-muted-foreground">(L)</span>
        </Button>
      </div>

      {/* Current Clip Info Section */}
      <div className="flex flex-col gap-2 border-t pt-4 mt-2">
        <h3 className="text-lg font-medium truncate" title={currentClipName}>{currentClipName}</h3>
        <div className="flex justify-between text-sm items-center">
          <span>Labels ({labels.length})</span>
        </div>
        <ScrollArea className="h-48 rounded-md border p-2 bg-background">
          {labels.length > 0 ? (
            <ul className="space-y-1">
              {labels.map((label) => (
                <li 
                  key={label.id} 
                  className="flex items-center justify-between text-sm p-1.5 hover:bg-accent rounded-sm cursor-pointer group"
                  onClick={() => onNavigateToLabel(label.timestamp)}
                >
                  <span>{formatTimestamp(label.timestamp)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLabel(label.id);
                    }}
                    title="Remove label"
                  >
                    <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No labels yet.</p>
          )}
        </ScrollArea>
      </div>

      {/* Global Info Section */}
      <div className="flex flex-col gap-2 border-t pt-4 mt-2">
        <h3 className="text-lg font-medium">Overall</h3>
        <div className="flex justify-between text-sm">
          <span>Total Labels (all clips):</span>
          <span>{totalLabelsAllClips}</span>
        </div>
      </div>

      {/* File Management Section */}
      <div className="flex flex-col gap-2 border-t pt-4 mt-2">
        <h3 className="text-lg font-medium">File Management</h3>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full"
              disabled={!activeFileId || isRemoving}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isRemoving ? "Removing..." : "Remove Current File"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove File</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove "{currentClipName}" and all its labels? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleRemoveFile}
              >
                Remove File
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full"
              disabled={isResetting}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {isResetting ? "Resetting..." : "Reset All Data"}
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

      {/* Export Section - buttons side-by-side */}
      <div className="mt-auto flex flex-col gap-2 border-t pt-4">
        <div className="flex gap-2 w-full">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleExportClipData}
            disabled={!activeFileId || labels.length === 0}
          >
            Export Clip Data
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleExportAllData}
            disabled={totalLabelsAllClips === 0}
          >
            Export All Data
          </Button>
        </div>
      </div>
    </div>
  );
} 