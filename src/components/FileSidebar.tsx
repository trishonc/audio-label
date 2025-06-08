import { useSessionStore } from "@/store/sessionStore";
import { getAllLabelsFromDB } from "@/lib/db";
import { useEffect, useState } from "react";

import { ClipInfoSection } from "./file-sidebar/FileInfoArea";
import { TagsSection } from "./file-sidebar/TagsArea";
import { FileManagementSection } from "./file-sidebar/FileManagementArea";
import { ExportSection } from "./file-sidebar/ExportSection";

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
    <div className="h-full flex flex-col p-4 border-l">
      <ClipInfoSection 
        totalLabelsAllClips={totalLabelsAllClips}
        onNavigateToLabel={onNavigateToLabel}
        onDeleteLabel={onDeleteLabel}
      />



      <div className="mt-4">
        <TagsSection />
      </div>

      <div className="mt-4">
        <ExportSection totalLabelsAllClips={totalLabelsAllClips} />
      </div>

      <div className="mt-4">
        <FileManagementSection currentClipName={currentClipName} />
      </div>
    </div>
  );
} 