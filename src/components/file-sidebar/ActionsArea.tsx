import { Button } from "@/components/ui/button";

interface ActionsSectionProps {
  onCreateLabel: () => void;
}

export function ActionsSection({ onCreateLabel }: ActionsSectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <Button className="w-full justify-between" onClick={onCreateLabel}>
        <span>Label</span>
        <span className="text-xs text-muted-foreground">(L)</span>
      </Button>
    </div>
  );
} 