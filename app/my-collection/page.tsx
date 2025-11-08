"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CardFilters } from "@/components/card-filters"
import { useLanguage } from "@/components/language-provider"
import { useUser } from "@/hooks/use-user"
import { useCollection } from "@/hooks/use-collection"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SlidersHorizontal } from "lucide-react"
import { 
  Loader2, Lock, Package, Heart, Trash2, ExternalLink, 
  TrendingUp, Plus, Minus, Check, List, Sparkles
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

export default function MyCollectionPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: userLoading } = useUser()
  const { collection, isInCollection, addToCollection, removeFromCollection, refresh } = useCollection()
  const { toast } = useToast()
  
  const [allCards, setAllCards] = useState<CardType[]>([])
  const [loadingCards, setLoadingCards] = useState(true)
  
  // Leer tab desde URL o usar default
  const tabFromUrl = searchParams.get("tab") as "all" | "owned" | "wanted" | null
  const [activeTab, setActiveTab] = useState<"all" | "owned" | "wanted">(tabFromUrl || "all")
  const [filters, setFilters] = useState({
    type: "all",
    set: "all",
    rarity: "all",
    minPrice: 0,
    maxPrice: 10000,
    version: "all",
    search: "",
  })
  const [sortBy, setSortBy] = useState("cardNumberLowHigh")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login?redirect=/my-collection")
    }
  }, [user, userLoading, router])

  // Sync activeTab with URL
  useEffect(() => {
    const newUrl = activeTab === "all" 
      ? "/my-collection" 
      : `/my-collection?tab=${activeTab}`
    router.replace(newUrl, { scroll: false })
  }, [activeTab, router])

  // Restore tab from URL on mount
  useEffect(() => {
    if (tabFromUrl && ["all", "owned", "wanted"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
    }
  }, []) // Solo al montar

  // Load all cards
  useEffect(() => {
    if (user) {
      loadAllCards()
    }
  }, [user])

  const loadAllCards = async () => {
    try {
      setLoadingCards(true)
      console.log("🔍 Fetching cards from /api/inventory...")
      const response = await fetch("/api/inventory")
      const data = await response.json()
      
      console.log("📦 API Response:", data)
      console.log("📊 Cards loaded:", data.inventory?.length || 0)
      
      if (data.success) {
        setAllCards(data.inventory || [])
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

  // Calculate stats
  const totalOwned = ownedItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalWanted = wantedItems.reduce((sum, item) => sum + item.quantity, 0)
  const collectionValue = ownedItems.reduce((sum, item) => {
    const price = item.version === "foil" 
      ? (item.card?.foilPrice || 0) 
      : (item.card?.price || 0)
    return sum + (price * item.quantity)
  }, 0)

  // Filter cards for "All Cards" tab
  // NOTE: NO filtramos por stock/version porque esto es para crear colección personal
  // Los usuarios deben ver TODAS las cartas disponibles, no solo las en stock
  const filteredAllCards = allCards.filter((card) => {
    // Type filter
    if (filters.type && filters.type !== "all" && card.type !== filters.type) return false
    
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
                  <Button className="w-full" onClick={() => router.push("/login?redirect=/my-collection")}>
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
          <div className="grid md:grid-cols-3 gap-6 mb-8">
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
                <CardTitle className="text-sm font-medium">{t("totalWanted")}</CardTitle>
                <Heart className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{totalWanted}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {wantedItems.length} {wantedItems.length === 1 ? t("cardFound") : t("cardsFound")}
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
            <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 mb-8">
              <TabsTrigger value="all" className="gap-2">
                <List className="h-4 w-4" />
                {t("allCards")}
              </TabsTrigger>
              <TabsTrigger value="owned" className="gap-2">
                <Package className="h-4 w-4" />
                {t("owned")} ({ownedItems.length})
              </TabsTrigger>
              <TabsTrigger value="wanted" className="gap-2">
                <Heart className="h-4 w-4" />
                {t("wanted")} ({wantedItems.length})
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
              {loadingCards ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : ownedItems.length === 0 ? (
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                  {ownedItems.map((item) => (
                    <CollectionCard
                      key={item.id}
                      item={item}
                      onRemove={() => removeFromCollection(item.card_id, "owned", item.version)}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab 3: Wanted Cards */}
            <TabsContent value="wanted">
              {loadingCards ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : wantedItems.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Heart className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">{t("noWantedCards")}</h3>
                    <p className="text-muted-foreground text-center mb-6">
                      {t("allCardsDesc")}
                    </p>
                    <Button onClick={() => setActiveTab("all")}>
                      {t("allCards")}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                  {wantedItems.map((item) => (
                    <CollectionCard
                      key={item.id}
                      item={item}
                      onRemove={() => removeFromCollection(item.card_id, "wanted", item.version)}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </>
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
  refresh
}: { 
  card: CardType
  t: (key: string) => string
  user: any
  collection: any[]
  isInCollection: (cardId: string, status: "owned" | "wanted", version: "normal" | "foil") => boolean
  addToCollection: (cardId: string, status: "owned" | "wanted", version: "normal" | "foil", quantity: number) => Promise<any>
  removeFromCollection: (cardId: string, status: "owned" | "wanted", version: "normal" | "foil") => Promise<any>
  refresh: () => void
}) {
  const { toast } = useToast()
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

  const hasNormalOwned = isInCollection(card.id, "owned", "normal")
  const hasFoilOwned = isInCollection(card.id, "owned", "foil")
  const hasNormalWanted = isInCollection(card.id, "wanted", "normal")
  const hasFoilWanted = isInCollection(card.id, "wanted", "foil")
  
  const qtyNormalOwned = getQuantity("owned", "normal")
  const qtyFoilOwned = getQuantity("owned", "foil")
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
        </div>
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {hasNormalWanted && (
            <Badge className="bg-red-500/90">
              <Heart className="h-3 w-3" />
            </Badge>
          )}
          {hasFoilWanted && (
            <Badge className="bg-red-500/90">
              <Heart className="h-3 w-3" />
            </Badge>
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
}: {
  item: CollectionItem
  onRemove: () => void
  t: (key: string) => string
}) {
  const card = item.card
  const [quantity, setQuantity] = useState(item.quantity)
  const { user } = useUser()
  const { toast } = useToast()

  if (!card) return null

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
        {item.quantity > 1 && (
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

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            asChild
          >
            <Link href={`/card/${item.card_id}`}>
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
