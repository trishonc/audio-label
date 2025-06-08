import { ClipInfoSection } from "./file-sidebar/FileInfoArea";
import { TagsSection } from "./file-sidebar/TagsArea";
import { FileManagementSection } from "./file-sidebar/FileManagementArea";

interface FileSidebarProps {
  currentClipName: string;
  onDeleteLabel: (id: string) => void;
  onNavigateToLabel: (timestamp: number) => void;
}

export function FileSidebar({ 
  currentClipName,
  onDeleteLabel,
  onNavigateToLabel
}: FileSidebarProps) {

  return (
    <div className="h-full flex flex-col p-4 border-l">
      <ClipInfoSection 
        onNavigateToLabel={onNavigateToLabel}
        onDeleteLabel={onDeleteLabel}
      />

      <div className="mt-4">
        <TagsSection />
      </div>

      <div className="mt-4">
        <FileManagementSection currentClipName={currentClipName} />
      </div>
    </div>
  );
} 