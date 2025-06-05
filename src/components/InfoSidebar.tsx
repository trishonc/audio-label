import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { XCircle } from "lucide-react";
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
  const [totalLabelsAllClips, setTotalLabelsAllClips] = useState(0);

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
      alert('No active file selected.');
      return;
    }
    await exportClipLabelsToCSV(activeFileId);
  };

  const handleExportAllData = async () => {
    await exportAllLabelsToCSV();
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