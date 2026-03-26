export type BadgeRarity = "common" | "rare" | "epic" | "legendary"

export type PlayerGameStats = {
  totalGames: number
  wins: number
  winRate: number
  bestWinStreak: number
  inkedCards: number
  dailyCorrect: number
  weeklyCompleted: boolean
  xp: number
  level: number
}

export type BadgeDefinition = {
  id: string
  name: string
  description: string
  rarity: BadgeRarity
  image: string
  unlock: (stats: PlayerGameStats) => boolean
}

export const LORCANA_BADGES: BadgeDefinition[] = [
  {
    id: "first-spark-ga",
    name: "Primer Destello GA",
    description: "Juega tu primera partida.",
    rarity: "common",
    image: "/badges/first-spark-ga.svg",
    unlock: (s) => s.totalGames >= 1,
  },
  {
    id: "ink-apprentice-ga",
    name: "Aprendiz de Tinta",
    description: "Entinta 50 cartas en total.",
    rarity: "common",
    image: "/badges/ink-apprentice-ga.svg",
    unlock: (s) => s.inkedCards >= 50,
  },
  {
    id: "lore-hunter-ga",
    name: "Cazador de Lore",
    description: "Gana 10 partidas vs CPU.",
    rarity: "rare",
    image: "/badges/lore-hunter-ga.svg",
    unlock: (s) => s.wins >= 10,
  },
  {
    id: "enchanted-streak-ga",
    name: "Racha Encantada",
    description: "Logra una racha de 3 victorias seguidas.",
    rarity: "epic",
    image: "/badges/enchanted-streak-ga.svg",
    unlock: (s) => s.bestWinStreak >= 3,
  },
  {
    id: "daily-strategist-ga",
    name: "Estratega Diario",
    description: "Acierta 5 desafíos diarios.",
    rarity: "rare",
    image: "/badges/daily-strategist-ga.svg",
    unlock: (s) => s.dailyCorrect >= 5,
  },
  {
    id: "realm-legend-ga",
    name: "Leyenda del Reino",
    description: "Alcanza nivel 10.",
    rarity: "legendary",
    image: "/badges/realm-legend-ga.svg",
    unlock: (s) => s.level >= 10,
  },
  {
    id: "weekly-champion-ga",
    name: "Campeón Semanal",
    description: "Completa 3/3 metas del evento semanal.",
    rarity: "epic",
    image: "/badges/weekly-champion-ga.svg",
    unlock: (s) => s.weeklyCompleted,
  },
]

export function computeXp(stats: Omit<PlayerGameStats, "xp" | "level">): { xp: number; level: number } {
  const weeklyBonusXp = stats.weeklyCompleted ? 120 : 0
  const xp =
    stats.totalGames * 5 +
    stats.wins * 25 +
    stats.dailyCorrect * 15 +
    stats.bestWinStreak * 10 +
    weeklyBonusXp
  const level = Math.max(1, Math.floor(xp / 100) + 1)
  return { xp, level }
}

export function evaluateBadges(stats: PlayerGameStats) {
  return LORCANA_BADGES.map((b) => ({
    ...b,
    unlocked: b.unlock(stats),
  }))
}
