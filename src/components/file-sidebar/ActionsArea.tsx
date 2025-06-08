import { Button } from "@/components/ui/button";

interface ActionsSectionProps {
  onCreateLabel: () => void;
}

export function ActionsSection({ onCreateLabel }: ActionsSectionProps) {
  return (
    <div className="flex flex-col">
      <Button className="w-full" onClick={onCreateLabel}>
        <span>Add Label (L)</span>
      </Button>
    </div>
  );
} 