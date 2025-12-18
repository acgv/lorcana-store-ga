// Tipos y modelos de datos para el ecosistema Lorcana

export type CardStatus = "pending" | "approved" | "rejected"
export type CardVersion = "normal" | "foil"
export type CardRarity = "common" | "uncommon" | "rare" | "superRare" | "legendary" | "enchanted"
export type CardType = "character" | "action" | "item" | "location" | "song"
export type CardLanguage = "en" | "fr" | "de" | "es"

// Tipos de productos
export type ProductType = "card" | "booster" | "playmat" | "sleeves" | "deckbox" | "dice" | "accessory" | "giftset"

// Producto base - campos comunes a todos los productos
export interface BaseProduct {
  id: string
  name: string
  image: string
  price: number
  description?: string
  stock?: number
  status?: CardStatus
  productType: ProductType
  createdAt?: string
  updatedAt?: string
  submittedBy?: string
  approvedBy?: string
  rejectionReason?: string
}

// Carta individual (extiende BaseProduct)
export interface Card extends BaseProduct {
  productType: "card"
  set: string
  rarity: CardRarity
  type: CardType
  number: number
  inkCost?: number
  inkable?: boolean
  lore?: number
  strength?: number
  willpower?: number
  classifications?: string
  foilPrice: number
  // Campos adicionales para el ecosistema completo
  cardNumber?: string // "101/204"
  version?: CardVersion
  language?: CardLanguage
  condition?: string
  normalStock?: number
  foilStock?: number
  isPromotional?: boolean // Flag para identificar cartas promocionales
}

// Booster Pack
export interface Booster extends BaseProduct {
  productType: "booster"
  set: string // Set al que pertenece el booster
  cardsPerPack?: number // Número de cartas por booster (típicamente 12)
}

// Play Mat
export interface PlayMat extends BaseProduct {
  productType: "playmat"
  design?: string // Descripción del diseño
  material?: string // Material del playmat
  size?: string // Tamaño (ej: "24x14 inches")
}

// Sleeves (Funda para cartas)
export interface Sleeves extends BaseProduct {
  productType: "sleeves"
  count?: number // Número de fundas en el paquete (típicamente 50, 60, 100)
  size?: string // Tamaño (ej: "Standard", "Japanese")
}

// Deck Box
export interface DeckBox extends BaseProduct {
  productType: "deckbox"
  capacity?: number // Número de cartas que puede contener
  material?: string // Material del deckbox
}

// Dice Set
export interface Dice extends BaseProduct {
  productType: "dice"
  count?: number // Número de dados en el set
  color?: string // Color de los dados
}

// Otros accesorios
export interface Accessory extends BaseProduct {
  productType: "accessory"
  category?: string // Categoría del accesorio
}

// Union type para todos los productos
export type Product = Card | Booster | PlayMat | Sleeves | DeckBox | Dice | Accessory

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

