"use client"

import { useState, useEffect, useMemo } from "react"
import { AdminHeader } from "@/components/admin-header"
import { Footer } from "@/components/footer"
import { AuthGuard } from "@/components/auth-guard"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Package, Search, Save, AlertCircle, Loader2, Download, Plus } from "lucide-react"
import Image from "next/image"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

interface InventoryItem {
  id: string
  name: string
  set?: string
  type?: string
  rarity?: string
  number?: number
  cardNumber?: string
  price: number
  foilPrice?: number
  normalStock: number
  foilStock?: number
  image: string
  productType?: string
}

export default function InventoryPage() {
  const { t } = useLanguage()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    set: "all",
    type: "all",
    rarity: "all",
    productType: "all", // all, card, booster, playmat, sleeves, deckbox, dice, accessory
    stockStatus: "all", // all, inStock, outOfStock, lowStock
    stockType: "all", // all, hasNormal, hasFoil, hasBoth
  })
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAddCard, setShowAddCard] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: "",
    productType: "booster" as "booster" | "playmat" | "sleeves" | "deckbox" | "dice" | "accessory",
    price: 0,
    stock: 0,
    image: "",
    description: "",
    set: "",
    // Campos específicos por tipo
    cardsPerPack: 12, // para boosters
    count: 50, // para sleeves
    capacity: 60, // para deckbox
    material: "", // para playmat y deckbox
    size: "", // para playmat y sleeves
    color: "", // para dice
    category: "", // para accessory
  })
  const [newCard, setNewCard] = useState({
    name: "",
    set: "firstChapter",
    type: "character" as "character" | "action" | "item" | "song",
    rarity: "common" as "common" | "uncommon" | "rare" | "superRare" | "legendary" | "enchanted",
    number: 0,
    cardNumber: "",
    price: 0,
    foilPrice: 0,
    normalStock: 0,
    foilStock: 0,
    image: "",
    description: "",
  })
  const [editedCards, setEditedCards] = useState<Map<string, { normalStock?: number; foilStock?: number; price?: number; foilPrice?: number }>>(new Map())
  const [savingCard, setSavingCard] = useState<string | null>(null) // ID de la carta que se está guardando
  const [savingAll, setSavingAll] = useState(false) // Estado para Save All
  const [importing, setImporting] = useState(false) // Estado para importación de cartas
  const { toast } = useToast()

  // Fetch inventory on mount
  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/inventory")
      const data = await response.json()
      
      if (data.success) {
        console.log(`✅ Inventory loaded: ${data.inventory?.length || 0} items`)
        // Buscar la carta "prueba" para debugging
        const pruebaCard = data.inventory?.find((item: any) => item.name?.toLowerCase().includes("prueba"))
        if (pruebaCard) {
          console.log(`🔍 Found "prueba" card:`, pruebaCard)
        } else {
          console.log(`⚠️ "prueba" card not found in inventory`)
        }
        setInventory(data.inventory || [])
      } else {
        console.error("❌ Failed to load inventory:", data.error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load inventory",
        })
      }
    } catch (error) {
      console.error("Error fetching inventory:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load inventory",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStockChange = (cardId: string, type: 'normal' | 'foil', value: string) => {
    const numValue = parseInt(value) || 0
    const current = editedCards.get(cardId) || {}
    
    if (type === 'normal') {
      setEditedCards(new Map(editedCards.set(cardId, { ...current, normalStock: numValue })))
    } else {
      setEditedCards(new Map(editedCards.set(cardId, { ...current, foilStock: numValue })))
    }
  }

  const handlePriceChange = (cardId: string, type: 'normal' | 'foil', value: string) => {
    const numValue = parseFloat(value) || 0
    const current = editedCards.get(cardId) || {}
    
    if (type === 'normal') {
      setEditedCards(new Map(editedCards.set(cardId, { ...current, price: numValue })))
    } else {
      setEditedCards(new Map(editedCards.set(cardId, { ...current, foilPrice: numValue })))
    }
  }

  const handleSaveStock = async (cardId: string) => {
    const changes = editedCards.get(cardId)
    if (!changes) {
      console.log("⚠️ No hay cambios para guardar")
      return
    }

    console.log(`💾 Guardando stock para ${cardId}:`, changes)
    setSavingCard(cardId) // Marcar esta carta como "guardando"

    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, ...changes }),
      })

      const data = await response.json()
      console.log(`📥 Respuesta del servidor:`, data)

      if (!response.ok || !data.success) {
        // Error del servidor
        const errorMsg = data.error || "Failed to update stock"
        const hint = data.hint ? `\n\n💡 ${data.hint}` : ""
        console.error("❌ Error del servidor:", data)
        toast({
          variant: "destructive",
          title: "Error al guardar",
          description: `${errorMsg}${hint}`,
        })
        return
      }

      // Éxito - actualizar estado local
      setInventory(prev => prev.map(item => 
        item.id === cardId 
          ? { 
              ...item, 
              normalStock: changes.normalStock ?? item.normalStock, 
              foilStock: changes.foilStock ?? item.foilStock,
              price: changes.price ?? item.price,
              foilPrice: changes.foilPrice ?? item.foilPrice
            }
          : item
      ))
      
      // Remover de edited cards
      const newEdited = new Map(editedCards)
      newEdited.delete(cardId)
      setEditedCards(newEdited)

      const source = data.meta?.source || "unknown"
      toast({
        title: "✅ Guardado",
        description: `Stock actualizado para ${data.card.name} (${source})`,
      })
    } catch (error) {
      console.error("❌ Error updating stock:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update stock",
      })
    } finally {
      setSavingCard(null) // Limpiar estado de guardado
    }
  }

  const handleSaveAll = async () => {
    if (editedCards.size === 0) {
      toast({
        title: t("noChanges"),
        description: t("noStockChanges"),
      })
      return
    }

    const updates = Array.from(editedCards.entries()).map(([cardId, changes]) => ({
      cardId,
      ...changes
    }))

    setSavingAll(true) // Marcar como "guardando todo"

    try {
      const response = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })

      const data = await response.json()

      if (data.success) {
        // Update local state
        data.results.forEach((result: any) => {
          if (result.success) {
            setInventory(prev => prev.map(item => 
              item.id === result.cardId 
                ? { 
                    ...item, 
                    normalStock: result.normalStock, 
                    foilStock: result.foilStock,
                    price: result.price ?? item.price,
                    foilPrice: result.foilPrice ?? item.foilPrice
                  }
                : item
            ))
          }
        })

        setEditedCards(new Map())

        toast({
          title: "Success",
          description: `Updated ${data.results.filter((r: any) => r.success).length} cards`,
        })
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to update stock",
        })
      }
    } catch (error) {
      console.error("Error updating stock:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update stock",
      })
    } finally {
      setSavingAll(false) // Limpiar estado de guardado
    }
  }

  // Import cards from Lorcana API
  const handleImportCards = async () => {
    setImporting(true)
    
    try {
      const response = await fetch('/api/admin/import-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✅ Import Successful",
          description: `Imported ${data.stats.imported} NEW cards. ${data.stats.skipped} existing cards preserved (not modified).`,
        })
        
        // Refresh inventory
        await fetchInventory()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to import cards",
        })
      }
    } catch (error) {
      console.error("Error importing cards:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to import cards from API",
      })
    } finally {
      setImporting(false)
    }
  }

  // Create new product
  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Nombre y precio son requeridos",
      })
      return
    }

    setImporting(true)
    
    try {
      const productData: any = {
        name: newProduct.name,
        productType: newProduct.productType,
        price: Number(newProduct.price),
        stock: Number(newProduct.stock) || 0,
        normalStock: Number(newProduct.stock) || 0,
        image: newProduct.image || "",
        description: newProduct.description || "",
        status: "approved",
      }

      // Campos específicos por tipo
      if (newProduct.productType === "booster") {
        productData.set = newProduct.set || "firstChapter"
        productData.cardsPerPack = newProduct.cardsPerPack || 12
      } else if (newProduct.productType === "playmat") {
        productData.material = newProduct.material || ""
        productData.size = newProduct.size || ""
      } else if (newProduct.productType === "sleeves") {
        productData.count = newProduct.count || 50
        productData.size = newProduct.size || "Standard"
      } else if (newProduct.productType === "deckbox") {
        productData.capacity = newProduct.capacity || 60
        productData.material = newProduct.material || ""
      } else if (newProduct.productType === "dice") {
        productData.count = newProduct.count || 1
        productData.color = newProduct.color || ""
      } else if (newProduct.productType === "accessory") {
        productData.category = newProduct.category || ""
      }

      // Usar /api/products para productos que no son cartas
      const apiEndpoint = newProduct.productType === "card" ? '/api/cards' : '/api/products'
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✅ Producto Creado",
          description: `${newProduct.name} agregado exitosamente`,
        })
        
        // Reset form
        setNewProduct({
          name: "",
          productType: "booster",
          price: 0,
          stock: 0,
          image: "",
          description: "",
          set: "",
          cardsPerPack: 12,
          count: 50,
          capacity: 60,
          material: "",
          size: "",
          color: "",
          category: "",
        })
        setShowAddProduct(false)
        
        // Refresh inventory
        await fetchInventory()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to create product",
        })
      }
    } catch (error) {
      console.error("Error creating product:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create product",
      })
    } finally {
      setImporting(false)
    }
  }

  // Create new card manually
  const handleCreateCard = async () => {
    if (!newCard.name || !newCard.type || !newCard.rarity || !newCard.set) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Nombre, set, tipo y rareza son requeridos",
      })
      return
    }

    // Validar que el número de carta sea válido
    if (!newCard.number || newCard.number <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El número de carta debe ser mayor a 0",
      })
      return
    }

    // Generar cardNumber si no se proporcionó
    const cardNumber = newCard.cardNumber || `${newCard.number}/205`

    setImporting(true)
    
    try {
      const cardData: any = {
        name: newCard.name,
        productType: "card",
        set: newCard.set,
        type: newCard.type,
        rarity: newCard.rarity,
        number: Number(newCard.number),
        cardNumber: cardNumber,
        price: Number(newCard.price) || 0,
        foilPrice: Number(newCard.foilPrice) || 0,
        normalStock: Number(newCard.normalStock) || 0,
        foilStock: Number(newCard.foilStock) || 0,
        image: newCard.image || "",
        description: newCard.description || "",
        status: "approved",
      }

      console.log("📝 Creating card with data:", cardData)

      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData),
      })

      const data = await response.json()

      console.log("📝 Card creation response:", data)

      if (data.success) {
        toast({
          title: "✅ Carta Creada",
          description: `${newCard.name} agregada exitosamente`,
        })
        
        // Reset form
        setNewCard({
          name: "",
          set: "firstChapter",
          type: "character",
          rarity: "common",
          number: 0,
          cardNumber: "",
          price: 0,
          foilPrice: 0,
          normalStock: 0,
          foilStock: 0,
          image: "",
          description: "",
        })
        
        // Cerrar diálogo
        setShowAddCard(false)
        
        // Esperar un momento antes de refrescar para asegurar que la BD se actualizó
        setTimeout(async () => {
          await fetchInventory()
        }, 500)
      } else {
        console.error("❌ Error creating card:", data)
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || data.details || "Failed to create card",
        })
      }
    } catch (error) {
      console.error("Error creating card:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create card",
      })
    } finally {
      setImporting(false)
    }
  }

  // Filter inventory
  const filteredInventory = useMemo(() => {
    let filtered = inventory

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(lowerSearch) ||
        item.cardNumber?.toLowerCase().includes(lowerSearch) ||
        (item.set && item.set.toLowerCase().includes(lowerSearch))
      )
    }

    // Product Type filter
    if (filters.productType !== "all") {
      filtered = filtered.filter(item => {
        const productType = item.productType || "card"
        return productType === filters.productType
      })
    }

    // Set filter
    if (filters.set !== "all") {
      filtered = filtered.filter(item => item.set === filters.set)
    }

    // Type filter (solo para cartas)
    if (filters.type !== "all") {
      filtered = filtered.filter(item => {
        const productType = item.productType || "card"
        return productType === "card" && item.type === filters.type
      })
    }

    // Rarity filter
    if (filters.rarity !== "all") {
      filtered = filtered.filter(item => item.rarity === filters.rarity)
    }

    // Stock status filter
    if (filters.stockStatus !== "all") {
      filtered = filtered.filter(item => {
        const totalStock = item.normalStock + item.foilStock
        if (filters.stockStatus === "outOfStock") return totalStock === 0
        if (filters.stockStatus === "lowStock") return totalStock > 0 && totalStock < 5
        if (filters.stockStatus === "inStock") return totalStock >= 5
        return true
      })
    }

    // Stock type filter (Normal/Foil)
    if (filters.stockType !== "all") {
      filtered = filtered.filter(item => {
        const hasNormal = item.normalStock > 0
        const hasFoil = item.foilStock > 0
        if (filters.stockType === "hasNormal") return hasNormal
        if (filters.stockType === "hasFoil") return hasFoil
        if (filters.stockType === "hasBoth") return hasNormal && hasFoil
        return true
      })
    }

    // Ordenar por set y luego por número de carta
    filtered.sort((a, b) => {
      // Primero ordenar por set (manejar null/undefined)
      const setA = String(a.set || "")
      const setB = String(b.set || "")
      if (setA !== setB) {
        return setA.localeCompare(setB)
      }
      // Luego por número de carta
      return (a.number || 0) - (b.number || 0)
    })

    return filtered
  }, [inventory, searchTerm, filters])

  // Calculate totals
  const totals = useMemo(() => {
    return filteredInventory.reduce((acc, item) => ({
      normal: acc.normal + (item.normalStock || 0),
      foil: acc.foil + (item.foilStock || 0),
      value: acc.value + (item.normalStock * item.price) + (item.foilStock * item.foilPrice),
    }), { normal: 0, foil: 0, value: 0 })
  }, [filteredInventory])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AdminHeader title={t("inventoryManagement")} />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">{t("loading")}</div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <AdminHeader title={t("inventoryManagement")} />
        <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-sans text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            <Package className="inline-block mr-3 h-8 w-8 text-primary" />
            {t("inventoryManagement")}
          </h1>
          <p className="text-muted-foreground">{t("inventoryDescription")}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalCards")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredInventory.length}</div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("normalStock")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{totals.normal}</div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("foilStock")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{totals.foil}</div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("inventoryValue")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">${Math.floor(totals.value).toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          {/* First Row: Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchInventory")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Second Row: Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Set Filter */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">{t("set")}</Label>
              <Select value={filters.set} onValueChange={(value) => setFilters({ ...filters, set: value })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("allStock")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allSets")}</SelectItem>
                  <SelectItem value="firstChapter">{t("firstChapter")}</SelectItem>
                  <SelectItem value="riseOfFloodborn">{t("riseOfFloodborn")}</SelectItem>
                  <SelectItem value="intoInklands">{t("intoInklands")}</SelectItem>
                  <SelectItem value="ursulaReturn">{t("ursulaReturn")}</SelectItem>
                  <SelectItem value="shimmering">{t("shimmering")}</SelectItem>
                  <SelectItem value="azurite">{t("azurite")}</SelectItem>
                  <SelectItem value="archazia">Set 7 - Archazia's Island</SelectItem>
                  <SelectItem value="reignOfJafar">Set 8 - Reign of Jafar</SelectItem>
                  <SelectItem value="fabled">Set 9 - Fabled</SelectItem>
                  <SelectItem value="whi">{t("whispersInTheWell")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Product Type Filter */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Tipo de Producto</Label>
              <Select value={filters.productType} onValueChange={(value) => setFilters({ ...filters, productType: value })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="card">Cartas</SelectItem>
                  <SelectItem value="booster">Boosters</SelectItem>
                  <SelectItem value="playmat">Play Mats</SelectItem>
                  <SelectItem value="sleeves">Fundas</SelectItem>
                  <SelectItem value="deckbox">Deck Boxes</SelectItem>
                  <SelectItem value="dice">Dados</SelectItem>
                  <SelectItem value="accessory">Accesorios</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter (solo para cartas) */}
            {(!filters.productType || filters.productType === "all" || filters.productType === "card") && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">{t("type")}</Label>
                <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t("allTypes")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allTypes")}</SelectItem>
                    <SelectItem value="character">{t("character")}</SelectItem>
                    <SelectItem value="action">{t("action")}</SelectItem>
                    <SelectItem value="item">{t("item")}</SelectItem>
                    <SelectItem value="song">{t("song")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Rarity Filter */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">{t("rarity")}</Label>
              <Select value={filters.rarity} onValueChange={(value) => setFilters({ ...filters, rarity: value })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("allRarities")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allRarities")}</SelectItem>
                  <SelectItem value="common">{t("common")}</SelectItem>
                  <SelectItem value="uncommon">{t("uncommon")}</SelectItem>
                  <SelectItem value="rare">{t("rare")}</SelectItem>
                  <SelectItem value="superRare">{t("superRare")}</SelectItem>
                  <SelectItem value="legendary">{t("legendary")}</SelectItem>
                  <SelectItem value="enchanted">{t("enchanted")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stock Status Filter */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">{t("stockStatus")}</Label>
              <Select value={filters.stockStatus} onValueChange={(value) => setFilters({ ...filters, stockStatus: value })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("allStock")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allStockStatus")}</SelectItem>
                  <SelectItem value="inStock">{t("inStock")} (≥5)</SelectItem>
                  <SelectItem value="lowStock">{t("lowStock")} (&lt;5)</SelectItem>
                  <SelectItem value="outOfStock">{t("outOfStockBadge")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stock Type Filter (Normal/Foil) */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">{t("stockType")}</Label>
              <Select value={filters.stockType} onValueChange={(value) => setFilters({ ...filters, stockType: value })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("allTypes")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allTypes")}</SelectItem>
                  <SelectItem value="hasNormal">{t("hasNormal")}</SelectItem>
                  <SelectItem value="hasFoil">{t("hasFoil")}</SelectItem>
                  <SelectItem value="hasBoth">{t("hasBoth")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters Button */}
            <div className="flex items-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSearchTerm("")
                  setFilters({
                    set: "all",
                    type: "all",
                    rarity: "all",
                    productType: "all",
                    stockStatus: "all",
                    stockType: "all",
                  })
                }}
                className="h-9 w-full"
              >
                {t("clearFilters")}
              </Button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-muted-foreground">
            {t("showingCards")} {filteredInventory.length} {t("ofCards")} {inventory.length} {t("cards")}
          </p>
          <div className="flex gap-3">
            <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
              <DialogTrigger asChild>
                <Button variant="default" className="whitespace-nowrap">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Carta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Agregar Nueva Carta</DialogTitle>
                  <DialogDescription>
                    Completa los campos para agregar una nueva carta al inventario
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Nombre de la Carta *</Label>
                    <Input
                      value={newCard.name}
                      onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                      placeholder="Ej: Mickey Mouse - Brave Little Tailor"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Set *</Label>
                      <Select value={newCard.set} onValueChange={(value) => setNewCard({ ...newCard, set: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar Set" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="firstChapter">First Chapter</SelectItem>
                          <SelectItem value="riseOfFloodborn">Rise of Floodborn</SelectItem>
                          <SelectItem value="intoInklands">Into the Inklands</SelectItem>
                          <SelectItem value="ursulaReturn">Ursula's Return</SelectItem>
                          <SelectItem value="shimmering">Shimmering Skies</SelectItem>
                          <SelectItem value="azurite">Azurite</SelectItem>
                          <SelectItem value="archazia">Set 7 - Archazia's Island</SelectItem>
                          <SelectItem value="reignOfJafar">Set 8 - Reign of Jafar</SelectItem>
                          <SelectItem value="fabled">Set 9 - Fabled</SelectItem>
                          <SelectItem value="whi">Whispers in the Well</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tipo *</Label>
                      <Select value={newCard.type} onValueChange={(value: any) => setNewCard({ ...newCard, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="character">Character</SelectItem>
                          <SelectItem value="action">Action</SelectItem>
                          <SelectItem value="item">Item</SelectItem>
                          <SelectItem value="song">Song</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Rareza *</Label>
                      <Select value={newCard.rarity} onValueChange={(value: any) => setNewCard({ ...newCard, rarity: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="common">Common</SelectItem>
                          <SelectItem value="uncommon">Uncommon</SelectItem>
                          <SelectItem value="rare">Rare</SelectItem>
                          <SelectItem value="superRare">Super Rare</SelectItem>
                          <SelectItem value="legendary">Legendary</SelectItem>
                          <SelectItem value="enchanted">Enchanted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Número de Carta</Label>
                      <Input
                        type="number"
                        value={newCard.number}
                        onChange={(e) => setNewCard({ ...newCard, number: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Card Number (ej: 001/204)</Label>
                    <Input
                      value={newCard.cardNumber || ""}
                      onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value })}
                      placeholder="001/204"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Precio Normal *</Label>
                      <Input
                        type="number"
                        value={newCard.price}
                        onChange={(e) => setNewCard({ ...newCard, price: Number(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Precio Foil</Label>
                      <Input
                        type="number"
                        value={newCard.foilPrice}
                        onChange={(e) => setNewCard({ ...newCard, foilPrice: Number(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Stock Normal</Label>
                      <Input
                        type="number"
                        value={newCard.normalStock}
                        onChange={(e) => setNewCard({ ...newCard, normalStock: Number(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Stock Foil</Label>
                      <Input
                        type="number"
                        value={newCard.foilStock}
                        onChange={(e) => setNewCard({ ...newCard, foilStock: Number(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>URL de Imagen</Label>
                    <Input
                      value={newCard.image || ""}
                      onChange={(e) => setNewCard({ ...newCard, image: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label>Descripción</Label>
                    <Textarea
                      value={newCard.description || ""}
                      onChange={(e) => setNewCard({ ...newCard, description: e.target.value })}
                      placeholder="Descripción de la carta..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddCard(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateCard} disabled={importing}>
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Agregar Carta
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
              <DialogTrigger asChild>
                <Button variant="default" className="whitespace-nowrap">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Producto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Producto</DialogTitle>
                  <DialogDescription>
                    Completa los campos para agregar un nuevo producto al inventario
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Nombre del Producto *</Label>
                    <Input
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      placeholder="Ej: Booster Pack Set 1"
                    />
                  </div>
                  <div>
                    <Label>Tipo de Producto *</Label>
                    <Select
                      value={newProduct.productType}
                      onValueChange={(value: any) => setNewProduct({ ...newProduct, productType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="booster">Booster</SelectItem>
                        <SelectItem value="playmat">Play Mat</SelectItem>
                        <SelectItem value="sleeves">Fundas (Sleeves)</SelectItem>
                        <SelectItem value="deckbox">Deck Box</SelectItem>
                        <SelectItem value="dice">Dados</SelectItem>
                        <SelectItem value="accessory">Accesorio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Precio *</Label>
                      <Input
                        type="number"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Stock *</Label>
                      <Input
                        type="number"
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>URL de Imagen</Label>
                    <Input
                      value={newProduct.image}
                      onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label>Descripción</Label>
                    <Textarea
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                      placeholder="Descripción del producto..."
                      rows={3}
                    />
                  </div>
                  {newProduct.productType === "booster" && (
                    <>
                      <div>
                        <Label>Set</Label>
                        <Select value={newProduct.set} onValueChange={(value) => setNewProduct({ ...newProduct, set: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar Set" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="firstChapter">First Chapter</SelectItem>
                            <SelectItem value="riseOfFloodborn">Rise of Floodborn</SelectItem>
                            <SelectItem value="intoInklands">Into the Inklands</SelectItem>
                            <SelectItem value="ursulaReturn">Ursula's Return</SelectItem>
                            <SelectItem value="shimmering">Shimmering Skies</SelectItem>
                            <SelectItem value="azurite">Azurite</SelectItem>
                            <SelectItem value="archazia">Set 7 - Archazia's Island</SelectItem>
                            <SelectItem value="reignOfJafar">Set 8 - Reign of Jafar</SelectItem>
                            <SelectItem value="fabled">Set 9 - Fabled</SelectItem>
                            <SelectItem value="whi">Whispers in the Well</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Cartas por Booster</Label>
                        <Input
                          type="number"
                          value={newProduct.cardsPerPack}
                          onChange={(e) => setNewProduct({ ...newProduct, cardsPerPack: Number(e.target.value) })}
                          placeholder="12"
                        />
                      </div>
                    </>
                  )}
                  {newProduct.productType === "playmat" && (
                    <>
                      <div>
                        <Label>Material</Label>
                        <Input
                          value={newProduct.material}
                          onChange={(e) => setNewProduct({ ...newProduct, material: e.target.value })}
                          placeholder="Ej: Neopreno"
                        />
                      </div>
                      <div>
                        <Label>Tamaño</Label>
                        <Input
                          value={newProduct.size}
                          onChange={(e) => setNewProduct({ ...newProduct, size: e.target.value })}
                          placeholder="Ej: 24x14 inches"
                        />
                      </div>
                    </>
                  )}
                  {newProduct.productType === "sleeves" && (
                    <>
                      <div>
                        <Label>Cantidad de Fundas</Label>
                        <Input
                          type="number"
                          value={newProduct.count}
                          onChange={(e) => setNewProduct({ ...newProduct, count: Number(e.target.value) })}
                          placeholder="50"
                        />
                      </div>
                      <div>
                        <Label>Tamaño</Label>
                        <Input
                          value={newProduct.size}
                          onChange={(e) => setNewProduct({ ...newProduct, size: e.target.value })}
                          placeholder="Ej: Standard, Japanese"
                        />
                      </div>
                    </>
                  )}
                  {newProduct.productType === "deckbox" && (
                    <>
                      <div>
                        <Label>Capacidad (cartas)</Label>
                        <Input
                          type="number"
                          value={newProduct.capacity}
                          onChange={(e) => setNewProduct({ ...newProduct, capacity: Number(e.target.value) })}
                          placeholder="60"
                        />
                      </div>
                      <div>
                        <Label>Material</Label>
                        <Input
                          value={newProduct.material}
                          onChange={(e) => setNewProduct({ ...newProduct, material: e.target.value })}
                          placeholder="Ej: Plástico, Cuero"
                        />
                      </div>
                    </>
                  )}
                  {newProduct.productType === "dice" && (
                    <>
                      <div>
                        <Label>Cantidad de Dados</Label>
                        <Input
                          type="number"
                          value={newProduct.count}
                          onChange={(e) => setNewProduct({ ...newProduct, count: Number(e.target.value) })}
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <Label>Color</Label>
                        <Input
                          value={newProduct.color}
                          onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
                          placeholder="Ej: Rojo, Azul"
                        />
                      </div>
                    </>
                  )}
                  {newProduct.productType === "accessory" && (
                    <div>
                      <Label>Categoría</Label>
                      <Input
                        value={newProduct.category}
                        onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                        placeholder="Ej: Organizador, Token"
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddProduct(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateProduct} disabled={importing}>
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      "Crear Producto"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button 
              onClick={handleImportCards} 
              disabled={importing}
              variant="outline"
              className="whitespace-nowrap"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("importing")}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {t("importCards")}
                </>
              )}
            </Button>
            <Button 
              onClick={handleSaveAll} 
              disabled={editedCards.size === 0 || savingAll}
              className="whitespace-nowrap"
            >
              {savingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t("saveAll")} ({editedCards.size})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="rounded-lg border border-primary/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-card/50 border-b border-primary/20">
                <tr>
                  <th className="text-left p-4 font-semibold">{t("name")}</th>
                  <th className="text-left p-4 font-semibold">{t("type")}</th>
                  <th className="text-left p-4 font-semibold">{t("rarity")}</th>
                  <th className="text-left p-4 font-semibold">{t("set")}</th>
                  <th className="text-center p-4 font-semibold">{t("cardNum")}</th>
                  <th className="text-right p-4 font-semibold">{t("price")}</th>
                  <th className="text-center p-4 font-semibold">{t("normalStock")}</th>
                  <th className="text-center p-4 font-semibold">{t("foilStock")}</th>
                  <th className="text-center p-4 font-semibold">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => {
                  const hasChanges = editedCards.has(item.id)
                  const changes = editedCards.get(item.id)
                  const displayNormalStock = changes?.normalStock !== undefined ? changes.normalStock : item.normalStock
                  const displayFoilStock = changes?.foilStock !== undefined ? changes.foilStock : item.foilStock
                  const displayPrice = changes?.price !== undefined ? changes.price : item.price
                  const displayFoilPrice = changes?.foilPrice !== undefined ? changes.foilPrice : item.foilPrice
                  const totalStock = displayNormalStock + displayFoilStock
                  const isOutOfStock = totalStock === 0
                  const isLowStock = totalStock > 0 && totalStock < 5

                  return (
                    <tr key={item.id} className={`border-b border-primary/10 hover:bg-card/30 ${hasChanges ? 'bg-primary/5' : ''}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-16 rounded overflow-hidden flex-shrink-0">
                            <Image
                              src={item.image || "/placeholder.svg"}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-semibold">{item.name}</div>
                            {isOutOfStock && (
                              <Badge variant="destructive" className="mt-1">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {t("outOfStockBadge")}
                              </Badge>
                            )}
                            {isLowStock && (
                              <Badge className="mt-1 bg-orange-500 hover:bg-orange-600 text-white border-orange-600">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {t("lowStockBadge")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" className="capitalize">{item.type}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="capitalize">{item.rarity}</Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">{item.set}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-mono text-sm">{item.cardNumber || `#${item.number}`}</span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Normal:</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={displayPrice}
                              onChange={(e) => handlePriceChange(item.id, 'normal', e.target.value)}
                              className="w-20 h-7 text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Foil:</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={displayFoilPrice}
                              onChange={(e) => handlePriceChange(item.id, 'foil', e.target.value)}
                              className="w-20 h-7 text-sm"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Input
                          type="number"
                          min="0"
                          value={displayNormalStock}
                          onChange={(e) => handleStockChange(item.id, 'normal', e.target.value)}
                          className="w-20 text-center"
                        />
                      </td>
                      <td className="p-4">
                        <Input
                          type="number"
                          min="0"
                          value={displayFoilStock}
                          onChange={(e) => handleStockChange(item.id, 'foil', e.target.value)}
                          className="w-20 text-center"
                        />
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          size="sm"
                          onClick={() => handleSaveStock(item.id)}
                          disabled={!hasChanges || savingCard === item.id}
                          variant={hasChanges ? "default" : "outline"}
                        >
                          {savingCard === item.id ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              {t("saving")}
                            </>
                          ) : (
                            t("save")
                          )}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filteredInventory.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {t("noCardsSearch")}
          </div>
        )}
      </main>
      <Footer />
    </div>
    </AuthGuard>
  )
}

