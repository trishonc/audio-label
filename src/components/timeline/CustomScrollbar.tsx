import React, { useRef, useCallback, useEffect, useState } from 'react';

interface CustomScrollbarProps {
  totalDuration: number;
  viewBoxStartTime: number;
  displayedDuration: number;
  onScrub: (newStartTime: number) => void;
  disabled?: boolean;
}

const CustomScrollbar: React.FC<CustomScrollbarProps> = ({
  totalDuration,
  viewBoxStartTime,
  displayedDuration,
  onScrub,
  disabled = false,
}) => {
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubStartX, setScrubStartX] = useState(0);
  const [scrubStartViewBoxTime, setScrubStartViewBoxTime] = useState(0);

  const thumbWidthPercent = totalDuration > 0 ? (displayedDuration / totalDuration) * 100 : 0;
  const thumbPositionPercent = totalDuration > 0 ? (viewBoxStartTime / totalDuration) * 100 : 0;

  const handleMouseDownTrack = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !scrollbarRef.current) return;
    const rect = scrollbarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    // Calculate new viewBoxStartTime based on click position, centering thumb if possible
    const newThumbWidthPx = (displayedDuration / totalDuration) * rect.width;
    let newStartTime = ((clickX - newThumbWidthPx / 2) / rect.width) * totalDuration;
    newStartTime = Math.max(0, Math.min(newStartTime, totalDuration - displayedDuration));
    if (totalDuration - displayedDuration <=0) newStartTime = 0;
    onScrub(newStartTime);
  };

  const handleMouseDownThumb = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.stopPropagation(); // Prevent track click when clicking thumb
    setIsScrubbing(true);
    setScrubStartX(e.clientX);
    setScrubStartViewBoxTime(viewBoxStartTime);
    document.body.style.cursor = 'grabbing';
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isScrubbing || !scrollbarRef.current || disabled) return;

    const rect = scrollbarRef.current.getBoundingClientRect();
    const deltaX = e.clientX - scrubStartX;
    const timeDelta = (deltaX / rect.width) * totalDuration;
    
    let newStartTime = scrubStartViewBoxTime + timeDelta;
    newStartTime = Math.max(0, Math.min(newStartTime, totalDuration - displayedDuration));
    if (totalDuration - displayedDuration <= 0) newStartTime = 0;
    onScrub(newStartTime);
  }, [isScrubbing, scrubStartX, scrubStartViewBoxTime, totalDuration, displayedDuration, onScrub, disabled]);

  const handleMouseUp = useCallback(() => {
    if (!isScrubbing) return;
    setIsScrubbing(false);
    document.body.style.cursor = 'auto';
  }, [isScrubbing]);

  useEffect(() => {
    if (isScrubbing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'auto'; // Ensure cursor reset on unmount
    };
  }, [isScrubbing, handleMouseMove, handleMouseUp]);

  if (totalDuration <= 0 || displayedDuration >= totalDuration) {
    return null; // Don't render if no duration or if view is full width (no scroll needed)
  }

  return (
    <div
      ref={scrollbarRef}
      className={`w-full h-3 bg-muted rounded cursor-pointer ${disabled ? 'opacity-50' : ''}`}
      onMouseDown={handleMouseDownTrack}
      title={disabled ? "Scrollbar disabled" : "Scroll timeline"}
    >
      <div
        ref={thumbRef}
        className={`h-full bg-primary/70 rounded hover:bg-primary transition-colors ${isScrubbing ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          width: `${thumbWidthPercent}%`,
          marginLeft: `${thumbPositionPercent}%`,
          minWidth: '8px', // Ensure thumb is always somewhat visible/grabbable
        }}
        onMouseDown={handleMouseDownThumb}
      />
    </div>
  );
};

export default CustomScrollbar; 