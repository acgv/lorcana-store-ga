/**
 * Fuente única de los sets de Lorcana.
 * Los valores (value) coinciden con el Set_ID de la API (lowercase).
 * Para agregar un set nuevo: agregar UNA línea aquí + traducción en language-provider.
 */

export interface LorcanaSet {
  /** Set_ID de la API en minúsculas (ej: "tfc", "rof", "win") */
  value: string
  /** Número del set (1, 2, 3…) */
  num: number
  /** Nombre para mostrar en español */
  label: string
  /** Clave de traducción en language-provider.tsx */
  tKey: string
}

export const LORCANA_SETS: LorcanaSet[] = [
  { value: "tfc", num: 1,  label: "El Primer Capítulo",      tKey: "firstChapter" },
  { value: "rof", num: 2,  label: "Ascenso de los Floodborn", tKey: "riseOfFloodborn" },
  { value: "ink", num: 3,  label: "Hacia las Inklands",       tKey: "intoInklands" },
  { value: "urs", num: 4,  label: "El Regreso de Úrsula",     tKey: "ursulaReturn" },
  { value: "ssk", num: 5,  label: "Cielos Brillantes",        tKey: "shimmering" },
  { value: "azs", num: 6,  label: "Mar Azurita",              tKey: "azurite" },
  { value: "ari", num: 7,  label: "Isla de Archazia",         tKey: "archazia" },
  { value: "roj", num: 8,  label: "Reinado de Jafar",         tKey: "reignOfJafar" },
  { value: "fab", num: 9,  label: "Fabled",                   tKey: "fabled" },
  { value: "whi", num: 10, label: "Susurros en el Pozo",      tKey: "whispersInTheWell" },
  { value: "win", num: 11, label: "Winterspell",              tKey: "winterspell" },
]

/** Mapa de set key → metadata (para búsqueda rápida) */
export const SET_MAP: Map<string, LorcanaSet> = new Map(
  LORCANA_SETS.map((s) => [s.value, s])
)

/** Label numerado en español, ej: "1. El Primer Capítulo" */
export function getSetLabel(setKey: string): string {
  const meta = SET_MAP.get(setKey)
  return meta ? `${meta.num}. ${meta.label}` : setKey
}

/** Label numerado traducido (para frontend con i18n) */
export function getSetLabelI18n(setKey: string, t: (key: string) => string): string {
  const meta = SET_MAP.get(setKey)
  return meta ? `${meta.num}. ${t(meta.tKey)}` : setKey
}

/** Número del set para ordenar (99 si no se reconoce) */
export function getSetNum(setKey: string): number {
  return SET_MAP.get(setKey)?.num ?? 99
}

/** Info del set para órdenes y pagos */
export function getSetInfo(setKey: string | null | undefined): { setNumber: number; displayName: string } | null {
  if (!setKey) return null
  const meta = SET_MAP.get(setKey)
  if (!meta) return null
  return { setNumber: meta.num, displayName: meta.label }
}
