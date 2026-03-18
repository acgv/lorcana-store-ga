export type LorcanaSetSlug =
  | "firstChapter"
  | "riseOfFloodborn"
  | "intoInklands"
  | "ursulaReturn"
  | "shimmering"
  | "azurite"
  | "archazia"
  | "reignOfJafar"
  | "fabled"
  | "whi"

export interface LorcanaSetInfo {
  slug: LorcanaSetSlug | string
  setNumber: number | null
  displayName: string
}

const SET_INFO: Record<string, LorcanaSetInfo> = {
  firstChapter: { slug: "firstChapter", setNumber: 1, displayName: "The First Chapter" },
  riseOfFloodborn: { slug: "riseOfFloodborn", setNumber: 2, displayName: "Rise of the Floodborn" },
  intoInklands: { slug: "intoInklands", setNumber: 3, displayName: "Into the Inklands" },
  ursulaReturn: { slug: "ursulaReturn", setNumber: 4, displayName: "Ursula's Return" },
  shimmering: { slug: "shimmering", setNumber: 5, displayName: "Shimmering Skies" },
  azurite: { slug: "azurite", setNumber: 6, displayName: "Azurite Sea" },
  archazia: { slug: "archazia", setNumber: 7, displayName: "Archazia's Island" },
  reignOfJafar: { slug: "reignOfJafar", setNumber: 8, displayName: "Reign of Jafar" },
  fabled: { slug: "fabled", setNumber: 9, displayName: "Fabled" },
  whi: { slug: "whi", setNumber: null, displayName: "Whispers in the Well" },
}

export function getSetInfo(setSlug: string | null | undefined): LorcanaSetInfo | null {
  if (!setSlug) return null
  return SET_INFO[setSlug] || null
}

