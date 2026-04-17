"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const VISITED_KEY = "fitlife_has_visited";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const visited = typeof window !== "undefined" && localStorage.getItem(VISITED_KEY);
    if (!visited) {
      try {
        localStorage.setItem(VISITED_KEY, "1");
      } catch {}
      router.replace("/coach");
    } else {
      router.replace("/today");
    }
  }, [router]);

  return (
    <div className="h-[60vh] flex items-center justify-center text-slate-500 text-sm">
      Loading...
    </div>
  );
}
