# 📊 Guía de Analytics y Tracking

Este documento explica cómo usar el sistema de analytics para trackear el comportamiento de los usuarios, con énfasis especial en **inicio de sesión** y **funcionalidades de colección**.

## 🎯 Objetivos del Tracking

1. **Medir conversión de usuarios**: Cuántos usuarios inician sesión vs. visitantes anónimos
2. **Entender uso de funcionalidades**: Qué secciones se usan más, especialmente la colección
3. **Identificar puntos de fricción**: Dónde los usuarios abandonan o tienen problemas
4. **Optimizar experiencia**: Datos para mejorar la UX y aumentar conversiones

## 🚀 Uso Básico

### 1. Usar el Hook `useAnalytics`

```tsx
"use client"

import { useAnalytics } from "@/hooks/use-analytics"

export function MyComponent() {
  const { track, trackSection, isAuthenticated } = useAnalytics()

  // Trackear un evento simple
  const handleClick = () => {
    track('card_view', {
      cardId: 'ari-1',
      cardName: 'Ariel - Spectacular Singer',
    })
  }

  // Trackear una sección
  useEffect(() => {
    trackSection('catalog', {
      filterType: 'rarity',
      filterValue: 'legendary',
    })
  }, [])

  return <button onClick={handleClick}>Ver Carta</button>
}
```

### 2. Tracking Directo (sin hook)

```tsx
import { trackEvent, trackLoginSuccess, trackCollectionCardAdd } from "@/lib/analytics"

// Trackear evento simple
trackEvent('cart_add', {
  cardId: 'ari-1',
  price: 10.99,
  version: 'normal',
})

// Trackear login exitoso
trackLoginSuccess(userId, 'google')

// Trackear agregar carta a colección
trackCollectionCardAdd(userId, cardId, cardName, collectionSize)
```

## 🔐 Tracking de Autenticación (CRÍTICO)

### Ejemplo: Página de Login

```tsx
"use client"

import { useState } from "react"
import { useAnalytics } from "@/hooks/use-analytics"
import { trackLoginAttempt, trackLoginSuccess, trackLoginFailed } from "@/lib/analytics"
import { supabase } from "@/lib/db"

export function LoginPage() {
  const { track } = useAnalytics()
  const [email, setEmail] = useState("")

  const handleLogin = async (method: "email" | "google") => {
    // 1. Trackear intento de login
    trackLoginAttempt(method)

    try {
      if (method === "google") {
        // Login con Google
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
        })
        if (error) throw error
      } else {
        // Login con email
        const { error } = await supabase.auth.signInWithOtp({
          email,
        })
        if (error) throw error
      }

      // 2. Trackear éxito (esto se puede hacer en un listener de auth)
      // Ver ejemplo más abajo
    } catch (error) {
      // 3. Trackear fallo
      trackLoginFailed(
        error instanceof Error ? error.message : "Unknown error",
        method
      )
    }
  }

  // Escuchar cambios de autenticación
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        // Trackear login exitoso
        trackLoginSuccess(session.user.id, "google") // o "email"
        
        // Trackear que ahora puede acceder a funcionalidades
        track('login_success', {
          userId: session.user.id,
          loginMethod: 'google',
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div>
      <button onClick={() => handleLogin("google")}>
        Iniciar sesión con Google
      </button>
    </div>
  )
}
```

## 📚 Tracking de Colección

### Ejemplo: Agregar Carta a Colección

```tsx
"use client"

import { useAnalytics } from "@/hooks/use-analytics"
import { trackCollectionCardAdd, trackFeatureBlocked } from "@/lib/analytics"

export function CardItem({ card }) {
  const { track, isAuthenticated, user } = useAnalytics()

  const handleAddToCollection = async () => {
    // Verificar si está autenticado
    if (!isAuthenticated || !user) {
      // Trackear bloqueo de funcionalidad
      trackFeatureBlocked("collection_add", "/login")
      
      // Redirigir a login
      router.push("/login?redirect=/catalog")
      return
    }

    try {
      // Agregar a colección (tu lógica aquí)
      await addCardToCollection(user.id, card.id)
      
      // Trackear éxito
      trackCollectionCardAdd(
        user.id,
        card.id,
        card.name,
        collectionSize + 1
      )
    } catch (error) {
      track('error_occurred', {
        errorType: 'collection_add_failed',
        errorMessage: error.message,
      })
    }
  }

  return (
    <button onClick={handleAddToCollection}>
      Agregar a Colección
    </button>
  )
}
```

### Ejemplo: Ver Colección

```tsx
"use client"

import { useEffect } from "react"
import { useAnalytics } from "@/hooks/use-analytics"
import { trackCollectionView, trackFeatureBlocked } from "@/lib/analytics"

export function CollectionPage() {
  const { track, isAuthenticated, user } = useAnalytics()
  const [collection, setCollection] = useState([])

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Trackear intento de acceso sin autenticación
      trackFeatureBlocked("collection_view", "/login")
      router.push("/login")
      return
    }

    // Cargar colección
    loadCollection(user.id).then((cards) => {
      setCollection(cards)
      
      // Trackear vista de colección
      trackCollectionView(user.id, cards.length)
    })
  }, [isAuthenticated, user])

  return <div>Mi Colección ({collection.length} cartas)</div>
}
```

## 🛒 Tracking de Carrito y Compras

### Ejemplo: Agregar al Carrito

```tsx
"use client"

import { useAnalytics } from "@/hooks/use-analytics"
import { trackCartAdd } from "@/lib/analytics"

export function AddToCartButton({ card, version = "normal" }) {
  const { track, isAuthenticated } = useAnalytics()

  const handleAddToCart = () => {
    // Tu lógica de agregar al carrito
    addToCart(card, version)
    
    // Trackear
    trackCartAdd(
      card.id,
      card.name,
      version === "foil" ? card.foilPrice : card.price,
      version,
      isAuthenticated
    )
  }

  return <button onClick={handleAddToCart}>Agregar al Carrito</button>
}
```

### Ejemplo: Checkout

```tsx
"use client"

import { useAnalytics } from "@/hooks/use-analytics"
import { trackCheckoutStart, trackCheckoutComplete } from "@/lib/analytics"

export function CheckoutPage() {
  const { track, user } = useAnalytics()
  const [cart] = useCart()
  
  const cartValue = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  useEffect(() => {
    // Trackear inicio de checkout
    trackCheckoutStart(cartValue, cartItems, !!user)
  }, [])

  const handleComplete = async (orderId: string) => {
    // Procesar orden
    await processOrder(orderId)
    
    // Trackear completación
    trackCheckoutComplete(orderId, cartValue, cartItems, user.id)
  }

  return <div>Checkout</div>
}
```

## 📍 Tracking de Navegación

### Ejemplo: Tracking Automático de Secciones

```tsx
"use client"

import { useEffect } from "react"
import { useAnalytics } from "@/hooks/use-analytics"

export function CatalogPage() {
  const { trackSection } = useAnalytics()

  useEffect(() => {
    // Trackear que el usuario está en la sección de catálogo
    trackSection('catalog')
  }, [])

  return <div>Catálogo</div>
}
```

## 🔍 Tracking de Búsqueda y Filtros

```tsx
"use client"

import { useAnalytics } from "@/hooks/use-analytics"
import { trackSearch, trackFilterApplied } from "@/lib/analytics"

export function SearchBar() {
  const { track } = useAnalytics()

  const handleSearch = (query: string) => {
    trackSearch(query, results.length)
  }

  const handleFilter = (type: string, value: string) => {
    trackFilterApplied(type, value)
  }

  return (
    <div>
      <input onChange={(e) => handleSearch(e.target.value)} />
      <select onChange={(e) => handleFilter('rarity', e.target.value)}>
        {/* opciones */}
      </select>
    </div>
  )
}
```

## 📊 Eventos Disponibles

### Autenticación
- `login_attempt` - Intento de login
- `login_success` - Login exitoso
- `login_failed` - Login fallido
- `logout` - Cierre de sesión
- `signup_attempt` - Intento de registro
- `signup_success` - Registro exitoso
- `signup_failed` - Registro fallido

### Colección (requiere login)
- `collection_view` - Ver colección
- `collection_card_add` - Agregar carta
- `collection_card_remove` - Remover carta
- `collection_export` - Exportar colección
- `collection_share` - Compartir colección
- `collection_feature_blocked` - Bloqueo por falta de login

### Carrito y Compras
- `cart_add` - Agregar al carrito
- `cart_remove` - Remover del carrito
- `cart_view` - Ver carrito
- `checkout_start` - Iniciar checkout
- `checkout_complete` - Completar compra
- `checkout_abandoned` - Abandonar checkout

### Navegación
- `page_view` - Vista de página (automático)
- `section_view` - Vista de sección
- `navigation` - Navegación entre páginas

### Productos
- `card_view` - Ver carta
- `card_filter` - Filtrar cartas
- `card_search` - Buscar cartas
- `product_view` - Ver producto

## 🎯 Métricas Clave a Medir

1. **Tasa de Conversión de Login**
   - `login_attempt` / `login_success`
   - Usuarios que intentan vs. usuarios que completan login

2. **Uso de Colección**
   - `collection_view` - Cuántos usuarios ven su colección
   - `collection_card_add` - Cuántas cartas se agregan
   - `collection_feature_blocked` - Cuántos intentan usar sin login

3. **Funnel de Compra**
   - `card_view` → `cart_add` → `checkout_start` → `checkout_complete`
   - Identificar dónde se pierden usuarios

4. **Secciones Más Visitadas**
   - `section_view` por sección
   - Entender qué contenido es más popular

## 📈 Ver Datos en Vercel Analytics

1. Ve a tu dashboard de Vercel
2. Selecciona tu proyecto
3. Ve a la pestaña "Analytics"
4. Verás todos los eventos trackeados con `track()`

Los eventos aparecerán con sus propiedades, permitiéndote:
- Filtrar por tipo de evento
- Ver tendencias temporales
- Analizar conversiones
- Identificar problemas

## 🔧 Mejores Prácticas

1. **Siempre trackear bloqueos**: Cuando un usuario intenta usar una funcionalidad que requiere login, trackear `feature_blocked_no_auth`

2. **Trackear errores**: Usar `trackError()` para entender qué falla

3. **No trackear información sensible**: No incluir emails, passwords, o datos personales sensibles

4. **Usar propiedades consistentes**: Mantener los mismos nombres de propiedades entre eventos similares

5. **Trackear tanto éxito como fallo**: Entender qué funciona y qué no

## 🚨 Ejemplo Completo: Página de Catálogo con Tracking

```tsx
"use client"

import { useEffect, useState } from "react"
import { useAnalytics } from "@/hooks/use-analytics"
import { trackCardView, trackFilterApplied, trackSearch } from "@/lib/analytics"

export function CatalogPage() {
  const { track, trackSection, isAuthenticated } = useAnalytics()
  const [cards, setCards] = useState([])
  const [filters, setFilters] = useState({})

  // Trackear sección
  useEffect(() => {
    trackSection('catalog', {
      isAuthenticated,
    })
  }, [isAuthenticated])

  // Trackear filtros
  const handleFilter = (type: string, value: string) => {
    setFilters({ ...filters, [type]: value })
    trackFilterApplied(type, value)
  }

  // Trackear búsqueda
  const handleSearch = (query: string) => {
    trackSearch(query, cards.length)
  }

  // Trackear vista de carta
  const handleCardClick = (card) => {
    trackCardView(card.id, card.name, card.set, card.rarity)
  }

  return (
    <div>
      {/* Filtros y búsqueda */}
      <SearchBar onSearch={handleSearch} />
      <Filters onFilter={handleFilter} />
      
      {/* Lista de cartas */}
      {cards.map((card) => (
        <CardItem
          key={card.id}
          card={card}
          onClick={() => handleCardClick(card)}
        />
      ))}
    </div>
  )
}
```

---

**¿Preguntas?** Revisa el código en `lib/analytics.ts` para ver todas las funciones disponibles.

