import { useEffect, useState } from "react";
import {
  loadZonePacing,
  ZONE_PACING_EVENT,
  type ZonePacingConfig,
} from "@/lib/zone-pacing";

export function useZonePacing(): ZonePacingConfig {
  const [cfg, setCfg] = useState<ZonePacingConfig>(() => loadZonePacing());
  useEffect(() => {
    setCfg(loadZonePacing());
    const onUpdate = () => setCfg(loadZonePacing());
    window.addEventListener(ZONE_PACING_EVENT, onUpdate);
    return () => window.removeEventListener(ZONE_PACING_EVENT, onUpdate);
  }, []);
  return cfg;
}
