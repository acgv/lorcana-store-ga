// Tipos y modelos de datos para el ecosistema Lorcana

export type CardStatus = "pending" | "approved" | "rejected"
export type CardVersion = "normal" | "foil"
export type CardRarity = "common" | "uncommon" | "rare" | "superRare" | "legendary" | "enchanted"
export type CardType = "character" | "action" | "item" | "location" | "song"
export type CardLanguage = "en" | "fr" | "de" | "es"

export interface Card {
  id: string
  name: string
  image: string
  set: string
  rarity: CardRarity
  type: CardType
  number: number
  price: number
  foilPrice: number
  description: string
  // Campos adicionales para el ecosistema completo
  cardNumber?: string // "101/204"
  version?: CardVersion
  language?: CardLanguage
  condition?: string
  stock?: number
  normalStock?: number
  foilStock?: number
  status?: CardStatus
  createdAt?: string
  updatedAt?: string
  submittedBy?: string
  approvedBy?: string
  rejectionReason?: string
}

export interface CardSubmission {
  id: string
  card: Partial<Card>
  status: CardStatus
  submittedBy: string
  submittedAt: string
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  images: string[] // URLs de imágenes capturadas
  metadata: {
    source: "mobile" | "admin" | "manual"
    deviceInfo?: string
    ocrConfidence?: number
  }
}

export interface User {
  id: string
  email: string
  role: "admin" | "user" | "contributor"
  name?: string
  createdAt: string
}

export interface ActivityLog {
  id: string
  userId: string
  action: string
  entityType: "card" | "submission" | "user"
  entityId: string
  timestamp: string
  details?: Record<string, any>
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

