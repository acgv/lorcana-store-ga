/**
 * Sistema de Analytics y Tracking
 * 
 * Este módulo proporciona funciones para trackear eventos importantes en la aplicación,
 * con énfasis especial en:
 * - Inicio de sesión y conversión de usuarios
 * - Uso de funcionalidades de colección
 * - Navegación entre secciones
 * - Acciones de compra
 */

import { track } from "@vercel/analytics"

// Tipos de eventos que podemos trackear
export type AnalyticsEvent =
  // Navegación y páginas
  | "page_view"
  | "section_view"
  | "navigation"
  
  // Autenticación (CRÍTICO para medir conversión)
  | "login_attempt"
  | "login_success"
  | "login_failed"
  | "logout"
  | "signup_attempt"
  | "signup_success"
  | "signup_failed"
  
  // Funcionalidades de colección (requieren login)
  | "collection_view"
  | "collection_card_add"
  | "collection_card_remove"
  | "collection_export"
  | "collection_share"
  | "collection_feature_blocked" // Cuando intentan usar colección sin login
  
  // Catálogo y productos
  | "card_view"
  | "card_filter"
  | "card_search"
  | "product_view"
  
  // Carrito y compras
  | "cart_add"
  | "cart_remove"
  | "cart_view"
  | "checkout_start"
  | "checkout_complete"
  | "checkout_abandoned"
  
  // Interacciones
  | "filter_applied"
  | "sort_applied"
  | "view_mode_changed"
  | "language_changed"
  
  // Errores y bloqueos
  | "feature_blocked_no_auth"
  | "error_occurred"

export interface AnalyticsProperties {
  // Información del usuario
  userId?: string
  isAuthenticated?: boolean
  userRole?: string
  
  // Información de la página/sección
  page?: string
  section?: string
  previousPage?: string
  
  // Información del producto/carta
  cardId?: string
  cardName?: string
  cardSet?: string
  cardRarity?: string
  productType?: string
  
  // Información de colección
  collectionSize?: number
  collectionAction?: "add" | "remove" | "view" | "export"
  
  // Información de carrito
  cartValue?: number
  cartItems?: number
  
  // Información de búsqueda/filtros
  searchQuery?: string
  filterType?: string
  filterValue?: string
  
  // Información de error
  errorType?: string
  errorMessage?: string
  
  // Información adicional
  [key: string]: string | number | boolean | undefined
}

/**
 * Trackea un evento de analytics
 * 
 * @param event - Tipo de evento a trackear
 * @param properties - Propiedades adicionales del evento
 * 
 * Nota: Funciona tanto en cliente como servidor.
 * En servidor, solo loguea el evento (Vercel Analytics es del lado del cliente).
 */
export function trackEvent(event: AnalyticsEvent, properties?: AnalyticsProperties) {
  try {
    // Preparar propiedades para Vercel Analytics
    const analyticsProps: Record<string, string | number | boolean> = {}
    
    if (properties) {
      Object.entries(properties).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Convertir a string para Vercel Analytics (solo acepta strings, numbers, booleans)
          analyticsProps[key] = typeof value === "object" ? JSON.stringify(value) : value
        }
      })
    }
    
    // Solo trackear con Vercel Analytics si estamos en el cliente
    if (typeof window !== "undefined") {
      track(event, analyticsProps)
    } else {
      // En servidor, loguear el evento (Vercel Analytics no funciona en servidor)
      console.log(`📊 [Server] Analytics Event: ${event}`, analyticsProps)
    }
    
    // También loguear en consola para desarrollo
    if (process.env.NODE_ENV === "development") {
      console.log(`📊 Analytics Event: ${event}`, analyticsProps)
    }
  } catch (error) {
    // No fallar si analytics falla
    console.warn("Failed to track analytics event:", error)
  }
}

/**
 * Trackea una vista de página
 */
export function trackPageView(page: string, properties?: Omit<AnalyticsProperties, "page">) {
  trackEvent("page_view", {
    page,
    ...properties,
  })
}

/**
 * Trackea una vista de sección
 */
export function trackSectionView(section: string, properties?: Omit<AnalyticsProperties, "section">) {
  trackEvent("section_view", {
    section,
    ...properties,
  })
}

/**
 * Trackea un intento de inicio de sesión
 */
export function trackLoginAttempt(method: "email" | "google" | "other" = "email") {
  trackEvent("login_attempt", {
    loginMethod: method,
  })
}

/**
 * Trackea un inicio de sesión exitoso
 */
export function trackLoginSuccess(userId: string, method: "email" | "google" | "other" = "email") {
  trackEvent("login_success", {
    userId,
    loginMethod: method,
    isAuthenticated: true,
  })
}

/**
 * Trackea un inicio de sesión fallido
 */
export function trackLoginFailed(reason: string, method: "email" | "google" | "other" = "email") {
  trackEvent("login_failed", {
    loginMethod: method,
    errorMessage: reason,
  })
}

/**
 * Trackea cuando un usuario intenta usar una funcionalidad que requiere login
 */
export function trackFeatureBlocked(feature: string, redirectTo?: string) {
  trackEvent("feature_blocked_no_auth", {
    feature,
    redirectTo,
    isAuthenticated: false,
  })
}

/**
 * Trackea cuando un usuario ve su colección
 */
export function trackCollectionView(userId: string, collectionSize: number) {
  trackEvent("collection_view", {
    userId,
    collectionSize,
    isAuthenticated: true,
  })
}

/**
 * Trackea cuando un usuario agrega una carta a su colección
 */
export function trackCollectionCardAdd(
  userId: string,
  cardId: string,
  cardName: string,
  collectionSize: number
) {
  trackEvent("collection_card_add", {
    userId,
    cardId,
    cardName,
    collectionSize,
    collectionAction: "add",
    isAuthenticated: true,
  })
}

/**
 * Trackea cuando un usuario remueve una carta de su colección
 */
export function trackCollectionCardRemove(
  userId: string,
  cardId: string,
  cardName: string,
  collectionSize: number
) {
  trackEvent("collection_card_remove", {
    userId,
    cardId,
    cardName,
    collectionSize,
    collectionAction: "remove",
    isAuthenticated: true,
  })
}

/**
 * Trackea cuando un usuario agrega un producto al carrito
 */
export function trackCartAdd(
  cardId: string,
  cardName: string,
  price: number,
  version: "normal" | "foil" = "normal",
  isAuthenticated: boolean = false
) {
  trackEvent("cart_add", {
    cardId,
    cardName,
    price,
    version,
    isAuthenticated,
  })
}

/**
 * Trackea cuando un usuario inicia el checkout
 */
export function trackCheckoutStart(cartValue: number, cartItems: number, isAuthenticated: boolean) {
  trackEvent("checkout_start", {
    cartValue,
    cartItems,
    isAuthenticated,
  })
}

/**
 * Trackea cuando un usuario completa una compra
 */
export function trackCheckoutComplete(
  orderId: string,
  cartValue: number,
  cartItems: number,
  userId: string
) {
  trackEvent("checkout_complete", {
    orderId,
    cartValue,
    cartItems,
    userId,
    isAuthenticated: true,
  })
}

/**
 * Trackea cuando un usuario abandona el checkout
 */
export function trackCheckoutAbandoned(cartValue: number, cartItems: number, step: string) {
  trackEvent("checkout_abandoned", {
    cartValue,
    cartItems,
    checkoutStep: step,
  })
}

/**
 * Trackea cuando un usuario aplica un filtro
 */
export function trackFilterApplied(filterType: string, filterValue: string) {
  trackEvent("filter_applied", {
    filterType,
    filterValue,
  })
}

/**
 * Trackea cuando un usuario busca algo
 */
export function trackSearch(searchQuery: string, resultsCount?: number) {
  trackEvent("card_search", {
    searchQuery,
    resultsCount,
  })
}

/**
 * Trackea cuando un usuario ve una carta
 */
export function trackCardView(cardId: string, cardName: string, cardSet?: string, cardRarity?: string) {
  trackEvent("card_view", {
    cardId,
    cardName,
    cardSet,
    cardRarity,
  })
}

/**
 * Trackea cuando ocurre un error
 */
export function trackError(errorType: string, errorMessage: string, page?: string) {
  trackEvent("error_occurred", {
    errorType,
    errorMessage,
    page,
  })
}

