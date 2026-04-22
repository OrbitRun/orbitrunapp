// Shoe tracker — store user's running shoes + lifetime distance, persisted in localStorage.

export type Shoe = {
  id: string;
  brand: string;
  model: string;
  maxDistanceM: number;
  distanceM: number;
  active: boolean;
  createdAt: number;
};

const STORAGE_KEY = "orbit:shoes:v1";
export const DEFAULT_MAX_M = 800_000; // 800 km

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("orbit:shoes-change"));
}

export function loadShoes(): Shoe[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Shoe[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveShoes(shoes: Shoe[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shoes));
    emit();
  } catch {
    /* noop */
  }
}

export function addShoe(input: { brand: string; model: string; maxDistanceM?: number }): Shoe {
  const shoes = loadShoes();
  const shoe: Shoe = {
    id: uid(),
    brand: input.brand.trim(),
    model: input.model.trim(),
    maxDistanceM: input.maxDistanceM ?? DEFAULT_MAX_M,
    distanceM: 0,
    active: shoes.every((s) => !s.active), // first shoe becomes active automatically
    createdAt: Date.now(),
  };
  saveShoes([shoe, ...shoes]);
  return shoe;
}

export function removeShoe(id: string) {
  const next = loadShoes().filter((s) => s.id !== id);
  // Make sure at least one shoe is active if any exist.
  if (next.length && !next.some((s) => s.active)) next[0].active = true;
  saveShoes(next);
}

export function setActiveShoe(id: string) {
  const next = loadShoes().map((s) => ({ ...s, active: s.id === id }));
  saveShoes(next);
}

export function addDistanceToActiveShoe(distanceM: number) {
  if (distanceM <= 0) return;
  const shoes = loadShoes();
  if (!shoes.length) return;
  const next = shoes.map((s) =>
    s.active ? { ...s, distanceM: s.distanceM + distanceM } : s,
  );
  saveShoes(next);
}
