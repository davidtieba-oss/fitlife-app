"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, LayoutDashboard, MoreHorizontal } from "lucide-react";

const tabs = [
  { href: "/coach", label: "Chat", icon: MessageCircle, match: (p: string) => p === "/coach" },
  { href: "/", label: "Today", icon: LayoutDashboard, match: (p: string) => p === "/" || p === "/today" },
  { href: "/more", label: "More", icon: MoreHorizontal, match: (p: string) => p === "/more" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-700/50 z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors ${
                active ? "text-teal-400" : "text-slate-400 hover:text-slate-200"
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
