"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, X, Gauge } from "lucide-react";

const SPEED_OPTIONS = [1, 1.25, 1.5] as const;

export interface CoachAudioPlayerHandle {
  close: () => void;
}

interface Props {
  src: string;
  label?: string;
  onEnded: () => void;
  onClose: () => void;
  onAudioReady?: (audio: HTMLAudioElement) => void;
}

export default function CoachAudioPlayer({
  src,
  label,
  onEnded,
  onClose,
  onAudioReady,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEED_OPTIONS)[number]>(1);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;
    audio.playbackRate = speed;
    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => {
      setPlaying(false);
      onEnded();
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnd);
    if (onAudioReady) onAudioReady(audio);
    audio.play().catch(() => {
      // Autoplay may be blocked — user can hit play.
    });
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnd);
      audio.pause();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }

  function onSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Number(e.target.value);
    setCurrent(a.currentTime);
  }

  function nextSpeed() {
    const idx = SPEED_OPTIONS.indexOf(speed);
    setSpeed(SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]);
  }

  return (
    <div className="bg-slate-800/95 backdrop-blur border border-slate-700 rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
      <button
        type="button"
        onClick={togglePlay}
        className="w-8 h-8 shrink-0 bg-violet-600 hover:bg-violet-500 rounded-full flex items-center justify-center text-white transition"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className="flex-1 min-w-0">
        {label && (
          <p className="text-[10px] text-slate-400 truncate">{label}</p>
        )}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={onSeek}
          className="w-full h-1 accent-violet-500"
        />
      </div>
      <button
        type="button"
        onClick={nextSpeed}
        className="flex items-center gap-0.5 text-[10px] text-slate-300 bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded-md transition shrink-0"
        title="Playback speed"
      >
        <Gauge size={10} /> {speed}x
      </button>
      <button
        type="button"
        onClick={onClose}
        className="text-slate-400 hover:text-white p-1 shrink-0"
        aria-label="Close player"
      >
        <X size={14} />
      </button>
    </div>
  );
}
