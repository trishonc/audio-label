import { useSessionStore } from "@/store/sessionStore";
import { getAllLabelsFromDB } from "@/lib/db";
import { useEffect, useState } from "react";
import { ActionsSection } from "./file-sidebar/ActionsArea";
import { ClipInfoSection } from "./file-sidebar/FileInfoArea";
import { TagsSection } from "./file-sidebar/TagsArea";
import { GlobalInfoSection } from "./file-sidebar/GlobalInfoArea";
import { FileManagementSection } from "./file-sidebar/FileManagementArea";
import { ExportSection } from "./file-sidebar/ExportSection";

interface FileSidebarProps {
  currentClipName: string;
  onCreateLabel: () => void;
  onDeleteLabel: (id: string) => void;
  onNavigateToLabel: (timestamp: number) => void;
}

export function FileSidebar({ 
  currentClipName,
  onCreateLabel,
  onDeleteLabel,
  onNavigateToLabel
}: FileSidebarProps) {
  const labels = useSessionStore(state => state.labels);
  const [totalLabelsAllClips, setTotalLabelsAllClips] = useState(0);

  useEffect(() => {
    const loadTotalLabelsCount = async () => {
      const allLabels = await getAllLabelsFromDB();
      setTotalLabelsAllClips(allLabels.length);
    };
    loadTotalLabelsCount();
  }, [labels]);

  return (
    <div className="h-full flex flex-col gap-4 p-4 border-l">
      <h2 className="text-xl font-semibold mb-2 border-b pb-2">Options & Info</h2>

      <ActionsSection onCreateLabel={onCreateLabel} />

      <ClipInfoSection 
        currentClipName={currentClipName}
        onNavigateToLabel={onNavigateToLabel}
        onDeleteLabel={onDeleteLabel}
      />

      <TagsSection />

      <GlobalInfoSection totalLabelsAllClips={totalLabelsAllClips} />

      <FileManagementSection currentClipName={currentClipName} />

      <ExportSection totalLabelsAllClips={totalLabelsAllClips} />
    </div>
  );
} 