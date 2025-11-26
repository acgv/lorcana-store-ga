"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CardFilters } from "@/components/card-filters"
import { useLanguage } from "@/components/language-provider"
import { useUser } from "@/hooks/use-user"
import { useCollection } from "@/hooks/use-collection"
import { useCart } from "@/components/cart-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SlidersHorizontal } from "lucide-react"
import { 
  Loader2, Lock, Package, Heart, Trash2, ExternalLink, 
  TrendingUp, Plus, Minus, Check, List, Sparkles, ShoppingCart, AlertCircle
} from "lucide-react"
import type { Card as CardType } from "@/lib/types"

interface CollectionItem {
  id: string
  card_id: string
  status: "owned" | "wanted"
  version: "normal" | "foil"
  quantity: number
  added_at: string
  card?: CardType
}

function MyCollectionContent() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: userLoading } = useUser()
  const { collection, isInCollection, addToCollection, removeFromCollection, refresh } = useCollection()
  const { addToCart } = useCart()
  const { toast } = useToast()
  
  const [allCards, setAllCards] = useState<CardType[]>([])
  const [loadingCards, setLoadingCards] = useState(true)
  
  // Leer tab y filtros desde URL o usar defaults
  const tabFromUrl = searchParams.get("tab") as "all" | "owned" | "missing" | null
  const [activeTab, setActiveTab] = useState<"all" | "owned" | "missing">(tabFromUrl || "all")
  const [filters, setFilters] = useState({
    type: searchParams.get("type") || "all",
    set: searchParams.get("set") || "all",
    rarity: searchParams.get("rarity") || "all",
    minPrice: Number(searchParams.get("minPrice")) || 0,
    maxPrice: Number(searchParams.get("maxPrice")) || 100000, // Aumentado para incluir cartas legendarias (30000) y enchanted (50000)
    version: searchParams.get("version") || "all",
    search: searchParams.get("search") || "",
    productType: searchParams.get("productType") || "all",
  })
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "cardNumberLowHigh")
  const [viewMode, setViewMode] = useState<"grid" | "list">((searchParams.get("viewMode") as "grid" | "list") || "grid")

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/lorcana-tcg/login?redirect=/lorcana-tcg/my-collection")
    }
  }, [user, userLoading, router])

  // Actualizar URL cuando cambien los filtros, tab, sortBy o viewMode
  useEffect(() => {
    const params = new URLSearchParams()
    
    // Agregar tab a la URL
    if (activeTab !== "all") params.set("tab", activeTab)
    
    // Si el tab es "wanted", redirigir a "missing"
    if (activeTab === "wanted") {
      setActiveTab("missing")
      return
    }
    
    // Agregar filtros a la URL
    if (filters.type !== "all") params.set("type", filters.type)
    if (filters.set !== "all") params.set("set", filters.set)
    if (filters.rarity !== "all") params.set("rarity", filters.rarity)
    if (filters.minPrice !== 0) params.set("minPrice", filters.minPrice.toString())
    if (filters.maxPrice !== 100000) params.set("maxPrice", filters.maxPrice.toString())
    if (filters.version !== "all") params.set("version", filters.version)
    if (filters.search) params.set("search", filters.search)
    if (filters.productType && filters.productType !== "all") params.set("productType", filters.productType)
    if (sortBy !== "cardNumberLowHigh") params.set("sortBy", sortBy)
    if (viewMode !== "grid") params.set("viewMode", viewMode)
    
    const queryString = params.toString()
    const newUrl = queryString ? `/lorcana-tcg/my-collection?${queryString}` : "/lorcana-tcg/my-collection"
    
    router.replace(newUrl, { scroll: false })
  }, [activeTab, filters, sortBy, viewMode, router])

  // Load all cards
  useEffect(() => {
    if (user) {
      loadAllCards()
    }
  }, [user])

  const loadAllCards = async () => {
    try {
      setLoadingCards(true)
      console.log("🔍 Fetching cards from /api/cards...")
      const response = await fetch("/api/cards")
      const data = await response.json()
      
      console.log("📦 API Response:", data)
      console.log("📊 Cards loaded:", data.data?.length || 0)
      
      if (data.success) {
        setAllCards(data.data || [])
      } else {
        console.error("❌ API returned success:false", data)
      }
    } catch (error) {
      console.error("❌ Error loading cards:", error)
      toast({
        variant: "destructive",
        title: t("error"),
        description: "Failed to load cards",
      })
    } finally {
      setLoadingCards(false)
    }
  }

  // Get collection items with card data
  const getCollectionWithCards = (status: "owned" | "wanted"): CollectionItem[] => {
    return collection
      .filter((item) => item.status === status)
      .map((item) => ({
        ...item,
        card: allCards.find((c) => c.id === item.card_id),
      }))
      .filter((item) => item.card) // Only include if card found
  }

  const ownedItems = getCollectionWithCards("owned")
  const wantedItems = getCollectionWithCards("wanted")

  // Agrupar owned items por card_id para mostrar una sola carta con sus versiones
  const groupedOwnedItems = ownedItems.reduce((acc, item) => {
    if (!item.card) return acc
    
    const existing = acc.find(g => g.card.id === item.card_id)
    if (existing) {
      // Agregar versión al grupo existente
      if (item.version === "normal") {
        existing.hasNormal = true
        existing.normalQuantity = item.quantity
      } else {
        existing.hasFoil = true
        existing.foilQuantity = item.quantity
      }
    } else {
      // Crear nuevo grupo
      acc.push({
        card: item.card,
        hasNormal: item.version === "normal",
        hasFoil: item.version === "foil",
        normalQuantity: item.version === "normal" ? item.quantity : 0,
        foilQuantity: item.version === "foil" ? item.quantity : 0,
      })
    }
    return acc
  }, [] as Array<{
    card: CardType
    hasNormal: boolean
    hasFoil: boolean
    normalQuantity: number
    foilQuantity: number
  }>)

  // Filter owned items (agrupados)
  const filteredOwnedItems = groupedOwnedItems.filter((group) => {
    const card = group.card
    
    // Product Type filter
    if (filters.productType && filters.productType !== "all") {
      const productType = (card as any).productType || "card"
      if (productType !== filters.productType) return false
    }
    
    // Type filter (solo para cartas)
    if (filters.type && filters.type !== "all") {
      const productType = (card as any).productType || "card"
      if (productType === "card" && card.type !== filters.type) return false
    }
    
    // Set filter
    if (filters.set && filters.set !== "all" && card.set !== filters.set) return false
    
    // Rarity filter
    if (filters.rarity && filters.rarity !== "all" && card.rarity !== filters.rarity) return false
    
    // Price range filter
    const cardPrice = card.price || 0
    if (cardPrice < filters.minPrice || cardPrice > filters.maxPrice) return false
    
    // Version filter - mostrar si tiene la versión filtrada
    if (filters.version && filters.version !== "all") {
      if (filters.version === "normal" && !group.hasNormal) return false
      if (filters.version === "foil" && !group.hasFoil) return false
    }
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      if (!card.name.toLowerCase().includes(searchLower) && 
          !card.id.toLowerCase().includes(searchLower)) {
        return false
      }
    }
    
    return true
  })

  // Filter wanted items
  const filteredWantedItems = wantedItems.filter((item) => {
    if (!item.card) return false
    
    // Type filter
    if (filters.type && filters.type !== "all" && item.card.type !== filters.type) return false
    
    // Set filter
    if (filters.set && filters.set !== "all" && item.card.set !== filters.set) return false
    
    // Rarity filter
    if (filters.rarity && filters.rarity !== "all" && item.card.rarity !== filters.rarity) return false
    
    // Price range filter
    const cardPrice = item.card.price || 0
    if (cardPrice < filters.minPrice || cardPrice > filters.maxPrice) return false
    
    // Version filter
    if (filters.version && filters.version !== "all" && item.version !== filters.version) return false
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      if (!item.card.name.toLowerCase().includes(searchLower) && 
          !item.card.id.toLowerCase().includes(searchLower)) {
        return false
      }
    }
    
    return true
  })

  // Calcular cartas faltantes: todas las cartas con información de qué versión falta y disponibilidad
  const missingCards = allCards.map((card) => {
    const hasNormalOwned = collection.some(
      (item) => item.card_id === card.id && item.status === "owned" && item.version === "normal"
    )
    const hasFoilOwned = collection.some(
      (item) => item.card_id === card.id && item.status === "owned" && item.version === "foil"
    )
    
    // Determinar qué versiones faltan
    const missingNormal = !hasNormalOwned
    const missingFoil = !hasFoilOwned
    
    // Verificar disponibilidad en stock
    const normalStock = card.normalStock || card.stock || 0
    const foilStock = card.foilStock || 0
    const hasNormalStock = normalStock > 0
    const hasFoilStock = foilStock > 0
    
    // Determinar qué versiones faltantes están disponibles
    const missingNormalAvailable = missingNormal && hasNormalStock
    const missingFoilAvailable = missingFoil && hasFoilStock
    
    return {
      card,
      missingNormal,
      missingFoil,
      missingNormalAvailable,
      missingFoilAvailable,
      // Una carta está "faltante" si le falta al menos una versión
      isMissing: missingNormal || missingFoil
    }
  }).filter(item => item.isMissing) // Solo mostrar cartas que faltan

  // Identificar cartas deseadas que están en stock (usando los items filtrados)
  const wantedItemsInStock = filteredWantedItems.filter((item) => {
    if (!item.card) return false
    const normalStock = item.card.normalStock || item.card.stock || 0
    const foilStock = item.card.foilStock || 0
    
    if (item.version === "normal") {
      return normalStock > 0
    } else {
      return foilStock > 0
    }
  })

  // Calculate stats
  const totalOwned = ownedItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalOwnedCards = groupedOwnedItems.length // Cartas únicas (agrupadas)
  const totalMissing = missingCards.length
  // Contar cuántas cartas faltantes están disponibles en stock
  const missingAvailable = missingCards.filter(item => 
    item.missingNormalAvailable || item.missingFoilAvailable
  ).length
  const collectionValue = ownedItems.reduce((sum, item) => {
    const price = item.version === "foil" 
      ? (item.card?.foilPrice || 0) 
      : (item.card?.price || 0)
    return sum + (price * item.quantity)
  }, 0)

  // Función para agregar carta deseada al carrito
  const handleAddWantedToCart = (item: CollectionItem) => {
    if (!item.card) return

    const normalStock = item.card.normalStock || item.card.stock || 0
    const foilStock = item.card.foilStock || 0
    const hasStock = item.version === "normal" ? normalStock > 0 : foilStock > 0

    if (!hasStock) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("outOfStock") || "Esta carta no está disponible en stock",
      })
      return
    }

    addToCart({
      id: item.card.id,
      name: item.card.name,
      price: item.version === "foil" ? (item.card.foilPrice || 0) : (item.card.price || 0),
      image: item.card.image,
      version: item.version,
    })

    toast({
      title: t("success"),
      description: `${item.card.name} (${item.version === "foil" ? t("foil") : t("normal")}) ${t("addedToCart") || "agregada al carrito"}`,
    })
  }

  // Función para agregar todas las cartas deseadas disponibles al carrito
  const handleAddAllAvailableToCart = () => {
    let addedCount = 0
    wantedItemsInStock.forEach((item) => {
      if (item.card) {
        addToCart({
          id: item.card.id,
          name: item.card.name,
          price: item.version === "foil" ? (item.card.foilPrice || 0) : (item.card.price || 0),
          image: item.card.image,
          version: item.version,
        })
        addedCount++
      }
    })

    if (addedCount > 0) {
      toast({
        title: t("success"),
        description: `${addedCount} ${addedCount === 1 ? t("cardFound") : t("cardsFound")} ${t("addedToCart") || "agregadas al carrito"}`,
      })
    }
  }

  // Filter cards for "Missing Cards" tab
  const filteredMissingCards = missingCards.filter((item) => {
    const card = item.card
    // Type filter
    if (filters.type && filters.type !== "all" && card.type !== filters.type) return false
    
    // Set filter
    if (filters.set && filters.set !== "all" && card.set !== filters.set) return false
    
    // Rarity filter
    if (filters.rarity && filters.rarity !== "all" && card.rarity !== filters.rarity) return false
    
    // Price range filter
    const cardPrice = card.price || 0
    if (cardPrice < filters.minPrice || cardPrice > filters.maxPrice) return false
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      if (!card.name.toLowerCase().includes(searchLower) && 
          !card.id.toLowerCase().includes(searchLower)) {
        return false
      }
    }
    
    return true
  })

  // Filter cards for "All Cards" tab
  // NOTE: NO filtramos por stock/version porque esto es para crear colección personal
  // Los usuarios deben ver TODAS las cartas disponibles, no solo las en stock
  const filteredAllCards = allCards.filter((card) => {
    // Product Type filter
    if (filters.productType && filters.productType !== "all") {
      const productType = (card as any).productType || "card"
      if (productType !== filters.productType) return false
    }
    
    // Type filter (solo para cartas)
    if (filters.type && filters.type !== "all") {
      const productType = (card as any).productType || "card"
      if (productType === "card" && card.type !== filters.type) return false
    }
    
    // Set filter
    if (filters.set && filters.set !== "all" && card.set !== filters.set) return false
    
    // Rarity filter
    if (filters.rarity && filters.rarity !== "all" && card.rarity !== filters.rarity) return false
    
    // Price range filter (opcional, por si quieren filtrar por precio de referencia)
    const cardPrice = card.price || 0
    if (cardPrice < filters.minPrice || cardPrice > filters.maxPrice) return false
    
    // ❌ NO APLICAMOS filtro de version/stock - mostramos todas las cartas
    // Esto es para colección personal, no para comprar
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      if (!card.name.toLowerCase().includes(searchLower) && 
          !card.id.toLowerCase().includes(searchLower)) {
        return false
      }
    }
    
    return true
  })

  // Sort filtered missing cards
  const sortedMissingCards = [...filteredMissingCards].sort((a, b) => {
    switch (sortBy) {
      case "nameAZ":
        return a.name.localeCompare(b.name)
      case "nameZA":
        return b.name.localeCompare(a.name)
      case "priceLowHigh":
        return (a.price || 0) - (b.price || 0)
      case "priceHighLow":
        return (b.price || 0) - (a.price || 0)
      case "rarityHighLow":
        const rarityOrder = { "Legendary": 5, "Super Rare": 4, "Rare": 3, "Uncommon": 2, "Common": 1 }
        return (rarityOrder[b.rarity as keyof typeof rarityOrder] || 0) - 
               (rarityOrder[a.rarity as keyof typeof rarityOrder] || 0)
      case "rarityLowHigh":
        const rarityOrder2 = { "Legendary": 5, "Super Rare": 4, "Rare": 3, "Uncommon": 2, "Common": 1 }
        return (rarityOrder2[a.rarity as keyof typeof rarityOrder2] || 0) - 
               (rarityOrder2[b.rarity as keyof typeof rarityOrder2] || 0)
      case "cardNumberLowHigh":
      default:
        return (a.number || 0) - (b.number || 0)
    }
  })

  // Sort filtered cards
  // NOTE: NO priorizamos por stock - en colección personal todas las cartas son iguales
  const sortedCards = [...filteredAllCards].sort((a, b) => {
    // Apply selected sorting directly (sin prioridad de stock)
    switch (sortBy) {
      case "nameAZ":
        return a.name.localeCompare(b.name)
      case "nameZA":
        return b.name.localeCompare(a.name)
      case "priceLowHigh":
        return (a.price || 0) - (b.price || 0)
      case "priceHighLow":
        return (b.price || 0) - (a.price || 0)
      case "rarityHighLow":
        const rarityOrder = { "Legendary": 5, "Super Rare": 4, "Rare": 3, "Uncommon": 2, "Common": 1 }
        return (rarityOrder[b.rarity as keyof typeof rarityOrder] || 0) - 
               (rarityOrder[a.rarity as keyof typeof rarityOrder] || 0)
      case "rarityLowHigh":
        const rarityOrder2 = { "Legendary": 5, "Super Rare": 4, "Rare": 3, "Uncommon": 2, "Common": 1 }
        return (rarityOrder2[a.rarity as keyof typeof rarityOrder2] || 0) - 
               (rarityOrder2[b.rarity as keyof typeof rarityOrder2] || 0)
      case "cardNumberLowHigh":
      default:
        // Usar 'number' (numérico) en lugar de 'cardNumber' (string)
        return (a.number || 0) - (b.number || 0)
    }
  })

  // Sort filtered owned items (agrupados)
  const sortedOwnedItems = [...filteredOwnedItems].sort((a, b) => {
    const cardA = a.card
    const cardB = b.card
    switch (sortBy) {
      case "nameAZ":
        return cardA.name.localeCompare(cardB.name)
      case "nameZA":
        return cardB.name.localeCompare(cardA.name)
      case "priceLowHigh":
        return (cardA.price || 0) - (cardB.price || 0)
      case "priceHighLow":
        return (cardB.price || 0) - (cardA.price || 0)
      case "rarityHighLow":
        const rarityOrder = { "Legendary": 5, "Super Rare": 4, "Rare": 3, "Uncommon": 2, "Common": 1 }
        return (rarityOrder[cardB.rarity as keyof typeof rarityOrder] || 0) - 
               (rarityOrder[cardA.rarity as keyof typeof rarityOrder] || 0)
      case "rarityLowHigh":
        const rarityOrder2 = { "Legendary": 5, "Super Rare": 4, "Rare": 3, "Uncommon": 2, "Common": 1 }
        return (rarityOrder2[cardA.rarity as keyof typeof rarityOrder2] || 0) - 
               (rarityOrder2[cardB.rarity as keyof typeof rarityOrder2] || 0)
      case "cardNumberLowHigh":
      default:
        return (cardA.number || 0) - (cardB.number || 0)
    }
  })

  // Sort filtered wanted items
  const sortedWantedItems = [...filteredWantedItems].sort((a, b) => {
    if (!a.card || !b.card) return 0
    switch (sortBy) {
      case "nameAZ":
        return a.card.name.localeCompare(b.card.name)
      case "nameZA":
        return b.card.name.localeCompare(a.card.name)
      case "priceLowHigh":
        return (a.card.price || 0) - (b.card.price || 0)
      case "priceHighLow":
        return (b.card.price || 0) - (a.card.price || 0)
      case "rarityHighLow":
        const rarityOrder = { "Legendary": 5, "Super Rare": 4, "Rare": 3, "Uncommon": 2, "Common": 1 }
        return (rarityOrder[b.card.rarity as keyof typeof rarityOrder] || 0) - 
               (rarityOrder[a.card.rarity as keyof typeof rarityOrder] || 0)
      case "rarityLowHigh":
        const rarityOrder2 = { "Legendary": 5, "Super Rare": 4, "Rare": 3, "Uncommon": 2, "Common": 1 }
        return (rarityOrder2[a.card.rarity as keyof typeof rarityOrder2] || 0) - 
               (rarityOrder2[b.card.rarity as keyof typeof rarityOrder2] || 0)
      case "cardNumberLowHigh":
      default:
        return (a.card.number || 0) - (b.card.number || 0)
    }
  })

  if (userLoading || !user) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
          <div className="text-center">
            {userLoading ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">{t("loadingText")}</p>
              </>
            ) : (
              <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Lock className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>{t("loginToView")}</CardTitle>
                  <CardDescription>{t("signInRequiredDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" onClick={() => router.push("/lorcana-tcg/login?redirect=/lorcana-tcg/my-collection")}>
                    {t("signIn")}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{t("myCollection")}</h1>
            <p className="text-muted-foreground">{t("myCollectionDesc")}</p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("totalOwned")}</CardTitle>
                <Package className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{totalOwned}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {ownedItems.length} {ownedItems.length === 1 ? t("cardFound") : t("cardsFound")}
                </p>
              </CardContent>
            </Card>


            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("totalMissing")}</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">{totalMissing}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("missingCardsDesc")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("collectionValue")}</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  ${Math.floor(collectionValue).toLocaleString()} CLP
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("ownedCards")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-3 mb-8">
              <TabsTrigger value="all" className="gap-2">
                <List className="h-4 w-4" />
                {t("allCards")}
              </TabsTrigger>
              <TabsTrigger value="owned" className="gap-2">
                <Package className="h-4 w-4" />
                {t("owned")} ({totalOwnedCards})
              </TabsTrigger>
              <TabsTrigger value="missing" className="gap-2">
                <AlertCircle className="h-4 w-4" />
                {t("missingCards")} ({totalMissing})
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: All Cards */}
            <TabsContent value="all">
              {/* Filters - Mobile Sheet */}
              <div className="lg:hidden mb-6">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      {t("filtersAndSort")}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>{t("filtersAndSort")}</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <CardFilters
                        filters={filters}
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

              <div className="grid lg:grid-cols-[280px_1fr] gap-6">
                {/* Filters - Desktop Sidebar */}
                <aside className="hidden lg:block">
                  <div className="sticky top-4">
                    <CardFilters
                      filters={filters}
                      setFilters={setFilters}
                      sortBy={sortBy}
                      setSortBy={setSortBy}
                      viewMode={viewMode}
                      setViewMode={setViewMode}
                    />
                  </div>
                </aside>

                {/* Cards Grid */}
                <div>
                  {/* Results count */}
                  <div className="mb-4 text-sm text-muted-foreground">
                    {sortedCards.length} {sortedCards.length === 1 ? t("cardFound") : t("cardsFound")}
                  </div>

                  {loadingCards ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                      {sortedCards.map((card) => (
                        <AllCardsCard 
                          key={card.id} 
                          card={card} 
                          t={t} 
                          user={user}
                          collection={collection}
                          isInCollection={isInCollection}
                          addToCollection={addToCollection}
                          removeFromCollection={removeFromCollection}
                          refresh={refresh}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Owned Cards */}
            <TabsContent value="owned">
              {/* Filters - Mobile Sheet */}
              <div className="lg:hidden mb-6">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      {t("filtersAndSort")}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>{t("filtersAndSort")}</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <CardFilters
                        filters={filters}
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

              <div className="grid lg:grid-cols-[280px_1fr] gap-6">
                {/* Filters - Desktop Sidebar */}
                <aside className="hidden lg:block">
                  <div className="sticky top-4">
                    <CardFilters
                      filters={filters}
                      setFilters={setFilters}
                      sortBy={sortBy}
                      setSortBy={setSortBy}
                      viewMode={viewMode}
                      setViewMode={setViewMode}
                    />
                  </div>
                </aside>

                {/* Cards Grid */}
                <div>
                  {loadingCards ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : sortedOwnedItems.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">{t("noOwnedCards")}</h3>
                        <p className="text-muted-foreground text-center mb-6">
                          {t("allCardsDesc")}
                        </p>
                        <Button onClick={() => setActiveTab("all")}>
                          {t("allCards")}
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {/* Results count */}
                      <div className="mb-4 text-sm text-muted-foreground">
                        {sortedOwnedItems.length} {sortedOwnedItems.length === 1 ? t("cardFound") : t("cardsFound")}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        {sortedOwnedItems.map((group) => (
                          <AllCardsCard 
                            key={group.card.id} 
                            card={group.card} 
                            t={t} 
                            user={user}
                            collection={collection}
                            isInCollection={isInCollection}
                            addToCollection={addToCollection}
                            removeFromCollection={removeFromCollection}
                            refresh={refresh}
                            ownedNormal={group.hasNormal}
                            ownedFoil={group.hasFoil}
                            ownedNormalQuantity={group.normalQuantity}
                            ownedFoilQuantity={group.foilQuantity}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Tab 3: Missing Cards */}
            <TabsContent value="missing">
              {/* Filters - Mobile Sheet */}
              <div className="lg:hidden mb-6">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      {t("filtersAndSort")}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>{t("filtersAndSort")}</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <CardFilters
                        filters={filters}
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

              <div className="grid lg:grid-cols-[280px_1fr] gap-6">
                {/* Filters - Desktop Sidebar */}
                <aside className="hidden lg:block">
                  <div className="sticky top-4">
                    <CardFilters
                      filters={filters}
                      setFilters={setFilters}
                      sortBy={sortBy}
                      setSortBy={setSortBy}
                      viewMode={viewMode}
                      setViewMode={setViewMode}
                    />
                  </div>
                </aside>

                {/* Cards Grid */}
                <div>
                  {/* Results count */}
                  <div className="mb-4 text-sm text-muted-foreground">
                    {sortedMissingCards.length} {sortedMissingCards.length === 1 ? t("cardFound") : t("cardsFound")}
                  </div>

                  {loadingCards ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : sortedMissingCards.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <AlertCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">{t("noMissingCards")}</h3>
                        <p className="text-muted-foreground text-center mb-6">
                          {t("missingCardsDesc")}
                        </p>
                        <Button onClick={() => setActiveTab("all")}>
                          {t("allCards")}
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                      {sortedMissingCards.map((item) => (
                        <AllCardsCard 
                          key={item.card.id} 
                          card={item.card} 
                          t={t} 
                          user={user}
                          collection={collection}
                          isInCollection={isInCollection}
                          addToCollection={addToCollection}
                          removeFromCollection={removeFromCollection}
                          refresh={refresh}
                          missingNormal={item.missingNormal}
                          missingFoil={item.missingFoil}
                          missingNormalAvailable={item.missingNormalAvailable}
                          missingFoilAvailable={item.missingFoilAvailable}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </main>
      <Footer />
    </>
  )
}

// Wrapper with Suspense for useSearchParams
export default function MyCollectionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <MyCollectionContent />
    </Suspense>
  )
}

// Component for cards in "All Cards" tab
function AllCardsCard({ 
  card, 
  t, 
  user,
  collection,
  isInCollection,
  addToCollection,
  removeFromCollection,
  refresh,
  missingNormal,
  missingFoil,
  missingNormalAvailable,
  missingFoilAvailable,
  ownedNormal,
  ownedFoil,
  ownedNormalQuantity,
  ownedFoilQuantity
}: { 
  card: CardType
  t: (key: string) => string
  user: any
  collection: any[]
  isInCollection: (cardId: string, status: "owned" | "wanted", version: "normal" | "foil") => boolean
  addToCollection: (cardId: string, status: "owned" | "wanted", version: "normal" | "foil", quantity: number) => Promise<any>
  removeFromCollection: (cardId: string, status: "owned" | "wanted", version: "normal" | "foil") => Promise<any>
  refresh: () => void
  missingNormal?: boolean
  missingFoil?: boolean
  missingNormalAvailable?: boolean
  missingFoilAvailable?: boolean
  ownedNormal?: boolean
  ownedFoil?: boolean
  ownedNormalQuantity?: number
  ownedFoilQuantity?: number
}) {
  const { toast } = useToast()
  const { addToCart } = useCart()
  const [updating, setUpdating] = useState<string | null>(null)

  // Get quantities from collection
  const getQuantity = (status: "owned" | "wanted", version: "normal" | "foil") => {
    const item = collection.find(
      (i) => i.card_id === card.id && i.status === status && i.version === version
    )
    return item?.quantity || 0
  }

  const handleAdd = async (status: "owned" | "wanted", version: "normal" | "foil") => {
    setUpdating(`add-${status}-${version}`)
    
    const result = await addToCollection(card.id, status, version, 1)
    setUpdating(null)

    if (result.success) {
      toast({
        title: t("success"),
        description: status === "owned" ? t("addedToCollection") : t("addedToWishlist"),
      })
    } else if (result.code === "DUPLICATE") {
      // If already exists, increment quantity
      await handleIncrement(status, version)
    } else {
      toast({
        variant: "destructive",
        title: t("error"),
        description: result.error,
      })
    }
  }

  const handleIncrement = async (status: "owned" | "wanted", version: "normal" | "foil") => {
    setUpdating(`inc-${status}-${version}`)
    const currentQty = getQuantity(status, version)
    
    // Si ya existe, actualizar directamente en vez de intentar agregar
    await updateQuantity(status, version, currentQty + 1)
    setUpdating(null)
  }

  const handleDecrement = async (status: "owned" | "wanted", version: "normal" | "foil") => {
    const currentQty = getQuantity(status, version)
    if (currentQty <= 1) {
      // Remove if quantity would be 0
      setUpdating(`dec-${status}-${version}`)
      await removeFromCollection(card.id, status, version)
      setUpdating(null)
    } else {
      // Decrease quantity
      setUpdating(`dec-${status}-${version}`)
      await updateQuantity(status, version, currentQty - 1)
      setUpdating(null)
    }
  }

  const updateQuantity = async (status: "owned" | "wanted", version: "normal" | "foil", newQty: number) => {
    try {
      const response = await fetch("/api/my-collection", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          cardId: card.id,
          status,
          version,
          quantity: newQty,
        }),
      })
      const data = await response.json()
      if (data.success) {
        // Recargar colección desde el servidor
        refresh()
      } else {
        toast({
          variant: "destructive",
          title: t("error"),
          description: data.error,
        })
      }
    } catch (error) {
      console.error("Error updating quantity:", error)
      toast({
        variant: "destructive",
        title: t("error"),
        description: "Error updating quantity",
      })
    }
  }

  // Usar props si están disponibles (pestaña "Tengo" agrupada), sino calcular desde collection
  const hasNormalOwned = ownedNormal !== undefined ? ownedNormal : isInCollection(card.id, "owned", "normal")
  const hasFoilOwned = ownedFoil !== undefined ? ownedFoil : isInCollection(card.id, "owned", "foil")
  const hasNormalWanted = isInCollection(card.id, "wanted", "normal")
  const hasFoilWanted = isInCollection(card.id, "wanted", "foil")
  
  const qtyNormalOwned = ownedNormalQuantity !== undefined ? ownedNormalQuantity : getQuantity("owned", "normal")
  const qtyFoilOwned = ownedFoilQuantity !== undefined ? ownedFoilQuantity : getQuantity("owned", "foil")
  const qtyNormalWanted = getQuantity("wanted", "normal")
  const qtyFoilWanted = getQuantity("wanted", "foil")

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-[2/3] bg-muted">
        <Image
          src={card.image || "/placeholder.svg"}
          alt={card.name}
          fill
          className="object-cover"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {/* En la pestaña de faltantes, solo mostrar lo que falta */}
          {missingNormal !== undefined && missingFoil !== undefined ? (
            <>
              {missingNormal && (
                <Badge variant="outline" className={`${missingNormalAvailable ? 'bg-green-500/90' : 'bg-orange-500/90'} text-white border-orange-400`}>
                  {missingNormalAvailable ? (
                    <>
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Falta {t("normal")} ✓
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Falta {t("normal")}
                    </>
                  )}
                </Badge>
              )}
              {missingFoil && (
                <Badge variant="outline" className={`${missingFoilAvailable ? 'bg-green-500/90' : 'bg-orange-500/90'} text-white border-orange-400`}>
                  {missingFoilAvailable ? (
                    <>
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Falta {t("foil")} ✓
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Falta {t("foil")}
                    </>
                  )}
                </Badge>
              )}
            </>
          ) : (
            <>
              {/* En otras pestañas, mostrar lo que tienes */}
              {hasNormalOwned && (
                <Badge className="bg-green-500/90">
                  <Check className="h-3 w-3 mr-1" />
                  {t("normal")}
                </Badge>
              )}
              {hasFoilOwned && (
                <Badge className="bg-green-500/90">
                  <Check className="h-3 w-3 mr-1" />
                  {t("foil")}
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-sm mb-2 line-clamp-2">{card.name}</h3>
        
        <div className="flex flex-wrap gap-1 mb-3">
          <Badge variant="secondary" className="text-xs">{card.type}</Badge>
          <Badge variant="outline" className="text-xs">{card.rarity}</Badge>
        </div>

        <div className="space-y-2 mb-3">
          {/* Normal Owned */}
          {hasNormalOwned ? (
            <div className="flex items-center gap-1 p-2 bg-green-500/10 rounded-md border border-green-500/20">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-green-600"
                onClick={() => handleDecrement("owned", "normal")}
                disabled={!!updating}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <div className="flex-1 text-center">
                <span className="text-xs font-semibold text-green-600">
                  {qtyNormalOwned}× {t("normal")}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-green-600"
                onClick={() => handleIncrement("owned", "normal")}
                disabled={!!updating}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full hover:bg-primary hover:text-primary-foreground"
              onClick={() => handleAdd("owned", "normal")}
              disabled={!!updating}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t("addNormal")}
            </Button>
          )}

          {/* Foil Owned */}
          {hasFoilOwned ? (
            <div className="flex items-center gap-1 p-2 bg-green-500/10 rounded-md border border-green-500/20">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-green-600"
                onClick={() => handleDecrement("owned", "foil")}
                disabled={!!updating}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <div className="flex-1 text-center">
                <span className="text-xs font-semibold text-green-600">
                  {qtyFoilOwned}× {t("foil")}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-green-600"
                onClick={() => handleIncrement("owned", "foil")}
                disabled={!!updating}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full hover:bg-primary hover:text-primary-foreground"
              onClick={() => handleAdd("owned", "foil")}
              disabled={!!updating}
            >
              <Plus className="h-3 w-3 mr-1" />
              {t("addFoil")}
            </Button>
          )}

          {/* Normal Wanted */}
          {hasNormalWanted ? (
            <div className="flex items-center gap-1 p-2 bg-red-500/10 rounded-md border border-red-500/20">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-600"
                onClick={() => handleDecrement("wanted", "normal")}
                disabled={!!updating}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <div className="flex-1 text-center">
                <span className="text-xs font-semibold text-red-600">
                  ❤️ {qtyNormalWanted}× {t("normal")}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-600"
                onClick={() => handleIncrement("wanted", "normal")}
                disabled={!!updating}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => handleAdd("wanted", "normal")}
              disabled={!!updating}
            >
              <Heart className="h-3 w-3 mr-1" />
              {t("normal")}
            </Button>
          )}

          {/* Foil Wanted */}
          {hasFoilWanted ? (
            <div className="flex items-center gap-1 p-2 bg-red-500/10 rounded-md border border-red-500/20">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-600"
                onClick={() => handleDecrement("wanted", "foil")}
                disabled={!!updating}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <div className="flex-1 text-center">
                <span className="text-xs font-semibold text-red-600">
                  ❤️ {qtyFoilWanted}× {t("foil")}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-600"
                onClick={() => handleIncrement("wanted", "foil")}
                disabled={!!updating}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => handleAdd("wanted", "foil")}
              disabled={!!updating}
            >
              <Heart className="h-3 w-3 mr-1" />
              {t("foil")}
            </Button>
          )}

          {/* Botones para agregar al carrito si está disponible en faltantes */}
          {missingNormal !== undefined && missingFoil !== undefined && (
            <>
              {missingNormalAvailable && (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700 mb-2"
                  onClick={() => {
                    addToCart({
                      id: card.id,
                      name: card.name,
                      image: card.image,
                      price: card.price || 0,
                      version: "normal",
                      quantity: 1,
                    })
                    toast({
                      title: t("success"),
                      description: `${card.name} (${t("normal")}) ${t("addedToCart")}`,
                    })
                  }}
                >
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Agregar {t("normal")} al Carrito
                </Button>
              )}
              {missingFoilAvailable && (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    addToCart({
                      id: card.id,
                      name: card.name,
                      image: card.image,
                      price: card.foilPrice || card.price || 0,
                      version: "foil",
                      quantity: 1,
                    })
                    toast({
                      title: t("success"),
                      description: `${card.name} (${t("foil")}) ${t("addedToCart")}`,
                    })
                  }}
                >
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Agregar {t("foil")} al Carrito
                </Button>
              )}
            </>
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center">
          ${Math.floor(card.price || 0).toLocaleString()} / ${Math.floor(card.foilPrice || 0).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  )
}

// Component for cards in "Owned" and "Wanted" tabs
function CollectionCard({
  item,
  onRemove,
  t,
  onAddToCart,
  isAvailable = false,
}: {
  item: CollectionItem
  onRemove: () => void
  t: (key: string) => string
  onAddToCart?: () => void
  isAvailable?: boolean
}) {
  const card = item.card
  const [quantity, setQuantity] = useState(item.quantity)
  const { user } = useUser()
  const { toast } = useToast()

  if (!card) return null

  // Verificar stock disponible
  const normalStock = card.normalStock || card.stock || 0
  const foilStock = card.foilStock || 0
  const hasStock = item.version === "normal" ? normalStock > 0 : foilStock > 0

  const handleUpdateQuantity = async (newQuantity: number) => {
    if (newQuantity < 1) return
    
    setQuantity(newQuantity)

    // TODO: Create PUT endpoint to update quantity
    // For now, just update local state
    toast({
      title: t("success"),
      description: t("updateQuantity"),
    })
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-[2/3] bg-muted">
        <Image
          src={card.image || "/placeholder.svg"}
          alt={card.name}
          fill
          className="object-cover"
        />
        <Badge className="absolute top-2 left-2 bg-green-500/90">
          {item.version === "foil" && <Sparkles className="h-3 w-3 mr-1" />}
          {item.version === "normal" ? t("normal") : t("foil")}
        </Badge>
        {hasStock && isAvailable && (
          <Badge className="absolute top-2 right-2 bg-primary/90 animate-pulse">
            <ShoppingCart className="h-3 w-3 mr-1" />
            Disponible
          </Badge>
        )}
        {item.quantity > 1 && (!hasStock || !isAvailable) && (
          <Badge className="absolute top-2 right-2 bg-primary/90">
            x{item.quantity}
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-sm mb-2 line-clamp-2">{card.name}</h3>
        
        <div className="flex flex-wrap gap-1 mb-3">
          <Badge variant="secondary" className="text-xs">{card.type}</Badge>
          <Badge variant="outline" className="text-xs">{card.rarity}</Badge>
        </div>

        {/* Quantity Control */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleUpdateQuantity(quantity - 1)}
            disabled={quantity <= 1}
          >
            <Minus className="h-3 w-3" />
          </Button>
          
          <span className="text-sm font-medium w-12 text-center">
            {quantity}
          </span>
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleUpdateQuantity(quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <div className="text-xs text-muted-foreground mb-3 text-center">
          {t("price")}: ${Math.floor((item.version === "foil" ? card.foilPrice : card.price) || 0).toLocaleString()}
        </div>

        {/* Botón de Agregar al Carrito si está disponible */}
        {hasStock && isAvailable && onAddToCart && (
          <Button
            variant="default"
            size="sm"
            className="w-full mb-2"
            onClick={onAddToCart}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Agregar al Carrito
          </Button>
        )}

        {/* Mensaje si no está disponible */}
        {!hasStock && item.status === "wanted" && (
          <div className="mb-2 p-2 bg-muted rounded-md text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Sin stock disponible
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            asChild
          >
            <Link href={`/lorcana-tcg/card/${item.card_id}`}>
              <ExternalLink className="h-3 w-3 mr-1" />
              {t("viewDetails")}
            </Link>
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={onRemove}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        <div className="mt-2 text-xs text-muted-foreground text-center">
          {new Date(item.added_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  )
}
