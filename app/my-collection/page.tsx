"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { useUser } from "@/hooks/use-user"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Loader2, Lock, Package, Heart, Trash2, ExternalLink, 
  TrendingUp, Calendar, Star 
} from "lucide-react"

interface CollectionItem {
  id: string
  user_id: string
  card_id: string
  status: "owned" | "wanted"
  quantity: number
  notes: string | null
  added_at: string
  updated_at: string
}

interface CardWithCollection extends CollectionItem {
  card?: any // Card data from cards table
}

export default function MyCollectionPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { toast } = useToast()
  
  const [ownedCards, setOwnedCards] = useState<CardWithCollection[]>([])
  const [wantedCards, setWantedCards] = useState<CardWithCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"owned" | "wanted">("owned")

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login?redirect=/my-collection")
    }
  }, [user, userLoading, router])

  // Fetch collection
  useEffect(() => {
    if (user && !userLoading) {
      fetchCollection()
    }
  }, [user, userLoading])

  const fetchCollection = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Fetch owned and wanted separately
      const [ownedRes, wantedRes] = await Promise.all([
        fetch(`/api/my-collection?userId=${user.id}&status=owned`),
        fetch(`/api/my-collection?userId=${user.id}&status=wanted`),
      ])

      const [ownedData, wantedData] = await Promise.all([
        ownedRes.json(),
        wantedRes.json(),
      ])

      if (ownedData.success) {
        // Fetch card details for each item
        const ownedWithCards = await Promise.all(
          (ownedData.data || []).map(async (item: CollectionItem) => {
            try {
              const cardRes = await fetch(`/api/cards/${item.card_id}`)
              const cardData = await cardRes.json()
              return { ...item, card: cardData.success ? cardData.data : null }
            } catch {
              return { ...item, card: null }
            }
          })
        )
        setOwnedCards(ownedWithCards)
      }

      if (wantedData.success) {
        const wantedWithCards = await Promise.all(
          (wantedData.data || []).map(async (item: CollectionItem) => {
            try {
              const cardRes = await fetch(`/api/cards/${item.card_id}`)
              const cardData = await cardRes.json()
              return { ...item, card: cardData.success ? cardData.data : null }
            } catch {
              return { ...item, card: null }
            }
          })
        )
        setWantedCards(wantedWithCards)
      }
    } catch (error) {
      console.error("Error fetching collection:", error)
      toast({
        variant: "destructive",
        title: t("error"),
        description: "Failed to load your collection",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (cardId: string, status: "owned" | "wanted") => {
    if (!user) return

    try {
      const response = await fetch(
        `/api/my-collection?userId=${user.id}&cardId=${cardId}&status=${status}`,
        { method: "DELETE" }
      )

      const data = await response.json()

      if (data.success) {
        toast({
          title: t("success"),
          description: status === "owned" ? t("removedFromCollection") : t("removedFromWishlist"),
        })
        fetchCollection() // Reload
      } else {
        toast({
          variant: "destructive",
          title: t("error"),
          description: data.error,
        })
      }
    } catch (error) {
      console.error("Error removing card:", error)
      toast({
        variant: "destructive",
        title: t("error"),
        description: "Failed to remove card",
      })
    }
  }

  // Calculate stats
  const totalOwned = ownedCards.reduce((sum, item) => sum + (item.quantity || 1), 0)
  const totalWanted = wantedCards.length
  const collectionValue = ownedCards.reduce((sum, item) => {
    const price = item.card?.price || 0
    return sum + (price * (item.quantity || 1))
  }, 0)

  if (userLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t("loadingText")}</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
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
                  {ownedCards.length} {ownedCards.length === 1 ? t("cardFound") : t("cardsFound")}
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
                  {wantedCards.length} {wantedCards.length === 1 ? t("cardFound") : t("cardsFound")}
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
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "owned" | "wanted")}>
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="owned" className="gap-2">
                <Package className="h-4 w-4" />
                {t("owned")} ({ownedCards.length})
              </TabsTrigger>
              <TabsTrigger value="wanted" className="gap-2">
                <Heart className="h-4 w-4" />
                {t("wanted")} ({wantedCards.length})
              </TabsTrigger>
            </TabsList>

            {/* Owned Cards Tab */}
            <TabsContent value="owned">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : ownedCards.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">{t("noOwnedCards")}</h3>
                    <p className="text-muted-foreground text-center mb-6">
                      {t("browseCatalog")}
                    </p>
                    <Button onClick={() => router.push("/catalog")}>
                      {t("catalog")}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {ownedCards.map((item) => (
                    <CollectionCard
                      key={item.id}
                      item={item}
                      onRemove={() => handleRemove(item.card_id, "owned")}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Wanted Cards Tab */}
            <TabsContent value="wanted">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : wantedCards.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Heart className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">{t("noWantedCards")}</h3>
                    <p className="text-muted-foreground text-center mb-6">
                      {t("browseCatalog")}
                    </p>
                    <Button onClick={() => router.push("/catalog")}>
                      {t("catalog")}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {wantedCards.map((item) => (
                    <CollectionCard
                      key={item.id}
                      item={item}
                      onRemove={() => handleRemove(item.card_id, "wanted")}
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

// Component for individual collection card
function CollectionCard({
  item,
  onRemove,
  t,
}: {
  item: CardWithCollection
  onRemove: () => void
  t: (key: string) => string
}) {
  const card = item.card

  if (!card) {
    return null
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
        {item.status === "owned" && item.quantity > 1 && (
          <Badge className="absolute top-2 right-2 bg-green-500/90">
            x{item.quantity}
          </Badge>
        )}
        {item.status === "owned" && (
          <Badge className="absolute top-2 left-2 bg-green-500/90">
            <Package className="h-3 w-3 mr-1" />
            {t("owned")}
          </Badge>
        )}
        {item.status === "wanted" && (
          <Badge className="absolute top-2 left-2 bg-red-500/90">
            <Heart className="h-3 w-3 mr-1" />
            {t("wanted")}
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-sm mb-2 line-clamp-2">{card.name}</h3>
        
        <div className="flex flex-wrap gap-1 mb-3">
          <Badge variant="secondary" className="text-xs">{card.type}</Badge>
          <Badge variant="outline" className="text-xs">{card.rarity}</Badge>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground mb-3">
          <div className="flex justify-between">
            <span>{t("set")}:</span>
            <span className="font-medium">{card.set}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("price")}:</span>
            <span className="font-medium">${Math.floor(card.price || 0).toLocaleString()}</span>
          </div>
          {item.notes && (
            <div className="pt-2 border-t">
              <p className="text-xs italic">{item.notes}</p>
            </div>
          )}
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
              {t("viewInCatalog")}
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
          {t("recentlyAdded")}: {new Date(item.added_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  )
}

