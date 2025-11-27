"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CardGrid } from "@/components/card-grid"
import { CardFilters } from "@/components/card-filters"
import { mockCards } from "@/lib/mock-data"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SlidersHorizontal } from "lucide-react"

function CatalogContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [cards, setCards] = useState<any[]>([])
  const [allCards, setAllCards] = useState<any[]>([]) // Todas las cartas para filtrado
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  
  // Inicializar filtros desde URL
  const versionParam = searchParams.get("version") || "all"
  // Convertir "both" a "all" ya que esa opción ya no existe
  const validVersion = versionParam === "both" ? "all" : versionParam
  
  const [filters, setFilters] = useState({
    type: searchParams.get("type") || "all",
    set: searchParams.get("set") || "all",
    rarity: searchParams.get("rarity") || "all",
    minPrice: Number(searchParams.get("minPrice")) || 0,
    maxPrice: Number(searchParams.get("maxPrice")) || 100000, // Aumentado a $100,000 para incluir legendarias
    version: validVersion,
    search: searchParams.get("search") || "",
    productType: "card", // El catálogo solo muestra cartas
  })
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "cardNumberLowHigh")
  const [viewMode, setViewMode] = useState<"grid" | "list">((searchParams.get("viewMode") as "grid" | "list") || "grid")

  // Polyfill para requestIdleCallback (para compatibilidad con móviles)
  const requestIdleCallbackPolyfill = (callback: () => void, options?: { timeout?: number }) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      return (window as any).requestIdleCallback(callback, options)
    } else {
      // Fallback: ejecutar inmediatamente pero de forma asíncrona
      const timeout = options?.timeout || 0
      return setTimeout(callback, Math.max(timeout, 0))
    }
  }

  // Cargar cartas con caché y carga progresiva (no bloqueante)
  useEffect(() => {
    let isMounted = true
    let abortController: AbortController | null = null
    
    const loadCards = async () => {
      // Verificar caché primero
      const cacheKey = "lorcana_cards_cache"
      const cacheTimestamp = "lorcana_cards_cache_timestamp"
      const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos
      
      try {
        const cached = localStorage.getItem(cacheKey)
        const cachedTime = localStorage.getItem(cacheTimestamp)
        
        // Si hay caché válido (menos de 5 minutos), usarlo inmediatamente
        if (cached && cachedTime) {
          const age = Date.now() - parseInt(cachedTime)
          if (age < CACHE_DURATION) {
            const cachedCards = JSON.parse(cached)
            if (isMounted) {
              setAllCards(cachedCards)
              // Mostrar todas las cartas inmediatamente desde caché (ya están en memoria)
              setCards(cachedCards)
              setLoading(false)
              setInitialLoad(false)
              console.log(`✅ Cartas cargadas desde caché: ${cachedCards.length} cartas`)
            }
            return
          }
        }
        
        // Mostrar contenido inmediatamente si hay caché antiguo
        if (cached) {
          try {
            const cachedCards = JSON.parse(cached)
            if (isMounted) {
              setAllCards(cachedCards)
              setCards(cachedCards) // Mostrar todas las cartas del caché
              setLoading(false)
              setInitialLoad(false)
            }
          } catch (e) {
            // Si el caché está corrupto, continuar con la carga
          }
        } else {
          // Solo mostrar loading si no hay caché
          if (isMounted) {
            setLoading(true)
          }
        }
        
        // Crear AbortController para cancelar la petición si el componente se desmonta
        abortController = new AbortController()
        
        // Cargar desde API de forma asíncrona (no bloquea navegación)
        const response = await fetch(`/api/cards`, {
          signal: abortController.signal,
        })
        
        if (!isMounted) return // Si el componente se desmontó, no actualizar estado
        
        const result = await response.json()
        
        if (result.success) {
          // Filtrar solo cartas (productType = "card" o null)
          const allCardsData = (result.data || []).filter((card: any) => {
            const productType = card.productType || "card"
            return productType === "card"
          }).map((card: any) => ({
            ...card,
            productType: "card",
          }))
          
          if (isMounted) {
            setAllCards(allCardsData)
            
            // Mostrar todas las cartas inmediatamente (ya están cargadas)
            setCards(allCardsData)
            setLoading(false)
            setInitialLoad(false)
            
            // Guardar en caché
            localStorage.setItem(cacheKey, JSON.stringify(allCardsData))
            localStorage.setItem(cacheTimestamp, Date.now().toString())
            
            console.log(`✅ Cartas cargadas: ${allCardsData.length} desde ${result.meta?.source || "mock"}`)
          }
        } else {
          // Fallback a mock si API falla
          if (isMounted) {
            setAllCards(mockCards)
            setCards(mockCards.slice(0, 100))
            setLoading(false)
            setInitialLoad(false)
          }
        }
      } catch (error: any) {
        // Ignorar errores de abort (navegación cancelada)
        if (error.name === 'AbortError') {
          console.log('🔄 Carga cancelada por navegación')
          return
        }
        
        console.error("Error loading cards:", error)
        if (isMounted) {
          setAllCards(mockCards)
          setCards(mockCards) // Mostrar todas las cartas mock
          setLoading(false)
          setInitialLoad(false)
        }
      }
    }
    
    // Usar polyfill para cargar sin bloquear la UI
    const idleCallbackId = requestIdleCallbackPolyfill(loadCards, { timeout: 100 })
    
    // Cleanup: cancelar petición si el componente se desmonta
    return () => {
      isMounted = false
      if (abortController) {
        abortController.abort()
      }
      // Cancelar el idle callback si aún no se ejecutó
      if (typeof idleCallbackId === 'number') {
        clearTimeout(idleCallbackId)
      }
    }
  }, []) // Solo cargar una vez al montar
  
  // Actualizar URL cuando cambien los filtros (solo si estamos en la página del catálogo)
  useEffect(() => {
    // Verificar que estamos en la página correcta antes de actualizar la URL
    if (typeof window === 'undefined') return
    const currentPath = window.location.pathname
    if (!currentPath.includes('/lorcana-tcg/catalog')) return
    
    // Usar timeout para no bloquear la navegación
    const timeoutId = setTimeout(() => {
      // Verificar nuevamente que seguimos en la página (por si el usuario navegó)
      if (!window.location.pathname.includes('/lorcana-tcg/catalog')) return
      
      const params = new URLSearchParams()
      
      if (filters.type !== "all") params.set("type", filters.type)
      if (filters.set !== "all") params.set("set", filters.set)
      if (filters.rarity !== "all") params.set("rarity", filters.rarity)
      if (filters.minPrice !== 0) params.set("minPrice", filters.minPrice.toString())
      if (filters.maxPrice !== 100000) params.set("maxPrice", filters.maxPrice.toString())
      if (filters.version !== "all") params.set("version", filters.version)
      if (filters.search) params.set("search", filters.search)
      // productType no se incluye en URL porque el catálogo solo muestra cartas
      if (sortBy !== "cardNumberLowHigh") params.set("sortBy", sortBy)
      if (viewMode !== "grid") params.set("viewMode", viewMode)
      
      const queryString = params.toString()
      const newUrl = queryString ? `/lorcana-tcg/catalog?${queryString}` : "/lorcana-tcg/catalog"
      
      // Solo actualizar si la URL es diferente
      const currentUrl = window.location.pathname + window.location.search
      if (currentUrl !== newUrl) {
        router.replace(newUrl, { scroll: false })
      }
    }, 100) // Pequeño delay para no bloquear navegación
    
    return () => clearTimeout(timeoutId)
  }, [filters, sortBy, viewMode, router])

  // Contar stock disponible por rareza
  const rarityCounts = useMemo(() => {
    const counts = {
      common: 0,
      uncommon: 0,
      rare: 0,
      superRare: 0,
      legendary: 0,
    }
    
    cards.forEach((card) => {
      // Sumar stock normal y foil disponible
      const normalStock = (card.normalStock || card.stock || 0)
      const foilStock = (card.foilStock || 0)
      const totalStock = normalStock + foilStock
      
      if (card.rarity === "common") counts.common += totalStock
      else if (card.rarity === "uncommon") counts.uncommon += totalStock
      else if (card.rarity === "rare") counts.rare += totalStock
      else if (card.rarity === "superRare") counts.superRare += totalStock
      else if (card.rarity === "legendary" || card.rarity === "enchanted") counts.legendary += totalStock
    })
    
    return counts
  }, [cards])

  const filteredCards = useMemo(() => {
    if (cards.length === 0) {
      console.log("⚠️ No hay cartas cargadas")
      return []
    }
    
    const filtered = cards.filter((card) => {
      // Product Type filter
      if (filters.productType && filters.productType !== "all") {
        const productType = (card as any).productType || "card"
        if (productType !== filters.productType) return false
      }
      
      // Type filter (skip if "all" or empty, solo para cartas)
      if (filters.type && filters.type !== "all") {
        const productType = (card as any).productType || "card"
        if (productType === "card" && card.type !== filters.type) return false
      }
      
      // Set filter (skip if "all" or empty)
      if (filters.set && filters.set !== "all") {
        const productType = (card as any).productType || "card"
        // Para productos, verificar en metadata.set
        if (productType !== "card") {
          const productSet = (card as any).metadata?.set || card.set
          if (productSet !== filters.set) return false
        } else {
          if (card.set !== filters.set) return false
        }
      }
      
      // Rarity filter (skip if "all" or empty, solo para cartas)
      if (filters.rarity && filters.rarity !== "all") {
        const productType = (card as any).productType || "card"
        // Los productos no tienen rarity, así que si es un producto, no aplicar este filtro
        if (productType === "card" && card.rarity !== filters.rarity) return false
      }
      
      // Price range filter (manejar null/undefined)
      const cardPrice = Number(card.price) || 0
      // Filtrar por precio solo si está dentro del rango
      if (cardPrice < filters.minPrice || cardPrice > filters.maxPrice) return false
      
      // Version filter (Normal/Foil availability)
      if (filters.version && filters.version !== "all") {
        const hasNormalStock = (card.normalStock || card.stock || 0) > 0
        // Verificar stock foil: solo si tiene foilStock > 0 (no solo precio)
        const foilStock = Number(card.foilStock) || 0
        const hasFoilStock = foilStock > 0
        
        if (filters.version === "normal" && !hasNormalStock) return false
        if (filters.version === "foil" && !hasFoilStock) return false
      }
      
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (!card.name.toLowerCase().includes(searchLower) && !card.number.toString().includes(searchLower)) {
          return false
        }
      }
      return true
    })

    // Debug: Log información del filtro foil
    if (filters.version === "foil") {
      const foilCards = filtered.filter(card => {
        const foilStock = Number(card.foilStock) || 0
        return foilStock > 0
      })
      console.log(`🔍 Filtro "Solo Foil" activo: ${foilCards.length} cartas con foilStock > 0 de ${filtered.length} cartas filtradas`)
    }

    // Sort - Prioriza cartas con stock
    filtered.sort((a, b) => {
      // Calcular si tiene stock (normal o foil)
      const aHasStock = ((a as any).normalStock || 0) + ((a as any).foilStock || 0) > 0
      const bHasStock = ((b as any).normalStock || 0) + ((b as any).foilStock || 0) > 0
      
      // Si una tiene stock y la otra no, priorizar la que tiene stock
      if (aHasStock && !bHasStock) return -1
      if (!aHasStock && bHasStock) return 1
      
      // Si ambas tienen o no tienen stock, aplicar criterio secundario
      switch (sortBy) {
        case "nameAZ":
          return a.name.localeCompare(b.name)
        case "nameZA":
          return b.name.localeCompare(a.name)
        case "priceLowHigh":
          return a.price - b.price
        case "priceHighLow":
          return b.price - a.price
        case "raritySort":
          const rarityOrder = ["common", "uncommon", "rare", "superRare", "legendary", "enchanted"]
          return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity)
        case "cardNumberLowHigh":
          return (Number(a.number) || 0) - (Number(b.number) || 0)
        case "cardNumberHighLow":
          return (Number(b.number) || 0) - (Number(a.number) || 0)
        default:
          return 0
      }
    })

    console.log(`🔍 Filtros aplicados: ${cards.length} → ${filtered.length} cartas`)
    return filtered
  }, [cards, filters, sortBy])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-4 md:py-8">
        {/* Header con título */}
        <div className="mb-4 md:mb-6">
          <h1 className="font-display text-4xl md:text-5xl lg:text-7xl font-black text-balance tracking-tight leading-none">
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Catálogo de Cartas Lorcana
            </span>
          </h1>
        </div>
        
        {/* Sección Tipos de Cartas */}
        <section className="mb-8">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">Tipos de Cartas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-card border rounded-lg">
              <h3 className="font-semibold mb-2">Comunes</h3>
              <p className="text-sm text-muted-foreground">
                {rarityCounts.common} {rarityCounts.common === 1 ? "unidad disponible" : "unidades disponibles"}
              </p>
            </div>
            <div className="p-4 bg-card border rounded-lg">
              <h3 className="font-semibold mb-2">Raras</h3>
              <p className="text-sm text-muted-foreground">
                {rarityCounts.rare} {rarityCounts.rare === 1 ? "unidad disponible" : "unidades disponibles"}
              </p>
            </div>
            <div className="p-4 bg-card border rounded-lg">
              <h3 className="font-semibold mb-2">Super Raras</h3>
              <p className="text-sm text-muted-foreground">
                {rarityCounts.superRare} {rarityCounts.superRare === 1 ? "unidad disponible" : "unidades disponibles"}
              </p>
            </div>
            <div className="p-4 bg-card border rounded-lg">
              <h3 className="font-semibold mb-2">Luminares / Legendarias</h3>
              <p className="text-sm text-muted-foreground">
                {rarityCounts.legendary} {rarityCounts.legendary === 1 ? "unidad disponible" : "unidades disponibles"}
              </p>
            </div>
          </div>
        </section>
        
        {/* Sección Accesorios - Removida, ahora está en /products */}

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Filtros Desktop (ocultos en mobile) */}
          <aside className="hidden lg:block lg:w-64 flex-shrink-0 overflow-hidden">
            <CardFilters
              filters={{
                ...filters,
                productType: "card", // Forzar a "card" ya que el catálogo solo muestra cartas
              }}
              setFilters={setFilters}
              sortBy={sortBy}
              setSortBy={setSortBy}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />
          </aside>

          {/* Contenido principal */}
          <div className="flex-1 min-w-0">
            {/* Barra de acciones mobile */}
            <div className="flex items-center justify-between mb-4 lg:hidden">
              <div className="text-sm text-muted-foreground">
                {!loading && `${filteredCards.length} ${filteredCards.length === 1 ? "card" : "cards"}`}
              </div>
              
              {/* Botón de filtros mobile */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" aria-label={t("openFilters") || "Abrir filtros"}>
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    {t("filters") || "Filters"}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full sm:w-80 overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>{t("filtersAndSort")}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <CardFilters
                      filters={{
                        ...filters,
                        productType: "card", // Forzar a "card" ya que el catálogo solo muestra cartas
                      }}
                      setFilters={setFilters}
                      sortBy={sortBy}
                      setSortBy={setSortBy}
                      viewMode={viewMode}
                      setViewMode={setViewMode}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                {t("loadingCards")}
              </div>
            ) : (
              <>
                {/* Contador desktop */}
                <div className="hidden lg:block mb-4">
                  <div className="text-sm text-muted-foreground">
                    {filteredCards.length} {filteredCards.length === 1 ? t("cardFound") : t("cardsFound")} {t("foundText")}
                  </div>
                </div>
                <CardGrid cards={filteredCards} viewMode={viewMode} />
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function CatalogPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-4 md:py-8">
          <div className="mb-4 md:mb-6">
            <h1 className="font-display text-4xl md:text-5xl lg:text-7xl font-black text-balance tracking-tight leading-none">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Catalog
              </span>
            </h1>
          </div>
          <div className="text-center py-12 text-muted-foreground">
            Loading...
          </div>
        </main>
        <Footer />
      </div>
    }>
      <CatalogContent />
    </Suspense>
  )
}
