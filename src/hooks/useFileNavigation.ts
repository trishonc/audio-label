interface useFileNavigationProps {
  activeIndex: number;
  filesLength: number;
  onIndexChange: (index: number) => void;
}

export function useFileNavigation({ activeIndex, filesLength, onIndexChange }: useFileNavigationProps) {
  const handlePrevious = () => {
    if (filesLength === 0) return;
    
    if (activeIndex > 0) {
      onIndexChange(activeIndex - 1);
    } else {
      // Wrap to the last file
      onIndexChange(filesLength - 1);
    }
  };

  const handleNext = () => {
    if (filesLength === 0) return;
    
    if (activeIndex < filesLength - 1) {
      onIndexChange(activeIndex + 1);
    } else {
      // Wrap to the first file
      onIndexChange(0);
    }
  };
  
  return { handlePrevious, handleNext };
} 