"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  getProfiles,
  initProfiles,
  setActiveProfileId,
  type Profile,
} from "./storage";

interface ProfileContextValue {
  profiles: Profile[];
  activeId: string;
  activeProfile: Profile | null;
  needsOnboarding: boolean;
  switchProfile: (id: string) => void;
  refreshProfiles: () => void;
  completeOnboarding: (profileId: string) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be inside ProfileProvider");
  return ctx;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = initProfiles();
    if (id === "") {
      setNeedsOnboarding(true);
    } else {
      setActiveId(id);
      setProfiles(getProfiles());
    }
    setReady(true);
  }, []);

  const refreshProfiles = useCallback(() => {
    setProfiles(getProfiles());
  }, []);

  const switchProfile = useCallback(
    (id: string) => {
      setActiveProfileId(id);
      setActiveId(id);
      refreshProfiles();
    },
    [refreshProfiles]
  );

  const completeOnboarding = useCallback(
    (profileId: string) => {
      setActiveProfileId(profileId);
      setActiveId(profileId);
      setNeedsOnboarding(false);
      refreshProfiles();
    },
    [refreshProfiles]
  );

  const activeProfile = profiles.find((p) => p.id === activeId) ?? null;

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeId,
        activeProfile,
        needsOnboarding,
        switchProfile,
        refreshProfiles,
        completeOnboarding,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
