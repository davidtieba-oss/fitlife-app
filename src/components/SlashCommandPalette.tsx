"use client";

// Floating palette for the coach composer. When the user types "/", the
// palette opens with deep-links into the demoted routes (Log / Workouts /
// Plan / Grocery / Progress / Today / Settings). Coach-first IA means the
// chat is the primary surface; this palette is the keyboard-friendly way
// to reach the rest of the app without touching the BottomNav "More" tab.

import Link from "next/link";
import {
  ClipboardList,
  Dumbbell,
  CalendarDays,
  ShoppingCart,
  TrendingUp,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";

interface Command {
  cmd: string;
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
}

const COMMANDS: Command[] = [
  { cmd: "log", href: "/log", label: "Log", desc: "Meals, water, weight", icon: ClipboardList },
  { cmd: "workout", href: "/workouts", label: "Workouts", desc: "Templates, sets, rest timer", icon: Dumbbell },
  { cmd: "plan", href: "/plan", label: "Plan", desc: "Weekly training and meal plans", icon: CalendarDays },
  { cmd: "grocery", href: "/grocery", label: "Grocery", desc: "Shopping list", icon: ShoppingCart },
  { cmd: "progress", href: "/progress", label: "Progress", desc: "Charts and photos", icon: TrendingUp },
  { cmd: "today", href: "/today", label: "Today", desc: "Dashboard", icon: LayoutDashboard },
  { cmd: "settings", href: "/settings", label: "Settings", desc: "Profile, AI, voice, theme", icon: Settings },
];

export function isSlashQuery(s: string): boolean {
  return s.trimStart().startsWith("/");
}

export default function SlashCommandPalette({
  query,
  onSelect,
}: {
  query: string;
  onSelect: () => void;
}) {
  const term = query.trimStart().replace(/^\//, "").toLowerCase().trim();
  const items = term
    ? COMMANDS.filter(
        (c) => c.cmd.includes(term) || c.label.toLowerCase().includes(term)
      )
    : COMMANDS;

  if (items.length === 0) return null;

  return (
    <div className="mb-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-lg">
      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">
        Jump to
      </div>
      <ul className="max-h-64 overflow-y-auto">
        {items.map(({ cmd, href, label, desc, icon: Icon }) => (
          <li key={cmd}>
            <Link
              href={href}
              onClick={onSelect}
              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-600/15 text-violet-500 dark:text-violet-400 flex items-center justify-center shrink-0">
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  /{cmd}
                  <span className="ml-2 text-xs text-gray-500 dark:text-slate-400 font-normal">
                    {label}
                  </span>
                </p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                  {desc}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
