import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function InfoSidebar() {
  // Placeholder data - in a real app, this would come from props or state
  const currentClipName = "MyBoxingSession_01.mp4"; // Placeholder for actual clip name
  const currentClipLabels = [
    { id: 1, timestamp: "00:00:12.345" },
    { id: 2, timestamp: "00:00:15.678" },
    { id: 3, timestamp: "00:00:22.123" },
  ];
  const totalLabelsAllClips = 15;

  return (
    <div className="h-full flex flex-col gap-4 p-4 bg-muted/30 border-l rounded-lg">
      <h2 className="text-xl font-semibold mb-2 border-b pb-2">Options & Info</h2>

      {/* Actions Section */}
      <div className="flex flex-col gap-2">
        <Button className="w-full justify-between">
          <span>Label</span>
          <span className="text-xs text-muted-foreground">(L)</span>
        </Button>
      </div>

      {/* Current Clip Info Section */}
      <div className="flex flex-col gap-2 border-t pt-4 mt-2">
        <h3 className="text-lg font-medium truncate" title={currentClipName}>{currentClipName}</h3>
        <div className="flex justify-between text-sm">
          <span>Labels:</span>
          <span>{currentClipLabels.length}</span>
        </div>
        <h4 className="text-md font-medium mt-2 mb-1">Timestamps:</h4>
        <ScrollArea className="h-48 rounded-md border p-2 bg-background">
          {currentClipLabels.length > 0 ? (
            <ul className="space-y-1">
              {currentClipLabels.map((label) => (
                <li key={label.id} className="text-sm p-1 hover:bg-accent rounded-sm">
                  {label.timestamp}
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
          <Button variant="outline" className="flex-1">Export Clip Data</Button>
          <Button variant="outline" className="flex-1">Export All Data</Button>
        </div>
      </div>
    </div>
  );
} 