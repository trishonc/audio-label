import { useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface TagsSectionProps {
  hasFiles: boolean;
}

export function TagsSection({ hasFiles }: TagsSectionProps) {
  const currentFileTags = useSessionStore(state => state.currentFileTags);
  const activeFileId = useSessionStore(state => state.activeFileId);
  const addTag = useSessionStore(state => state.addTag);
  const removeTag = useSessionStore(state => state.removeTag);
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = async () => {
    const trimmedTag = tagInput.trim();
    if (!trimmedTag || !activeFileId || currentFileTags.includes(trimmedTag)) {
      return;
    }
    
    try {
      await addTag(trimmedTag);
      setTagInput("");
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  };

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = async (tag: string) => {
    try {
      await removeTag(tag);
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  };

  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <h3 className="text-lg font-medium">Tags</h3>
      <div className="flex gap-2">
        <Input
          placeholder={hasFiles ? "Add tag..." : "Add files to use tags"}
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyPress}
          disabled={!hasFiles || !activeFileId}
          className="flex-1 h-8"
          size={undefined}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddTag}
          disabled={!hasFiles || !activeFileId || !tagInput.trim() || currentFileTags.includes(tagInput.trim())}
        >
          Add
        </Button>
      </div>
      {hasFiles && currentFileTags.length === 0 && (
        <p className="text-sm text-muted-foreground">No tags yet</p>
      )}
      <div className="flex flex-wrap gap-1">
        {currentFileTags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1 text-xs"
          >
            <span>{tag}</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-3 hover:bg-transparent"
              onClick={() => handleRemoveTag(tag)}
              title="Remove tag"
            >
              <X className="size-3" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  );
} 