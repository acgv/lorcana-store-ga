"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
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

  // Cargar productos desde API
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/products?status=approved`)
        const result = await response.json()
        
        console.log("🔍 API Response:", { success: result.success, dataLength: result.data?.length, error: result.error })
        
        if (result.success) {
          // Normalizar productos para que sean compatibles con el formato de cartas
          const normalizedProducts = (result.data || []).map((product: any) => ({
            id: product.id,
            name: product.name,
            image: product.image,
            price: product.price,
            foilPrice: null,
            normalStock: product.stock || 0,
            foilStock: 0,
            stock: product.stock || 0,
            set: product.metadata?.set || null,
            type: null,
            rarity: null,
            number: 0,
            cardNumber: null,
            productType: product.producttype || product.productType || "booster",
            description: product.description,
            metadata: product.metadata,
          }))
          setProducts(normalizedProducts)
          console.log(`✅ Productos cargados: ${normalizedProducts.length}`)
          if (normalizedProducts.length > 0) {
            console.log("📦 Productos:", normalizedProducts.map(p => `${p.name} - $${p.price}`))
          } else {
            console.warn("⚠️ No se cargaron productos. Verifica que haya productos con status='approved' en la BD")
          }
        } else {
          console.error("❌ Error en API products:", result.error)
          setProducts([])
        }
      } catch (error) {
        console.error("Error loading products:", error)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    
    loadProducts()
  }, [])

  // Actualizar URL cuando cambien los filtros
  useEffect(() => {
    const params = new URLSearchParams()
    
    if (filters.productType && filters.productType !== "all") params.set("productType", filters.productType)
    if (filters.set !== "all") params.set("set", filters.set)
    if (filters.minPrice !== 0) params.set("minPrice", filters.minPrice.toString())
    if (filters.maxPrice !== 1000000) params.set("maxPrice", filters.maxPrice.toString())
    if (filters.search) params.set("search", filters.search)
    if (sortBy !== "nameAZ") params.set("sortBy", sortBy)
    if (viewMode !== "grid") params.set("viewMode", viewMode)
    
    const queryString = params.toString()
    const newUrl = queryString ? `/products?${queryString}` : "/products"
    
    router.replace(newUrl, { scroll: false })
  }, [filters, sortBy, viewMode, router])

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
        if (!product.name.toLowerCase().includes(searchLower) && 
            !product.id.toLowerCase().includes(searchLower)) {
          return false
        }
      }
      
      return true
    })

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "nameAZ":
          return (a.name || "").localeCompare(b.name || "")
        case "nameZA":
          return (b.name || "").localeCompare(a.name || "")
        case "priceLowHigh":
          return (a.price || 0) - (b.price || 0)
        case "priceHighLow":
          return (b.price || 0) - (a.price || 0)
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

