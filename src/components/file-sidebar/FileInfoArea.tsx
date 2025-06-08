import { useSessionStore } from "@/store/sessionStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/utils";
import { XCircle } from "lucide-react";

interface ClipInfoSectionProps {
  onNavigateToLabel: (timestamp: number) => void;
  onDeleteLabel: (id: string) => void;
}

export function ClipInfoSection({ 
  onNavigateToLabel, 
  onDeleteLabel 
}: ClipInfoSectionProps) {
  const labels = useSessionStore(state => state.labels);
  
  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="flex justify-between text-sm items-center">
        <h3 className="text-lg font-medium">Labels ({labels.length})</h3>
       </div>
      <ScrollArea className="flex-1 rounded-md border p-3 bg-background h-full">
        {labels.length > 0 ? (
          <div className="space-y-1">
            {labels.map((label) => (
              <div key={label.id}>
                <div
                  className="w-full justify-between h-auto p-2 group border rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center"
                  onClick={() => onNavigateToLabel(label.timestamp)}
                >
                  <span>{formatTimestamp(label.timestamp)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLabel(label.id);
                    }}
                    title="Remove label"
                  >
                    <XCircle className="size-4 text-muted-foreground hover:text-destructive" />
                  </Button>
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