interface useFileNavigationProps {
  activeIndex: number;
  filesLength: number;
  onIndexChange: (index: number) => void;
}

export function useFileNavigation({ activeIndex, filesLength, onIndexChange }: useFileNavigationProps) {
  const handlePrevious = () => {
    if (activeIndex > 0) {
      onIndexChange(activeIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeIndex < filesLength - 1) {
      onIndexChange(activeIndex + 1);
    }
  };
  
  return { handlePrevious, handleNext };
} 