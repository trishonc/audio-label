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
import { Trash2, RotateCcw } from "lucide-react";
import { useSessionStore } from "@/store/sessionStore";
import { useState } from "react";

interface FileManagementSectionProps {
  currentClipName: string;
}

export function FileManagementSection({ currentClipName }: FileManagementSectionProps) {
  const activeFileId = useSessionStore(state => state.activeFileId);
  const removeFile = useSessionStore(state => state.removeFile);
  const resetAllData = useSessionStore(state => state.resetAllData);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

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
  );
} 