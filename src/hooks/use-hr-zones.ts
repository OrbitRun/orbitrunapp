import { useEffect, useState } from "react";
import { HR_ZONES_EVENT, loadHrZones, type HrZoneConfig } from "@/lib/hr-zones-config";

export function useHrZones(): HrZoneConfig | null {
  const [config, setConfig] = useState<HrZoneConfig | null>(null);
  useEffect(() => {
    setConfig(loadHrZones());
    const onUpdate = () => setConfig(loadHrZones());
    window.addEventListener(HR_ZONES_EVENT, onUpdate);
    return () => window.removeEventListener(HR_ZONES_EVENT, onUpdate);
  }, []);
  return config;
}
