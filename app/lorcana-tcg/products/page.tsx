"use client"

import React, { useState, useMemo, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CardGrid } from "@/components/card-grid"
import { CardFilters } from "@/components/card-filters"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SlidersHorizontal } from "lucide-react"

function ProductsContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  
  const [filters, setFilters] = useState({
    productType: searchParams.get("productType") || "all",
    set: searchParams.get("set") || "all",
    minPrice: Number(searchParams.get("minPrice")) || 0,
    maxPrice: Number(searchParams.get("maxPrice")) || 1000000, // Aumentado para incluir productos caros como booster displays
    search: searchParams.get("search") || "",
    type: "all", // No usado en productos pero necesario para CardFilters
    rarity: "all", // No usado en productos pero necesario para CardFilters
    version: "all", // No usado en productos pero necesario para CardFilters
    // Forzar productType a no ser "card" para ocultar filtros de cartas
    _hideCardFilters: true, // Flag interno para ocultar filtros de cartas
  })
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "nameAZ")
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

  // Cargar productos con caché y carga progresiva (no bloqueante)
  useEffect(() => {
    let isMounted = true
    let abortController: AbortController | null = null
    
    const loadProducts = async () => {
      // Verificar caché primero
      const cacheKey = "lorcana_products_cache"
      const cacheTimestamp = "lorcana_products_cache_timestamp"
      const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos
      
      try {
        const cached = localStorage.getItem(cacheKey)
        const cachedTime = localStorage.getItem(cacheTimestamp)
        
        // Si hay caché válido (menos de 5 minutos), usarlo inmediatamente
        if (cached && cachedTime) {
          const age = Date.now() - parseInt(cachedTime)
          if (age < CACHE_DURATION) {
            const cachedProducts = JSON.parse(cached)
            if (isMounted) {
              setProducts(cachedProducts)
              setLoading(false)
              setInitialLoad(false)
              console.log(`✅ Productos cargados desde caché: ${cachedProducts.length} productos`)
            }
            return
          }
        }
        
        // Mostrar contenido inmediatamente si hay caché antiguo
        if (cached) {
          try {
            const cachedProducts = JSON.parse(cached)
            if (isMounted) {
              setProducts(cachedProducts)
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
        const response = await fetch(`/api/products?status=approved`, {
          signal: abortController.signal,
          cache: 'no-store',
        })
        
        if (!isMounted) return // Si el componente se desmontó, no actualizar estado
        
        const result = await response.json()
        
        console.log("🔍 API Response:", { success: result.success, dataLength: result.data?.length, error: result.error })
        
        if (result.success) {
          // Normalizar productos para que sean compatibles con el formato de cartas
          const normalizedProducts = (result.data || [])
            .filter((product: any) => product && product.name && product.name.trim() !== "") // Filtrar productos sin nombre válido
            .map((product: any) => {
              // Asegurar que el nombre siempre sea un string válido
              const productName = String(product.name || "").trim()
              if (!productName) {
                console.warn(`⚠️ Producto sin nombre válido:`, product)
                return null
              }
              
              return {
                id: product.id,
                name: productName,
                image: product.image || "",
                price: Number(product.price) || 0,
                foilPrice: null,
                normalStock: Number(product.stock) || 0,
                foilStock: 0,
                stock: Number(product.stock) || 0,
                set: product.metadata?.set || null,
                type: null,
                rarity: null,
                number: 0,
                cardNumber: null,
                productType: product.producttype || product.productType || "booster",
                description: product.description || "",
                metadata: product.metadata || {},
              }
            })
            .filter((product: any) => product !== null) // Filtrar productos nulos
          
          if (isMounted) {
            setProducts(normalizedProducts)
            setLoading(false)
            setInitialLoad(false)
            
            // Guardar en caché
            localStorage.setItem(cacheKey, JSON.stringify(normalizedProducts))
            localStorage.setItem(cacheTimestamp, Date.now().toString())
            
            console.log(`✅ Productos cargados: ${normalizedProducts.length}`)
            if (normalizedProducts.length > 0) {
              console.log("📦 Productos:", normalizedProducts.map(p => `${p.name} - $${p.price}`))
            } else {
              console.warn("⚠️ No se cargaron productos. Verifica que haya productos con status='approved' en la BD")
            }
          }
        } else {
          console.error("❌ Error en API products:", result.error)
          if (isMounted) {
            setProducts([])
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
        
        console.error("Error loading products:", error)
        if (isMounted) {
          setProducts([])
          setLoading(false)
          setInitialLoad(false)
        }
      }
    }
    
    // Usar polyfill para cargar sin bloquear la UI
    const idleCallbackId = requestIdleCallbackPolyfill(loadProducts, { timeout: 100 })
    
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

  // Ref para almacenar el timeout y poder cancelarlo
  const urlUpdateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  
  // Sincronizar filtros con la URL cuando cambie (por ejemplo, cuando se busca desde el header)
  useEffect(() => {
    const searchParam = searchParams.get("search") || ""
    if (searchParam !== filters.search) {
      setFilters(prev => ({ ...prev, search: searchParam }))
    }
  }, [searchParams, filters.search])
  
  // Actualizar URL cuando cambien los filtros (solo si estamos en la página de productos)
  // Usar debounce largo para no interferir con la navegación
  useEffect(() => {
    // Cancelar cualquier actualización pendiente
    if (urlUpdateTimeoutRef.current) {
      clearTimeout(urlUpdateTimeoutRef.current)
      urlUpdateTimeoutRef.current = null
    }
    
    // Verificar que estamos en la página correcta antes de actualizar la URL
    if (typeof window === 'undefined') return
    const currentPath = window.location.pathname
    if (!currentPath.includes('/lorcana-tcg/products')) return
    
    // Usar debounce largo (800ms) para dar tiempo a la navegación
    urlUpdateTimeoutRef.current = setTimeout(() => {
      urlUpdateTimeoutRef.current = null
      
      // Verificar nuevamente que seguimos en la página (por si el usuario navegó)
      if (!window.location.pathname.includes('/lorcana-tcg/products')) return
      
      const params = new URLSearchParams()
      
      if (filters.productType && filters.productType !== "all") params.set("productType", filters.productType)
      if (filters.set !== "all") params.set("set", filters.set)
      if (filters.minPrice !== 0) params.set("minPrice", filters.minPrice.toString())
      if (filters.maxPrice !== 1000000) params.set("maxPrice", filters.maxPrice.toString())
      if (filters.search) params.set("search", filters.search)
      if (sortBy !== "nameAZ") params.set("sortBy", sortBy)
      if (viewMode !== "grid") params.set("viewMode", viewMode)
      
      const queryString = params.toString()
      const newUrl = queryString ? `/lorcana-tcg/products?${queryString}` : "/lorcana-tcg/products"
      
      // Solo actualizar si la URL es diferente y seguimos en la página
      const currentUrl = window.location.pathname + window.location.search
      if (currentUrl !== newUrl && window.location.pathname.includes('/lorcana-tcg/products')) {
        router.replace(newUrl, { scroll: false })
      }
    }, 800) // Debounce largo para no bloquear navegación
    
    return () => {
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current)
        urlUpdateTimeoutRef.current = null
      }
    }
  }, [filters, sortBy, viewMode, router])
  
  // Cancelar actualizaciones de URL cuando el usuario navega
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href]')
      if (link && link.getAttribute('href')?.startsWith('/lorcana-tcg/') && 
          !link.getAttribute('href')?.includes('/lorcana-tcg/products')) {
        // El usuario está navegando a otra página, cancelar actualizaciones de URL
        if (urlUpdateTimeoutRef.current) {
          clearTimeout(urlUpdateTimeoutRef.current)
          urlUpdateTimeoutRef.current = null
        }
      }
    }
    
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  const filteredProducts = useMemo(() => {
    if (products.length === 0) {
      return []
    }
    
    const filtered = products.filter((product) => {
      // Product Type filter
      if (filters.productType && filters.productType !== "all") {
        const productType = (product as any).productType || "booster"
        if (productType !== filters.productType) return false
      }
      
      // Set filter
      if (filters.set && filters.set !== "all") {
        const productSet = (product as any).metadata?.set || product.set
        if (productSet !== filters.set) return false
      }
      
      // Price range filter
      const productPrice = Number(product.price) || 0
      if (productPrice < filters.minPrice || productPrice > filters.maxPrice) return false
      
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const productName = (product.name || "").toLowerCase()
        const productId = (product.id || "").toLowerCase()
        if (!productName.includes(searchLower) && !productId.includes(searchLower)) {
          return false
        }
      }
      
      return true
    })

    // Sort - Asegurar que todos los productos tengan nombre válido
    filtered.sort((a, b) => {
      const nameA = String(a.name || "")
      const nameB = String(b.name || "")
      const priceA = Number(a.price) || 0
      const priceB = Number(b.price) || 0
      
      switch (sortBy) {
        case "nameAZ":
          return nameA.localeCompare(nameB)
        case "nameZA":
          return nameB.localeCompare(nameA)
        case "priceLowHigh":
          return priceA - priceB
        case "priceHighLow":
          return priceB - priceA
        default:
          return 0
      }
    })
    
    return filtered
  }, [products, filters, sortBy])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-4 md:py-8">
        {/* Header con título */}
        <div className="mb-4 md:mb-6">
          <h1 className="font-display text-4xl md:text-5xl lg:text-7xl font-black text-balance tracking-tight leading-none">
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Productos Lorcana
            </span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Boosters, Play Mats, Fundas, Deck Boxes y más
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Filtros Desktop */}
          <aside className="hidden lg:block lg:w-64 flex-shrink-0">
            <CardFilters
              filters={filters}
              setFilters={setFilters}
              sortBy={sortBy}
              setSortBy={setSortBy}
              viewMode={viewMode}
              setViewMode={setViewMode}
              hideCardOption={true}
            />
          </aside>

          {/* Contenido principal */}
          <div className="flex-1">
            {/* Filtros Mobile */}
            <div className="lg:hidden mb-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    {t("filters")}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[400px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>{t("filters")}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <CardFilters
                      filters={filters}
                      setFilters={setFilters}
                      sortBy={sortBy}
                      setSortBy={setSortBy}
                      viewMode={viewMode}
                      setViewMode={setViewMode}
                      hideCardOption={true}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Resultados */}
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t("loading")}</p>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-muted-foreground">
                  {filteredProducts.length} {filteredProducts.length === 1 ? "producto encontrado" : "productos encontrados"}
                </div>
                <CardGrid cards={filteredProducts} viewMode={viewMode} />
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductsContent />
    </Suspense>
  )
}

