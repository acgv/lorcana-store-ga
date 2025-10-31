"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CardGrid } from "@/components/card-grid"
import { CardFilters } from "@/components/card-filters"
import { mockCards } from "@/lib/mock-data"
import { useLanguage } from "@/components/language-provider"

export default function CatalogPage() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Inicializar filtros desde URL
  const [filters, setFilters] = useState({
    type: searchParams.get("type") || "all",
    set: searchParams.get("set") || "all",
    rarity: searchParams.get("rarity") || "all",
    minPrice: Number(searchParams.get("minPrice")) || 0,
    maxPrice: Number(searchParams.get("maxPrice")) || 100,
    version: searchParams.get("version") || "all",
    search: searchParams.get("search") || "",
  })
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "nameAZ")
  const [viewMode, setViewMode] = useState<"grid" | "list">((searchParams.get("viewMode") as "grid" | "list") || "grid")
  
  // Actualizar URL cuando cambien los filtros
  useEffect(() => {
    const params = new URLSearchParams()
    
    if (filters.type !== "all") params.set("type", filters.type)
    if (filters.set !== "all") params.set("set", filters.set)
    if (filters.rarity !== "all") params.set("rarity", filters.rarity)
    if (filters.minPrice !== 0) params.set("minPrice", filters.minPrice.toString())
    if (filters.maxPrice !== 100) params.set("maxPrice", filters.maxPrice.toString())
    if (filters.version !== "all") params.set("version", filters.version)
    if (filters.search) params.set("search", filters.search)
    if (sortBy !== "nameAZ") params.set("sortBy", sortBy)
    if (viewMode !== "grid") params.set("viewMode", viewMode)
    
    const queryString = params.toString()
    const newUrl = queryString ? `/catalog?${queryString}` : "/catalog"
    
    router.replace(newUrl, { scroll: false })
  }, [filters, sortBy, viewMode, router])

  const filteredCards = useMemo(() => {
    const filtered = mockCards.filter((card) => {
      // Type filter (skip if "all" or empty)
      if (filters.type && filters.type !== "all" && card.type !== filters.type) return false
      
      // Set filter (skip if "all" or empty)
      if (filters.set && filters.set !== "all" && card.set !== filters.set) return false
      
      // Rarity filter (skip if "all" or empty)
      if (filters.rarity && filters.rarity !== "all" && card.rarity !== filters.rarity) return false
      
      // Price range filter
      if (card.price < filters.minPrice || card.price > filters.maxPrice) return false
      
      // Version filter (Normal/Foil availability)
      if (filters.version && filters.version !== "all") {
        const hasNormalStock = (card.stock || 0) > 0
        const hasFoilStock = card.foilPrice && card.foilPrice > 0
        
        if (filters.version === "normal" && !hasNormalStock) return false
        if (filters.version === "foil" && !hasFoilStock) return false
        if (filters.version === "both" && (!hasNormalStock || !hasFoilStock)) return false
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

    // Sort
    filtered.sort((a, b) => {
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
          return a.number - b.number
        case "cardNumberHighLow":
          return b.number - a.number
        default:
          return 0
      }
    })

    return filtered
  }, [filters, sortBy])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="font-display text-5xl md:text-7xl font-black mb-10 text-balance tracking-tight leading-none">
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            {t("catalog")}
          </span>
        </h1>
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 flex-shrink-0">
            <CardFilters
              filters={filters}
              setFilters={setFilters}
              sortBy={sortBy}
              setSortBy={setSortBy}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />
          </aside>
          <div className="flex-1">
            <div className="mb-4 space-y-3">
              <div className="text-sm text-muted-foreground">
                {filteredCards.length} {filteredCards.length === 1 ? "card" : "cards"} found
              </div>
              
              {/* 🔍 DEBUG INFO - VISIBLE */}
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/30 space-y-2">
                <div className="text-xs font-bold text-accent uppercase">🔍 Debug Info</div>
                <div className="font-mono text-xs space-y-1">
                  <div>📊 Total Cards: <span className="text-primary font-bold">{filteredCards.length}</span></div>
                  {filteredCards.length > 0 && (
                    <>
                      <div>🔢 Card Numbers: <span className="text-accent">{filteredCards[0]?.number}</span> → <span className="text-accent">{filteredCards[filteredCards.length - 1]?.number}</span></div>
                      <div>🎯 Set Filter: <span className="text-secondary font-bold">{filters.set}</span></div>
                      <div>🔄 Sort: <span className="text-secondary font-bold">{sortBy}</span></div>
                      <div>🎨 Type: <span className="text-muted-foreground">{filters.type}</span></div>
                      <div>⭐ Rarity: <span className="text-muted-foreground">{filters.rarity}</span></div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <CardGrid cards={filteredCards} viewMode={viewMode} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
