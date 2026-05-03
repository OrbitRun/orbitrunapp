import { useEffect, useState } from "react";
import { DEFAULT_VITALS, loadVitals, VITALS_EVENT, type Vitals } from "@/lib/vitals";

export function useVitals(): Vitals {
  const [v, setV] = useState<Vitals>(DEFAULT_VITALS);
  useEffect(() => {
    setV(loadVitals());
    const onUpdate = () => setV(loadVitals());
    window.addEventListener(VITALS_EVENT, onUpdate);
    return () => window.removeEventListener(VITALS_EVENT, onUpdate);
  }, []);
  return v;
}
