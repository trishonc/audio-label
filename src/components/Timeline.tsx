import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Play, Pause } from "lucide-react"

interface TimelineProps {
  url: string | null
  videoElement: HTMLVideoElement | null
}

const Timeline: React.FC<TimelineProps> = ({ url, videoElement }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)
  
  const [isLoading, setIsLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [isPlaying, setIsPlaying] = useState(false)

  // Audio scrubbing state
  const scrubAudioRef = useRef<AudioBufferSourceNode | null>(null)
  const scrubGainRef = useRef<GainNode | null>(null)

  const togglePlayPause = useCallback(() => {
    if (!videoElement) return
    
    if (videoElement.paused) {
      videoElement.play().catch(error => {
        console.error("Error attempting to play video:", error)
        setIsPlaying(false) // Ensure UI reflects inability to play
      })
    } else {
      videoElement.pause()
    }
  }, [videoElement])

  // Listen to video play/pause events
  useEffect(() => {
    if (!videoElement) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)

    // Set initial isPlaying state
    setIsPlaying(!videoElement.paused)

    return () => {
      videoElement.removeEventListener('play', handlePlay)
      videoElement.removeEventListener('pause', handlePause)
    }
  }, [videoElement])

  const processAudioData = useCallback(async (url: string) => {
    try {
      setIsLoading(true)
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      
      audioBufferRef.current = audioBuffer
      setDuration(audioBuffer.duration)

      // Generate waveform data with better scaling
      const channelData = audioBuffer.getChannelData(0)
      const samples = 1000 // Number of waveform bars
      const blockSize = Math.floor(channelData.length / samples)
      const waveform: number[] = []

      let maxValue = 0

      for (let i = 0; i < samples; i++) {
        const start = i * blockSize
        const end = start + blockSize
        let sum = 0
        
        for (let j = start; j < end && j < channelData.length; j++) {
          sum += Math.abs(channelData[j])
        }
        
        const average = sum / blockSize
        waveform.push(average)
        maxValue = Math.max(maxValue, average)
      }

      // Normalize waveform data for better visibility
      const normalizedWaveform = waveform.map(value => 
        maxValue > 0 ? (value / maxValue) : 0
      )

      setWaveformData(normalizedWaveform)
    } catch (error) {
      console.error('Error processing audio:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    // Get actual theme colors from CSS custom properties
    const styles = getComputedStyle(document.documentElement)
    const backgroundColor = styles.getPropertyValue('--muted').trim()
    const primaryColor = styles.getPropertyValue('--primary').trim()
    const mutedForegroundColor = styles.getPropertyValue('--muted-foreground').trim()
    const destructiveColor = styles.getPropertyValue('--destructive').trim()

    // Draw background using actual theme muted color
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)

    if (waveformData.length === 0) return

    const barWidth = width / waveformData.length
    const progress = duration > 0 ? currentTime / duration : 0

    // Draw waveform bars
    waveformData.forEach((value, index) => {
      const barHeight = Math.max(2, value * height * 0.9)
      const x = index * barWidth
      const y = (height - barHeight) / 2

      // Color based on playback progress - using actual theme colors
      const isPlayed = index / waveformData.length <= progress
      ctx.fillStyle = isPlayed ? primaryColor : mutedForegroundColor
      
      ctx.fillRect(x, y, Math.max(1, barWidth - 0.5), barHeight)
    })

    // Draw progress line using actual destructive color
    if (progress > 0) {
      const progressX = progress * width
      ctx.strokeStyle = destructiveColor
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(progressX, 0)
      ctx.lineTo(progressX, height)
      ctx.stroke()
    }
  }, [waveformData, currentTime, duration])

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    
    canvas.width = rect.width * dpr
    canvas.height = 80 * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = '80px'
    
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
    }

    // Redraw after resize
    drawWaveform()
  }, [drawWaveform])

  const startAudioScrubbing = useCallback((time: number) => {
    if (!audioContextRef.current || !audioBufferRef.current) return

    // Stop previous scrub audio
    if (scrubAudioRef.current) {
      scrubAudioRef.current.stop()
    }

    try {
      const source = audioContextRef.current.createBufferSource()
      const gainNode = audioContextRef.current.createGain()
      
      source.buffer = audioBufferRef.current
      source.connect(gainNode)
      gainNode.connect(audioContextRef.current.destination)
      
      // Set low volume for scrubbing
      gainNode.gain.value = 0.3
      
      source.start(0, time)
      
      scrubAudioRef.current = source
      scrubGainRef.current = gainNode

      // Stop after a short duration
      setTimeout(() => {
        if (scrubAudioRef.current === source) {
          source.stop()
          scrubAudioRef.current = null
        }
      }, 100)
    } catch (error) {
      console.error('Error during audio scrubbing:', error)
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current || !videoElement || duration === 0) return

    setIsDragging(true)
    const rect = canvasRef.current.getBoundingClientRect()
    const progress = (e.clientX - rect.left) / rect.width
    const time = Math.max(0, Math.min(duration, progress * duration))
    
    videoElement.currentTime = time
    setCurrentTime(time)
    startAudioScrubbing(time)
  }, [videoElement, duration, startAudioScrubbing])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current || !videoElement || duration === 0) return

    const rect = canvasRef.current.getBoundingClientRect()
    const progress = (e.clientX - rect.left) / rect.width
    const time = Math.max(0, Math.min(duration, progress * duration))
    
    videoElement.currentTime = time
    setCurrentTime(time)
    startAudioScrubbing(time)
  }, [isDragging, videoElement, duration, startAudioScrubbing])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    if (scrubAudioRef.current) {
      scrubAudioRef.current.stop()
      scrubAudioRef.current = null
    }
  }, [])

  // Initialize audio processing when URL changes
  useEffect(() => {
    if (url) {
      processAudioData(url)
    } else {
      setWaveformData([])
      setDuration(0)
      setCurrentTime(0)
    }
  }, [url, processAudioData])

  // Setup canvas and resize handling
  useEffect(() => {
    updateCanvasSize()
    
    const handleResize = () => updateCanvasSize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [updateCanvasSize])

  // Separate effect for animation loop
  useEffect(() => {
    if (!videoElement) return

    const animate = () => {
      if (videoElement && !isDragging) {
        setCurrentTime(videoElement.currentTime)
      }
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [videoElement, isDragging])

  // Draw waveform
  useEffect(() => {
    drawWaveform()
  }, [drawWaveform])

  // Global mouse events for dragging
  useEffect(() => {
    if (!isDragging) return

    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleMouseMove(e as any)
    }

    const handleGlobalMouseUp = () => {
      handleMouseUp()
    }

    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-full space-y-2">
      <div 
        ref={containerRef}
        className="relative bg-background border border-border rounded-md overflow-hidden shadow-sm"
      >
        <canvas
          ref={canvasRef}
          className="w-full cursor-pointer hover:bg-muted/50 transition-colors"
          onMouseDown={handleMouseDown}
          style={{ height: '80px' }}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent animate-spin rounded-full" />
              Loading waveform...
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center text-xs text-muted-foreground font-mono">
        <span className="bg-muted px-2 py-1 rounded">{formatTime(currentTime)}</span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={togglePlayPause}
          disabled={!videoElement || duration === 0}
          className="h-8 w-8 p-0"
        >
          {isPlaying ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </Button>
        
        <span className="bg-muted px-2 py-1 rounded">{formatTime(duration)}</span>
      </div>
    </div>
  )
}

export default Timeline
