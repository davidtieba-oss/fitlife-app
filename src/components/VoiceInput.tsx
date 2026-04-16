"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import {
  addTranscriptionUsage,
  type VoiceLanguage,
} from "@/lib/storage";

export type VoiceInputStatus = "idle" | "recording" | "transcribing";

interface VoiceInputProps {
  language: VoiceLanguage;
  autoStopOnSilence: boolean;
  disabled?: boolean;
  /** Render nothing while idle — used when the parent has typed text and wants
   * to show the send button instead. Recording/transcribing always render. */
  hideIdleButton?: boolean;
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
  onStatusChange?: (status: VoiceInputStatus) => void;
}

const MAX_RECORDING_SECONDS = 60;
const SILENCE_THRESHOLD = 8; // 0–255 average frequency magnitude
const SILENCE_MS = 2000; // 2 seconds of silence triggers auto-stop
const WAVEFORM_BARS = 12;

// Detect browser support for voice capture.
export function isVoiceInputSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof navigator === "undefined") return false;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return false;
  }
  if (typeof window.MediaRecorder === "undefined") return false;
  return true;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VoiceInput({
  language,
  autoStopOnSilence,
  disabled,
  hideIdleButton,
  onTranscript,
  onError,
  onStatusChange,
}: VoiceInputProps) {
  const [status, setStatus] = useState<VoiceInputStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(() =>
    Array(WAVEFORM_BARS).fill(0)
  );

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const updateStatus = useCallback(
    (next: VoiceInputStatus) => {
      setStatus(next);
      onStatusChange?.(next);
    },
    [onStatusChange]
  );

  const cleanupResources = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (maxTimeoutRef.current !== null) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
    silenceStartRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // Ignore — state transition will handle cleanup
      }
    }
  }, []);

  const transcribe = useCallback(
    async (audioBlob: Blob, durationSeconds: number) => {
      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        formData.append("language", language);

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const friendly =
            res.status >= 500 && res.status !== 502
              ? "Voice input failed — check your connection"
              : "Voice unavailable right now — try again";
          onError(friendly);
          return;
        }

        const data = (await res.json()) as { text?: string };
        const text = (data.text ?? "").trim();
        if (!text) {
          onError("I didn't catch that — try again");
          return;
        }

        addTranscriptionUsage(Math.max(1, Math.round(durationSeconds)));

        onTranscript(text);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(30);
        }
      } catch {
        onError("Voice input failed — check your connection");
      }
    },
    [language, onTranscript, onError]
  );

  const startRecording = useCallback(async () => {
    if (status !== "idle" || disabled) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError(
        "Enable microphone access in your browser settings to use voice input"
      );
      return;
    }

    streamRef.current = stream;

    let mediaRecorder: MediaRecorder;
    try {
      const preferredType = "audio/webm;codecs=opus";
      const options: MediaRecorderOptions =
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported?.(preferredType)
          ? { mimeType: preferredType }
          : {};
      mediaRecorder = new MediaRecorder(stream, options);
    } catch {
      onError("Voice input failed — check your connection");
      cleanupResources();
      return;
    }

    const chunks: Blob[] = [];
    chunksRef.current = chunks;
    recorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const durationSeconds = (Date.now() - startTimeRef.current) / 1000;
      const audioBlob = new Blob(chunks, { type: "audio/webm" });
      cleanupResources();
      if (audioBlob.size === 0) {
        updateStatus("idle");
        setElapsed(0);
        setLevels(Array(WAVEFORM_BARS).fill(0));
        onError("I didn't catch that — try again");
        return;
      }
      updateStatus("transcribing");
      void transcribe(audioBlob, durationSeconds).finally(() => {
        updateStatus("idle");
        setElapsed(0);
        setLevels(Array(WAVEFORM_BARS).fill(0));
      });
    };

    // Audio analysis for waveform + silence detection
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        audioCtxRef.current = audioCtx;
        analyserRef.current = analyser;
      }
    } catch {
      // Analyser is optional — the recording still works without it
    }

    startTimeRef.current = Date.now();
    silenceStartRef.current = null;
    setElapsed(0);
    setLevels(Array(WAVEFORM_BARS).fill(0));

    mediaRecorder.start();
    updateStatus("recording");

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50);
    }

    tickRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(secs);
    }, 250);

    maxTimeoutRef.current = setTimeout(() => {
      stopRecording();
    }, MAX_RECORDING_SECONDS * 1000);

    const analyser = analyserRef.current;
    if (analyser) {
      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const bucketSize = Math.floor(buffer.length / WAVEFORM_BARS) || 1;

      const loop = () => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(buffer);

        const bars: number[] = [];
        let total = 0;
        for (let i = 0; i < WAVEFORM_BARS; i++) {
          let sum = 0;
          const start = i * bucketSize;
          const end = Math.min(start + bucketSize, buffer.length);
          for (let j = start; j < end; j++) sum += buffer[j];
          const avg = sum / Math.max(1, end - start);
          bars.push(avg);
          total += avg;
        }
        const avgLevel = total / WAVEFORM_BARS;
        setLevels(bars);

        if (autoStopOnSilence) {
          if (avgLevel < SILENCE_THRESHOLD) {
            if (silenceStartRef.current === null) {
              silenceStartRef.current = Date.now();
            } else if (Date.now() - silenceStartRef.current > SILENCE_MS) {
              // Require at least ~1.5s of recording before auto-stopping
              if (Date.now() - startTimeRef.current > 1500) {
                stopRecording();
                return;
              }
            }
          } else {
            silenceStartRef.current = null;
          }
        }

        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [
    autoStopOnSilence,
    cleanupResources,
    disabled,
    onError,
    status,
    stopRecording,
    transcribe,
    updateStatus,
  ]);

  if (status === "transcribing") {
    return (
      <button
        type="button"
        disabled
        aria-label="Transcribing"
        className="bg-slate-700 text-slate-300 p-2.5 rounded-xl transition shrink-0 cursor-wait"
      >
        <Loader2 size={16} className="animate-spin" />
      </button>
    );
  }

  if (status === "recording") {
    return (
      <div className="flex-1 flex items-center gap-2 bg-red-500/10 border border-red-500/40 rounded-xl px-3 py-2">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
        <span className="text-[11px] font-medium text-red-300 shrink-0">
          Listening…
        </span>
        <div className="flex items-end gap-0.5 h-5 flex-1 min-w-0">
          {levels.map((level, i) => {
            const height = Math.max(10, Math.min(100, (level / 255) * 100 + 12));
            return (
              <span
                key={i}
                className="flex-1 bg-teal-400 rounded-sm transition-[height] duration-75"
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
        <span className="text-[11px] font-mono text-red-300 shrink-0 tabular-nums">
          {formatElapsed(elapsed)}
        </span>
        <button
          type="button"
          onClick={stopRecording}
          aria-label="Stop recording"
          className="bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-lg transition shrink-0 relative"
        >
          <span className="absolute inset-0 rounded-lg bg-red-500/60 animate-ping" />
          <Square size={12} className="relative fill-current" />
        </button>
      </div>
    );
  }

  if (hideIdleButton) return null;

  return (
    <button
      type="button"
      onClick={() => void startRecording()}
      disabled={disabled}
      aria-label="Start voice input"
      className="group bg-slate-700 hover:bg-teal-600 disabled:opacity-40 text-slate-200 hover:text-white p-2.5 rounded-xl transition shrink-0 relative overflow-hidden"
    >
      <span className="absolute inset-0 rounded-xl bg-teal-500/0 group-hover:bg-teal-500/20 group-hover:animate-pulse" />
      <Mic size={16} className="relative" />
    </button>
  );
}
