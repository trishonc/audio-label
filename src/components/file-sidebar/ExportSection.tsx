import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/store/sessionStore";
import { exportAllLabelsToCSV, exportClipLabelsToCSV } from "@/lib/csvExport";

interface ExportSectionProps {
  totalLabelsAllClips: number;
}

export function ExportSection({ totalLabelsAllClips }: ExportSectionProps) {
  const activeFileId = useSessionStore(state => state.activeFileId);
  const labels = useSessionStore(state => state.labels);

  const handleExportClipData = async () => {
    if (!activeFileId) {
      return;
    }
    await exportClipLabelsToCSV(activeFileId);
  };

  const handleExportAllData = async () => {
    await exportAllLabelsToCSV();
  };
  
  return (
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
  );
} 