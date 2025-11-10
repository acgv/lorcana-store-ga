// ============================================
// CONFIGURACIÓN DE ENVÍOS - GA COMPANY
// ============================================

export interface ShippingZone {
  id: string
  name: string
  nameES: string
  cost: number
  estimatedDays: number
  regions: string[]
}

export interface ShippingMethod {
  id: string
  name: string
  nameES: string
  cost: number
  description: string
  descriptionES: string
}

// ============================================
// MÉTODOS DE ENVÍO
// ============================================

export const SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: "pickup",
    name: "Pickup at Metro Militares",
    nameES: "Retiro en Metro Militares",
    cost: 0,
    description: "Tuesday to Friday",
    descriptionES: "Martes a Viernes",
  },
  {
    id: "shipping",
    name: "Home Delivery",
    nameES: "Envío a Domicilio",
    cost: 0, // Se calcula según zona
    description: "3 business days",
    descriptionES: "3 días hábiles",
  },
]

// ============================================
// ZONAS DE ENVÍO (Para método "shipping")
// ============================================

export const SHIPPING_ZONES: ShippingZone[] = [
  {
    id: "rm",
    name: "Metropolitan Region",
    nameES: "Región Metropolitana (RM)",
    cost: 2500,
    estimatedDays: 3,
    regions: ["RM", "Región Metropolitana", "Santiago"],
  },
  {
    id: "zone2",
    name: "Regions V, VI, VIII",
    nameES: "Regiones V, VI, VIII",
    cost: 3000,
    estimatedDays: 3,
    regions: ["V", "VI", "VIII", "Valparaíso", "O'Higgins", "Biobío"],
  },
  {
    id: "zone3",
    name: "Rest of Chile",
    nameES: "Resto de Chile",
    cost: 4000,
    estimatedDays: 3,
    regions: [
      "I", "II", "III", "IV", "VII", "IX", "X", "XI", "XII", "XIV", "XV", "XVI",
      "Arica", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo",
      "Maule", "Araucanía", "Los Ríos", "Los Lagos", "Aysén", "Magallanes",
    ],
  },
]

// ============================================
// CONFIGURACIÓN GENERAL
// ============================================

export const SHIPPING_CONFIG = {
  // Envío gratis sobre este monto (CLP)
  freeShippingThreshold: 15000,
  
  // Dirección de retiro
  pickupLocation: {
    name: "Metro Militares",
    address: "Estación Metro Militares, Línea 2",
    commune: "Las Condes",
    city: "Santiago",
    region: "Región Metropolitana",
    scheduleES: "Martes a Viernes, 10:00 - 20:00",
    scheduleEN: "Tuesday to Friday, 10:00 AM - 8:00 PM",
    instructions: "Coordinaremos contigo el día y hora exacta por WhatsApp.",
  },
  
  // Política de envíos
  policyES: `
    - Envío gratis en compras sobre $15,000
    - Despachos realizados en 3 días hábiles
    - Garantizamos la llegada de tu pedido
    - Si no llega en 10 días hábiles, reembolso completo
    - Retiros coordinados vía WhatsApp: +56 9 5183 0357
  `,
  policyEN: `
    - Free shipping on orders over $15,000
    - Shipping within 3 business days
    - We guarantee delivery of your order
    - Full refund if not delivered within 10 business days
    - Pickup coordinated via WhatsApp: +56 9 5183 0357
  `,
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calcula el costo de envío basado en zona y total de compra
 */
export function calculateShippingCost(
  method: string,
  zoneId: string | null,
  cartTotal: number
): number {
  // Retiro en tienda = GRATIS
  if (method === "pickup") {
    return 0
  }

  // Envío gratis sobre threshold
  if (cartTotal >= SHIPPING_CONFIG.freeShippingThreshold) {
    return 0
  }

  // Buscar zona y retornar costo
  const zone = SHIPPING_ZONES.find((z) => z.id === zoneId)
  return zone?.cost || 0
}

/**
 * Obtiene zona basada en región seleccionada
 */
export function getZoneByRegion(region: string): ShippingZone | null {
  return (
    SHIPPING_ZONES.find((zone) =>
      zone.regions.some((r) => 
        r.toLowerCase() === region.toLowerCase()
      )
    ) || null
  )
}

/**
 * Verifica si el envío es gratis
 */
export function isFreeShipping(cartTotal: number): boolean {
  return cartTotal >= SHIPPING_CONFIG.freeShippingThreshold
}

