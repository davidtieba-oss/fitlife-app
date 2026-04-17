"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  Dumbbell,
  CalendarDays,
  TrendingUp,
  ShoppingCart,
  Settings,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

type Item = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const ITEMS: Item[] = [
  { href: "/today", label: "Today", description: "Dashboard & daily summary", icon: LayoutDashboard },
  { href: "/log", label: "Log", description: "Meals, weight & water", icon: ClipboardList },
  { href: "/workouts", label: "Workouts", description: "Track your training", icon: Dumbbell },
  { href: "/plan", label: "Plan", description: "Weekly workout plan", icon: CalendarDays },
  { href: "/progress", label: "Progress", description: "Trends & stats", icon: TrendingUp },
  { href: "/grocery", label: "Grocery", description: "Shopping list", icon: ShoppingCart },
  { href: "/settings", label: "Settings", description: "Profile & preferences", icon: Settings },
];

export default function MorePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">More</h1>
      <ul className="bg-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-700/60">
        {ITEMS.map(({ href, label, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition active:scale-[0.99]"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-700/70 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-teal-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-[11px] text-slate-400 truncate">{description}</p>
              </div>
              <ChevronRight size={16} className="text-slate-500 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
