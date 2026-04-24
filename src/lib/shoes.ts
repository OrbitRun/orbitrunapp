export type Shoe = {
  id: string;
  brand: string;
  model: string;
  totalDistanceM: number;
  maxDistanceM: number;
  status: "active" | "retired";
  isPrimary: boolean;
  createdAt: number;
};

const SHOES_KEY = "orbit:shoes:v1";
export const DEFAULT_MAX_M = 800_000; // 800 km

export function loadShoes(): Shoe[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SHOES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Shoe[];
  } catch {
    return [];
  }
}

export function saveShoes(shoes: Shoe[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SHOES_KEY, JSON.stringify(shoes));
}

export function addShoe(input: {
  brand: string;
  model: string;
  startingDistanceM?: number;
  maxDistanceM?: number;
  makePrimary?: boolean;
}): Shoe {
  const shoes = loadShoes();
  const newShoe: Shoe = {
    id: `shoe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    brand: input.brand.trim(),
    model: input.model.trim(),
    totalDistanceM: Math.max(0, input.startingDistanceM ?? 0),
    maxDistanceM: input.maxDistanceM ?? DEFAULT_MAX_M,
    status: "active",
    isPrimary: false,
    createdAt: Date.now(),
  };
  // First active shoe becomes primary by default
  const hasPrimary = shoes.some((s) => s.isPrimary && s.status === "active");
  if (input.makePrimary || !hasPrimary) {
    shoes.forEach((s) => (s.isPrimary = false));
    newShoe.isPrimary = true;
  }
  shoes.push(newShoe);
  saveShoes(shoes);
  return newShoe;
}

export function deleteShoe(id: string) {
  const shoes = loadShoes().filter((s) => s.id !== id);
  // Ensure a primary remains if active shoes exist
  if (!shoes.some((s) => s.isPrimary) && shoes.some((s) => s.status === "active")) {
    const firstActive = shoes.find((s) => s.status === "active");
    if (firstActive) firstActive.isPrimary = true;
  }
  saveShoes(shoes);
}

export function setPrimaryShoe(id: string) {
  const shoes = loadShoes().map((s) => ({ ...s, isPrimary: s.id === id }));
  saveShoes(shoes);
}

export function toggleRetireShoe(id: string) {
  const shoes = loadShoes().map((s) =>
    s.id === id
      ? {
          ...s,
          status: s.status === "active" ? ("retired" as const) : ("active" as const),
          isPrimary: s.status === "active" ? false : s.isPrimary,
        }
      : s,
  );
  // Ensure primary still exists
  if (!shoes.some((x) => x.isPrimary && x.status === "active")) {
    const firstActive = shoes.find((x) => x.status === "active");
    if (firstActive) firstActive.isPrimary = true;
  }
  saveShoes(shoes);
}

/** Add distance (meters) to the active primary shoe. Called when a run is saved. */
export function addDistanceToPrimary(distanceM: number) {
  if (distanceM <= 0) return;
  const shoes = loadShoes();
  const primary = shoes.find((s) => s.isPrimary && s.status === "active");
  if (!primary) return;
  primary.totalDistanceM += distanceM;
  saveShoes(shoes);
}

export function getPrimaryShoe(): Shoe | null {
  return loadShoes().find((s) => s.isPrimary && s.status === "active") ?? null;
}

export function getShoeById(id: string | undefined | null): Shoe | null {
  if (!id) return null;
  return loadShoes().find((s) => s.id === id) ?? null;
}

export function addDistanceToShoe(id: string, distanceM: number) {
  if (!id || distanceM <= 0) return;
  const shoes = loadShoes();
  const shoe = shoes.find((s) => s.id === id);
  if (!shoe) return;
  shoe.totalDistanceM = Math.max(0, shoe.totalDistanceM + distanceM);
  saveShoes(shoes);
}

export function subtractDistanceFromShoe(id: string, distanceM: number) {
  if (!id || distanceM <= 0) return;
  const shoes = loadShoes();
  const shoe = shoes.find((s) => s.id === id);
  if (!shoe) return;
  shoe.totalDistanceM = Math.max(0, shoe.totalDistanceM - distanceM);
  saveShoes(shoes);
}

/** Move `distanceM` from one shoe to another. Either side may be null/undefined (no-op for that side). */
export function reassignRunDistance(
  fromId: string | undefined | null,
  toId: string | undefined | null,
  distanceM: number,
) {
  if (distanceM <= 0) return;
  if (fromId && toId && fromId === toId) return;
  if (fromId) subtractDistanceFromShoe(fromId, distanceM);
  if (toId) addDistanceToShoe(toId, distanceM);
}

export function shoeProgress(shoe: Shoe): number {
  if (shoe.maxDistanceM <= 0) return 0;
  return Math.min(1, shoe.totalDistanceM / shoe.maxDistanceM);
}
