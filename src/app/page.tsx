"use client";

// Coach-first landing redirector.
// First-launch users (no fitlife_has_visited flag) → /coach to meet the
// product through the AI surface. Returning users → /today (the dashboard).
// The full dashboard lives in src/app/today/page.tsx; do not re-add the
// dashboard here, the BottomNav's "Today" tab matches both / and /today
// for active state.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const VISITED_KEY = "fitlife_has_visited";

export default function HomeRedirector() {
  const router = useRouter();

  useEffect(() => {
    let target = "/today";
    try {
      const visited = localStorage.getItem(VISITED_KEY);
      if (!visited) {
        localStorage.setItem(VISITED_KEY, "1");
        target = "/coach";
      }
    } catch {
      // localStorage unavailable — fall back to /today.
    }
    router.replace(target);
  }, [router]);

  return null;
}
