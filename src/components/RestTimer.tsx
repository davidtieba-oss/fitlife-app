"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Timer } from "lucide-react";

const PRESETS = [30, 60, 90, 120];

export default function RestTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    setRunning(false);
    setSeconds(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          stop();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, stop]);

  function start(secs: number) {
    setSeconds(secs);
    setRunning(true);
    setShowPicker(false);
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  // Countdown overlay
  if (running) {
    return (
      <div className="fixed inset-0 z-[90] bg-slate-950/90 flex flex-col items-center justify-center">
        <p className="text-sm text-slate-400 mb-2 font-medium">Rest Timer</p>
        <div className="text-7xl font-bold text-teal-400 tabular-nums">
          {mins}:{secs.toString().padStart(2, "0")}
        </div>
        <div className="mt-2 w-48 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: "100%" }}
          />
        </div>
        <button
          onClick={stop}
          className="mt-8 flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition"
        >
          <X size={16} /> Skip
        </button>
      </div>
    );
  }

  // Picker
  if (showPicker) {
    return (
      <div className="bg-slate-800 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Timer size={14} /> Rest Timer
          </span>
          <button onClick={() => setShowPicker(false)} className="text-slate-500 hover:text-slate-300">
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => start(p)}
              className="bg-slate-700 hover:bg-teal-600 text-white py-2 rounded-lg text-xs font-medium transition"
            >
              {p >= 60 ? `${p / 60}m` : `${p}s`}
              {p === 90 && <span className="block text-[9px] text-slate-400">1:30</span>}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Custom (sec)"
            className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={() => {
              const val = parseInt(customInput);
              if (val > 0) start(val);
            }}
            className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-2 rounded-lg text-xs font-medium transition"
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  // Toggle button
  return (
    <button
      onClick={() => setShowPicker(true)}
      className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium transition"
    >
      <Timer size={14} /> Rest Timer
    </button>
  );
}
