"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Settings, ChevronDown, Check, RefreshCw } from "lucide-react";
import { useProfile } from "@/lib/ProfileContext";

export default function AppHeader() {
  const { profiles, activeProfile, switchProfile, needsOnboarding } = useProfile();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (needsOnboarding) return null;

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-gray-200/50 dark:border-slate-700/50">
      <div className="max-w-lg mx-auto h-12 flex items-center justify-between px-4">
        <h1 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
          Fit<span className="text-teal-500 dark:text-teal-400">Life</span>
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="p-1.5 text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <Link
            href="/settings"
            className="p-1.5 text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition"
          >
            <Settings size={18} />
          </Link>

          {/* Profile switcher */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            >
              {activeProfile && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: activeProfile.color }}
                >
                  {activeProfile.name.charAt(0).toUpperCase()}
                </div>
              )}
              <ChevronDown
                size={14}
                className={`text-gray-400 dark:text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      switchProfile(p.id);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-slate-700 transition text-left"
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-900 dark:text-white flex-1 truncate">
                      {p.name}
                    </span>
                    {p.id === activeProfile?.id && (
                      <Check size={14} className="text-teal-400 shrink-0" />
                    )}
                  </button>
                ))}
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="block w-full px-3 py-2.5 text-[10px] text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition border-t border-gray-200 dark:border-slate-700 text-center"
                >
                  Manage Profiles
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
