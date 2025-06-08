import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

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
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onAddFiles}
        title="Add more files"
      >
        <Plus className="size-4" />
      </Button>
      
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {activeIndex + 1}/{filesLength}
        </span>
        <span className="text-sm text-muted-foreground truncate" title={currentFileName}>
          {currentFileName}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
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