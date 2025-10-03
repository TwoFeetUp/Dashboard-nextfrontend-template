'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Loader2, X } from 'lucide-react'
import { Button } from './ui/button'

interface AudioRecorderProps {
  onTranscription: (text: string) => void
  onProcessAudio?: (audioBlob: Blob) => Promise<{ text: string }>
  disabled?: boolean
  className?: string
  language?: string
}

export function AudioRecorder({ 
  onTranscription, 
  onProcessAudio,
  disabled = false, 
  className = '',
  language = 'nl'
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Visualize audio levels
  const visualizeAudio = useCallback(() => {
    if (!analyserRef.current) return
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    
    // Calculate average volume
    const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length
    setAudioLevel(average / 255) // Normalize to 0-1
    
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(visualizeAudio)
    }
  }, [isRecording])

  const startRecording = async () => {
    try {
      setError(null)
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000, // Optimal for speech
          echoCancellation: true,
          noiseSuppression: true
        } 
      })
      streamRef.current = stream

      // Setup audio visualization
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)
      
      // Start visualization
      visualizeAudio()

      // Setup MediaRecorder with preferred codecs
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 32000 // Lower bitrate for speech
      })
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Stop visualization
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        setAudioLevel(0)
        
        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        
        // Transcribe audio
        await transcribeAudio(audioBlob)
      }

      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
    } catch (err: any) {
      console.error('Error starting recording:', err)
      setError(err.message || 'Failed to start recording')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      // Stop stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    setError(null)
    
    try {
      let result: { text: string }
      
      if (onProcessAudio) {
        // Use custom audio processor if provided
        result = await onProcessAudio(audioBlob)
      } else {
        // Default: no processor provided
        console.warn('No audio processor provided')
        result = { text: '' }
      }
      
      if (result.text) {
        onTranscription(result.text)
      }
    } catch (err: any) {
      console.error('Transcription error:', err)
      setError(err.message || 'Failed to transcribe audio')
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleClick = () => {
    if (disabled || isTranscribing) return
    
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <div className={`relative ${className}`}>
      <Button
        type="button"
        onClick={handleClick}
        disabled={disabled || isTranscribing}
        size="sm"
        variant={isRecording ? "destructive" : "secondary"}
        className={`relative ${isRecording ? 'animate-pulse' : ''}`}
        title={isRecording ? "Stop opname" : "Start spraakopname"}
      >
        {isTranscribing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <>
            <Mic className="h-4 w-4 z-10 relative" />
            {/* Audio level indicator - pulsing ring */}
            <div 
              className="absolute inset-0 bg-red-500 opacity-20 rounded"
              style={{ 
                transform: `scale(${0.8 + audioLevel * 0.4})`,
                transition: 'transform 0.1s'
              }}
            />
          </>
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
      
      {/* Error message */}
      {error && (
        <div className="absolute top-full mt-2 right-0 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-600 whitespace-nowrap z-10">
          <div className="flex items-center gap-2">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
      
      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute -top-1 -right-1">
          <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  )
}