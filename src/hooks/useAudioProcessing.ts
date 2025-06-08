import { useState, useCallback, useRef } from 'react';

export interface UseAudioProcessingReturn {
  isLoading: boolean;
  duration: number;
  waveformData: number[];
  audioContextRef: React.RefObject<AudioContext | null>;
  audioBufferRef: React.RefObject<AudioBuffer | null>;
  processAudioData: (url: string) => Promise<void>;
  setWaveformData: React.Dispatch<React.SetStateAction<number[]>>;
  setDuration: React.Dispatch<React.SetStateAction<number>>;
}

export const useAudioProcessing = (): UseAudioProcessingReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  const processAudioData = useCallback(async (url: string) => {
    try {
      setIsLoading(true);
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      audioBufferRef.current = audioBuffer;
      setDuration(audioBuffer.duration);

      const channelData = audioBuffer.getChannelData(0);
      // Dynamic sample count based on audio duration for optimal resolution
      // Base: 4000 samples, with additional samples for longer audio
      const baseSamples = 4000;
      const durationBonus = Math.floor(audioBuffer.duration / 10) * 500; // +500 samples per 10 seconds
      const samples = Math.min(baseSamples + durationBonus, 8000); // Cap at 8000 samples
      const blockSize = Math.floor(channelData.length / samples);
      const waveform: number[] = [];
      let maxValue = 0;

      for (let i = 0; i < samples; i++) {
        const start = i * blockSize;
        const end = start + blockSize;
        let sum = 0;
        
        // Use RMS (Root Mean Square) for better audio energy representation
        for (let j = start; j < end && j < channelData.length; j++) {
          sum += channelData[j] * channelData[j];
        }
        
        const rms = Math.sqrt(sum / blockSize);
        waveform.push(rms);
        maxValue = Math.max(maxValue, rms);
      }

      const normalizedWaveform = waveform.map(value => 
        maxValue > 0 ? (value / maxValue) : 0
      );

      setWaveformData(normalizedWaveform);
    } catch (error) {
      console.error('Error processing audio:', error);
      setWaveformData([]);
      setDuration(0);
      audioBufferRef.current = null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { 
    isLoading, 
    duration, 
    waveformData, 
    audioContextRef, 
    audioBufferRef, 
    processAudioData,
    setWaveformData,
    setDuration,
  };
}; 