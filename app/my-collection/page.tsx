"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { useUser } from "@/hooks/use-user"
import { useCollection } from "@/hooks/use-collection"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
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
  const { user, loading: userLoading } = useUser()
  const { collection, isInCollection, addToCollection, removeFromCollection, refresh } = useCollection()
  const { toast } = useToast()
  
  const [allCards, setAllCards] = useState<CardType[]>([])
  const [loadingCards, setLoadingCards] = useState(true)
  const [activeTab, setActiveTab] = useState<"all" | "owned" | "wanted">("all")
  const [searchTerm, setSearchTerm] = useState("")

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login?redirect=/my-collection")
    }
  }, [user, userLoading, router])

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
  const filteredAllCards = allCards.filter((card) =>
    card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <Input
                    type="search"
                    placeholder={t("search")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-md"
                  />
                </CardContent>
              </Card>

              {loadingCards ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredAllCards.map((card) => (
                    <AllCardsCard 
                      key={card.id} 
                      card={card} 
                      t={t} 
                      user={user}
                      isInCollection={isInCollection}
                      addToCollection={addToCollection}
                    />
                  ))}
                </div>
              )}
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
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
  isInCollection,
  addToCollection
}: { 
  card: CardType
  t: (key: string) => string
  user: any
  isInCollection: (cardId: string, status: "owned" | "wanted", version: "normal" | "foil") => boolean
  addToCollection: (cardId: string, status: "owned" | "wanted", version: "normal" | "foil", quantity: number) => Promise<any>
}) {
  const { toast } = useToast()
  const [adding, setAdding] = useState<string | null>(null)

  const handleAdd = async (status: "owned" | "wanted", version: "normal" | "foil") => {
    setAdding(`${status}-${version}`)
    
    const result = await addToCollection(card.id, status, version, 1)
    setAdding(null)

    if (result.success) {
      toast({
        title: t("success"),
        description: status === "owned" ? t("addedToCollection") : t("addedToWishlist"),
      })
    } else if (result.code === "DUPLICATE") {
      toast({
        variant: "destructive",
        title: t("error"),
        description: status === "owned" ? t("alreadyOwned") : t("alreadyWanted"),
      })
    } else {
      toast({
        variant: "destructive",
        title: t("error"),
        description: result.error,
      })
    }
  }

  const hasNormalOwned = isInCollection(card.id, "owned", "normal")
  const hasFoilOwned = isInCollection(card.id, "owned", "foil")
  const hasNormalWanted = isInCollection(card.id, "wanted", "normal")
  const hasFoilWanted = isInCollection(card.id, "wanted", "foil")

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
          {/* Add to Owned Buttons */}
          <div className="flex gap-2">
            <Button
              variant={hasNormalOwned ? "default" : "outline"}
              size="sm"
              className="flex-1 hover:bg-primary hover:text-primary-foreground"
              onClick={() => handleAdd("owned", "normal")}
              disabled={adding === "owned-normal"}
            >
              {adding === "owned-normal" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : hasNormalOwned ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  {t("normal")}
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3 mr-1" />
                  {t("normal")}
                </>
              )}
            </Button>

            <Button
              variant={hasFoilOwned ? "default" : "outline"}
              size="sm"
              className="flex-1 hover:bg-primary hover:text-primary-foreground"
              onClick={() => handleAdd("owned", "foil")}
              disabled={adding === "owned-foil"}
            >
              {adding === "owned-foil" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : hasFoilOwned ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  {t("foil")}
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3 mr-1" />
                  {t("foil")}
                </>
              )}
            </Button>
          </div>

          {/* Add to Wanted Buttons */}
          <div className="flex gap-2">
            <Button
              variant={hasNormalWanted ? "destructive" : "outline"}
              size="sm"
              className="flex-1 hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => handleAdd("wanted", "normal")}
              disabled={adding === "wanted-normal"}
            >
              {adding === "wanted-normal" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Heart className="h-3 w-3 mr-1" />
              )}
              {t("normal")}
            </Button>

            <Button
              variant={hasNormalWanted ? "destructive" : "outline"}
              size="sm"
              className="flex-1 hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => handleAdd("wanted", "foil")}
              disabled={adding === "wanted-foil"}
            >
              {adding === "wanted-foil" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Heart className="h-3 w-3 mr-1" />
              )}
              {t("foil")}
            </Button>
          </div>
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
