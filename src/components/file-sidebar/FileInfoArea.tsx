import { useSessionStore } from "@/store/sessionStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/utils";
import { XCircle } from "lucide-react";

interface ClipInfoSectionProps {
  currentClipName: string;
  onNavigateToLabel: (timestamp: number) => void;
  onDeleteLabel: (id: string) => void;
}

export function ClipInfoSection({ currentClipName, onNavigateToLabel, onDeleteLabel }: ClipInfoSectionProps) {
  const labels = useSessionStore(state => state.labels);
  
  return (
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
  );
} 