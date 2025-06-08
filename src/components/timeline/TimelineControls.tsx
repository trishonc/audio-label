import React from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Minus, Plus } from "lucide-react";
import { formatTime } from '@/lib/utils';
import { MIN_ZOOM } from '@/hooks/useTimelineZoom';

interface TimelineControlsProps {
  togglePlayPause: () => void;
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  currentTime: number;
  zoomLevel: number;
  decreaseZoom: () => void;
  increaseZoom: () => void;
  handleZoomSliderChange: (value: number[]) => void;
  displayedDuration: number;
}

const MAX_ZOOM = 20;

const TimelineControls: React.FC<TimelineControlsProps> = ({
  togglePlayPause,
  isPlaying,
  isLoading,
  duration,
  currentTime,
  zoomLevel,
  decreaseZoom,
  increaseZoom,
  handleZoomSliderChange,
  displayedDuration,
}) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button onClick={togglePlayPause} variant="outline" size="icon" disabled={isLoading || duration === 0}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div className="text-xs text-muted-foreground font-mono min-w-[70px] text-center tabular-nums bg-muted px-2 py-1 rounded">
          {formatTime(currentTime, zoomLevel, displayedDuration)}
        </div>
      </div>

      <div className="flex-grow flex items-center justify-center gap-2 max-w-xs">
        <Button onClick={decreaseZoom} variant="outline" size="icon" disabled={isLoading || zoomLevel <= MIN_ZOOM}>
          <Minus className="h-4 w-4" />
        </Button>
        <Slider
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.1}
          value={[zoomLevel]}
          onValueChange={handleZoomSliderChange}
          disabled={isLoading || duration === 0}
          className="w-full"
        />
        <Button onClick={increaseZoom} variant="outline" size="icon" disabled={isLoading || zoomLevel >= MAX_ZOOM}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="text-xs text-muted-foreground font-mono min-w-[70px] text-center tabular-nums bg-muted px-2 py-1 rounded">
        {formatTime(duration, zoomLevel, displayedDuration)}
      </div>
    </div>
  );
};

export default TimelineControls; 