import React from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, ChevronLeft, ChevronRight, SkipBack, SkipForward } from "lucide-react";
import { formatTime } from '@/lib/utils';
import { MIN_ZOOM } from '@/hooks/useTimelineZoom';

interface TimelineControlsProps {
  togglePlayPause: () => void;
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  currentTime: number;
  zoomLevel: number;
  handleZoomSliderChange: (value: number[]) => void;
  displayedDuration: number;
  onPreviousFrame?: () => void;
  onNextFrame?: () => void;
  onPreviousLabel?: () => void;
  onNextLabel?: () => void;
  onCreateLabel?: () => void;
}

const MAX_ZOOM = 20;

const TimelineControls: React.FC<TimelineControlsProps> = ({
  togglePlayPause,
  isPlaying,
  isLoading,
  duration,
  currentTime,
  zoomLevel,
  handleZoomSliderChange,
  displayedDuration,
  onPreviousFrame,
  onNextFrame,
  onPreviousLabel,
  onNextLabel,
  onCreateLabel,
}) => {
  return (
    <div className="flex items-center gap-3">
      {/* Left section: Start time + Add Label button */}
      <div className="flex items-center gap-2">
        <div className="text-xs text-primary font-mono min-w-[70px] text-center tabular-nums px-2 py-1 rounded">
          {formatTime(currentTime, zoomLevel, displayedDuration)}
        </div>

        {onCreateLabel && (
          <Button variant="outline" size="sm" onClick={onCreateLabel} disabled={isLoading || duration === 0}>
            <span>Add Label (L)</span>
          </Button>
        )}
      </div>

      {/* Center section: Media controls */}
      <div className="flex-grow flex items-center justify-center gap-2">
        <Button 
          onClick={onPreviousLabel} 
          variant="outline" 
          size="icon" 
          disabled={isLoading || duration === 0}
          title="Previous label"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        
        <Button 
          onClick={onPreviousFrame} 
          variant="outline" 
          size="icon" 
          disabled={isLoading || duration === 0}
          title="Previous frame"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button onClick={togglePlayPause} variant="outline" size="icon" disabled={isLoading || duration === 0}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <Button 
          onClick={onNextFrame} 
          variant="outline" 
          size="icon" 
          disabled={isLoading || duration === 0}
          title="Next frame"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <Button 
          onClick={onNextLabel} 
          variant="outline" 
          size="icon" 
          disabled={isLoading || duration === 0}
          title="Next label"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Right section: Zoom slider + End time */}
      <div className="flex items-center gap-2">
        <Slider
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.1}
          value={[zoomLevel]}
          onValueChange={handleZoomSliderChange}
          disabled={isLoading || duration === 0}
          className="w-24"
        />

        <div className="text-primary text-xs font-mono min-w-[70px] text-center tabular-nums px-2 py-1 rounded">
          {formatTime(duration, zoomLevel, displayedDuration)}
        </div>
      </div>
    </div>
  );
};

export default TimelineControls; 