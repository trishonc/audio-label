interface GlobalInfoSectionProps {
    totalLabelsAllClips: number;
  }
  
  export function GlobalInfoSection({ totalLabelsAllClips }: GlobalInfoSectionProps) {
    return (
      <div className="flex flex-col gap-2 border-t pt-4 mt-2">
        <h3 className="text-lg font-medium">Overall</h3>
        <div className="flex justify-between text-sm">
          <span>Total Labels (all clips):</span>
          <span>{totalLabelsAllClips}</span>
        </div>
      </div>
    );
  } 