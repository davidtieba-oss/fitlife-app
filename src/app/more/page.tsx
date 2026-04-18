"use client";

// Lists every demoted route after the IA collapsed to 3 tabs (Chat / Today /
// More). Without this page, Log / Workouts / Plan / Progress / Grocery /
// Settings would only be reachable via deep-links and dashboard tiles.

import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  Dumbbell,
  CalendarDays,
  TrendingUp,
  ShoppingCart,
  Settings,
  type LucideIcon,
} from "lucide-react";

interface Entry {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
}

const ENTRIES: Entry[] = [
  { href: "/today",    label: "Today",     desc: "Dashboard, weight, nutrition, workout summary", icon: LayoutDashboard },
  { href: "/log",      label: "Log",       desc: "Meals, calories, water, weight",                icon: ClipboardList },
  { href: "/workouts", label: "Workouts",  desc: "Templates, sets, rest timer",                   icon: Dumbbell },
  { href: "/plan",     label: "Plan",      desc: "Weekly training and meal plans",                icon: CalendarDays },
  { href: "/progress", label: "Progress",  desc: "Weight, body, nutrition, photos",               icon: TrendingUp },
  { href: "/grocery",  label: "Grocery",   desc: "Shopping list from your meal plan",             icon: ShoppingCart },
  { href: "/settings", label: "Settings",  desc: "Profile, AI, voice, reminders, theme",          icon: Settings },
];

export default function MorePage() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">More</h1>
      <p className="text-xs text-gray-500 dark:text-slate-400">
        Everything that isn&apos;t the chat or today&apos;s dashboard.
      </p>
      <div className="space-y-2">
        {ENTRIES.map(({ href, label, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition rounded-2xl px-4 py-3"
          >
            <div className="w-9 h-9 rounded-lg bg-violet-600/15 text-violet-500 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Icon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
