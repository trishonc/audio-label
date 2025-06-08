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
import { Trash2 } from "lucide-react";
import { useSessionStore } from "@/store/sessionStore";
import { useState } from "react";

interface FileManagementSectionProps {
  currentClipName: string;
}

export function FileManagementSection({ currentClipName }: FileManagementSectionProps) {
  const activeFileId = useSessionStore(state => state.activeFileId);
  const removeFile = useSessionStore(state => state.removeFile);
  const [isRemoving, setIsRemoving] = useState(false);

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

  return (
    <div className="flex flex-col gap-2 border-t pt-4 mt-2">
      <h3 className="text-lg font-medium">Manage</h3>
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="destructive" 
            className="w-full"
            disabled={!activeFileId || isRemoving}
          >
            <Trash2 className="h-4 w-4" />
            {isRemoving ? "Removing..." : "Remove This File"}
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
    </div>
  );
} 