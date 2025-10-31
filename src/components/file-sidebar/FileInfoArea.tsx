import { useSessionStore } from "@/store/sessionStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/utils";
import { XCircle, Play } from "lucide-react";

interface ClipInfoSectionProps {
  onNavigateToLabel: (timestamp: number) => void;
  onDeleteLabel: (id: string) => void;
  onPlayAudioSegment?: ((timestamp: number) => void) | null;
  hasFiles: boolean;
}

export function ClipInfoSection({ 
  onNavigateToLabel, 
  onDeleteLabel,
  onPlayAudioSegment,
  hasFiles
}: ClipInfoSectionProps) {
  const labels = useSessionStore(state => state.labels);
  
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex justify-between text-sm items-center flex-shrink-0">
        <h3 className="text-lg font-medium">Labels ({labels.length})</h3>
       </div>
      <ScrollArea className="flex-1 rounded-md border p-3 bg-background min-h-0">
        {!hasFiles ? (
          <p className="text-sm text-muted-foreground text-center py-4">Add files to start labeling</p>
        ) : labels.length > 0 ? (
          <div className="space-y-1">
            {labels.map((label) => (
              <div key={label.id}>
                <div
                  className="w-full justify-between h-auto p-2 group border rounded-md cursor-pointer flex items-center"
                  onClick={() => onNavigateToLabel(label.timestamp)}
                >
                  <span>{formatTimestamp(label.timestamp)}</span>
                  <div className="flex items-center gap-2">
                    {onPlayAudioSegment && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-primary/10 hover:scale-110 transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayAudioSegment(label.timestamp);
                        }}
                        title="Play audio segment (150ms)"
                      >
                        <Play className="size-3 text-muted-foreground hover:text-primary transition-colors" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-destructive/10 hover:scale-110 transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLabel(label.id);
                      }}
                      title="Remove label"
                    >
                      <XCircle className="size-4 text-muted-foreground hover:text-destructive transition-colors" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No labels yet.</p>
        )}
      </ScrollArea>
    </div>
  );
} 