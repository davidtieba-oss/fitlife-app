"use client";

// Coach-first IA: only 3 tabs. Chat is the primary surface, Today is the
// dashboard, More is the overflow page (src/app/more/page.tsx) that links
// to Log / Workouts / Plan / Progress / Grocery / Settings. Don't re-add
// per-feature tabs here — that's what /more is for.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageCircle, MoreHorizontal } from "lucide-react";

const tabs = [
  {
    href: "/coach",
    label: "Chat",
    icon: MessageCircle,
    match: (p: string) => p === "/coach",
  },
  {
    href: "/today",
    label: "Today",
    icon: LayoutDashboard,
    // "/" is the redirector; treat it as Today for active-state purposes
    // so the tab doesn't blink off during the redirect frame.
    match: (p: string) => p === "/" || p === "/today",
  },
  {
    href: "/more",
    label: "More",
    icon: MoreHorizontal,
    match: (p: string) => p === "/more",
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-gray-200/50 dark:border-slate-700/50 z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname ?? "");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                active ? "text-teal-500 dark:text-teal-400" : "text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
