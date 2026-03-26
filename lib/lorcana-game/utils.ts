/** Baraja Fisher–Yates; opcionalmente determinista para tests. */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Generador LCG simple para tests reproducibles. */
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function newInstanceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `i_${Math.random().toString(36).slice(2)}_${Date.now()}`
}

export function clampInkCost(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.floor(n))
}
