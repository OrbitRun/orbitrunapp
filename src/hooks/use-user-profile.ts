import { useEffect, useState } from "react";
import { DEFAULT_PROFILE, loadProfile, type UserProfile } from "@/lib/user-profile";

export function useUserProfile(): UserProfile {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  useEffect(() => {
    setProfile(loadProfile());
    const onUpdate = () => setProfile(loadProfile());
    window.addEventListener("orbit:profile-update", onUpdate);
    return () => window.removeEventListener("orbit:profile-update", onUpdate);
  }, []);
  return profile;
}
