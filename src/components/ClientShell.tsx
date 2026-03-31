"use client";

import { type ReactNode } from "react";
import { ProfileProvider, useProfile } from "@/lib/ProfileContext";
import { ThemeProvider } from "@/lib/ThemeProvider";
import AppHeader from "./AppHeader";
import BottomNav from "./BottomNav";
import Onboarding from "./Onboarding";
import ServiceWorkerRegistrar from "./ServiceWorkerRegistrar";

function ShellInner({ children }: { children: ReactNode }) {
  const { needsOnboarding, activeId } = useProfile();

  if (needsOnboarding) {
    return <Onboarding />;
  }

  return (
    <>
      <AppHeader />
      <main key={activeId} className="max-w-lg mx-auto pb-20 px-4 pt-14 page-enter">
        {children}
      </main>
      <BottomNav />
      <ServiceWorkerRegistrar />
    </>
  );
}

export default function ClientShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ProfileProvider>
        <ShellInner>{children}</ShellInner>
      </ProfileProvider>
    </ThemeProvider>
  );
}
