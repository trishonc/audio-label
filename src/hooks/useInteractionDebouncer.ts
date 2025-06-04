import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook to manage a debounced interaction state.
 * When `pingInteraction` is called, `isInteracting` becomes true and will revert to false
 * after the specified `debounceTime` unless `pingInteraction` is called again.
 *
 * @param debounceTime The time in milliseconds to wait before setting `isInteracting` to false.
 * @returns A tuple: [isInteracting (boolean), pingInteraction (function)].
 */
export const useInteractionDebouncer = (
  debounceTime: number
): [boolean, () => void] => {
  const [isInteracting, setIsInteracting] = useState(false);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const pingInteraction = useCallback(() => {
    setIsInteracting(true);
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = setTimeout(() => {
      setIsInteracting(false);
      interactionTimeoutRef.current = null; // Clear the ref after timeout executes
    }, debounceTime);
  }, [debounceTime]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, []);

  return [isInteracting, pingInteraction];
}; 