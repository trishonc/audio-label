import { useRef, useEffect, forwardRef } from 'react';
import WaveformCanvas from '@/components/timeline/WaveformCanvas';
import CustomScrollbar from '@/components/timeline/CustomScrollbar';
import { type Label } from '@/lib/types';

interface TimelineWaveformProps {
  waveformData: number[];
  currentTime: number;
  duration: number;
  isLoading: boolean;
  onSeekStart: (time: number) => void;
  zoomLevel: number;
  viewBoxStartTime: number;
  labels: Label[];
  displayedDuration: number;
  onScrub: (time: number) => void;
  handleWheelScroll: (event: WheelEvent) => void;
}

const TimelineWaveform = forwardRef<HTMLCanvasElement, TimelineWaveformProps>(({
  waveformData,
  currentTime,
  duration,
  isLoading,
  onSeekStart,
  zoomLevel,
  viewBoxStartTime,
  labels,
  displayedDuration,
  onScrub,
  handleWheelScroll,
}, ref) => {
  const waveformContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = waveformContainerRef.current;
    if (container && !isLoading) {
      const wheelListener = (event: WheelEvent) => handleWheelScroll(event);
      container.addEventListener('wheel', wheelListener, { passive: false });
      return () => {
        container.removeEventListener('wheel', wheelListener);
      };
    }
  }, [handleWheelScroll, isLoading]);

  return (
    <>
      <div ref={waveformContainerRef} className="waveform-container relative">
        <WaveformCanvas
          ref={ref}
          waveformData={waveformData}
          currentTime={currentTime}
          duration={duration}
          isLoading={isLoading}
          onSeekStart={onSeekStart}
          height={200}
          zoomLevel={zoomLevel}
          viewBoxStartTime={viewBoxStartTime}
          labels={labels}
        />
      </div>

      {duration > 0 && (
        <CustomScrollbar
          viewBoxStartTime={viewBoxStartTime}
          displayedDuration={displayedDuration}
          totalDuration={duration}
          onScrub={onScrub}
          disabled={isLoading}
        />
      )}
    </>
  );
});

TimelineWaveform.displayName = 'TimelineWaveform';

export default TimelineWaveform; 