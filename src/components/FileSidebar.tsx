import { ClipInfoSection } from "./file-sidebar/FileInfoArea";
import { TagsSection } from "./file-sidebar/TagsArea";
import { FileManagementSection } from "./file-sidebar/FileManagementArea";

interface FileSidebarProps {
  currentClipName: string;
  onDeleteLabel: (id: string) => void;
  onNavigateToLabel: (timestamp: number) => void;
  onPlayAudioSegment?: ((timestamp: number) => void) | null;
  hasFiles: boolean;
}

export function FileSidebar({ 
  currentClipName,
  onDeleteLabel,
  onNavigateToLabel,
  onPlayAudioSegment,
  hasFiles
}: FileSidebarProps) {

  return (
    <div className="h-full flex flex-col p-4 border-l">
      <div className="flex-1 min-h-0">
        <ClipInfoSection 
          onNavigateToLabel={onNavigateToLabel}
          onDeleteLabel={onDeleteLabel}
          onPlayAudioSegment={onPlayAudioSegment}
          hasFiles={hasFiles}
        />
      </div>

      <div className="mt-4 flex-shrink-0">
        <TagsSection hasFiles={hasFiles} />
      </div>

      <div className="mt-4 flex-shrink-0">
        <FileManagementSection currentClipName={currentClipName} hasFiles={hasFiles} />
      </div>
    </div>
  );
} 