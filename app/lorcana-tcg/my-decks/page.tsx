"use client"

import { useEffect, useState, Suspense, useMemo } from "react"
import { useRouter } from "next/navigation"
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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { 
  BookOpen, 
  Plus, 
  List, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  Info,
  Users,
  Target,
  Zap,
  Search,
  X,
  Save,
  Trash2,
  Edit,
  Copy,
  Minus
} from "lucide-react"
import Link from "next/link"
import type { Card as CardType } from "@/lib/types"

interface DeckCard {
  cardId: string
  card: CardType
  quantity: number
}

interface SavedDeck {
  id: string
  name: string
  cards: DeckCard[]
  createdAt: string
  updatedAt: string
}

function DeckBuilder() {
  const { t } = useLanguage()
  const { user } = useUser()
  const { collection, loading: collectionLoading } = useCollection()
  const { toast } = useToast()
  
  const [currentDeck, setCurrentDeck] = useState<DeckCard[]>([])
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSet, setSelectedSet] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedColor, setSelectedColor] = useState<string>("all")
  const [deckName, setDeckName] = useState("")
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null)
  const [availableCards, setAvailableCards] = useState<CardType[]>([])
  const [loadingCards, setLoadingCards] = useState(false)

  // Cargar mazos guardados
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`decks_${user.id}`)
      if (saved) {
        try {
          setSavedDecks(JSON.parse(saved))
        } catch (e) {
          console.error("Error loading saved decks:", e)
        }
      }
    }
  }, [user?.id])

  // Cargar cartas disponibles de la colección
  useEffect(() => {
    const loadAvailableCards = async () => {
      if (!user?.id || collectionLoading) return
      
      setLoadingCards(true)
      try {
        // Obtener IDs de cartas en la colección (normalizar para comparación)
        const collectionCardIds = collection.map(item => {
          const id = item.card_id || ""
          // Normalizar: convertir a string y lowercase para comparación
          return id.toString().toLowerCase().trim()
        }).filter(id => id.length > 0)
        
        console.log("🔍 Collection card IDs:", collectionCardIds.slice(0, 10), `(${collectionCardIds.length} total)`)
        
        if (collectionCardIds.length === 0) {
          console.log("⚠️ No hay cartas en la colección")
          setAvailableCards([])
          setLoadingCards(false)
          return
        }

        // Cargar información de las cartas desde la API
        const response = await fetch(`/api/cards`)
        const data = await response.json()
        
        if (data.success && data.data) {
          console.log("📦 Cards loaded from API:", data.data.length)
          
          // Filtrar solo las cartas que están en la colección
          // Normalizar IDs para comparación
          const cards = data.data.filter((card: CardType) => {
            const cardId = card.id?.toString().toLowerCase().trim() || ""
            const matches = collectionCardIds.includes(cardId)
            return matches
          })
          
          console.log("✅ Matching cards found:", cards.length, "out of", collectionCardIds.length, "collection items")
          
          // Debug: Verificar si las cartas tienen inkColor
          const cardsWithColor = cards.filter((c: CardType) => (c as any).inkColor || (c as any).color)
          console.log("🎨 Cards with color:", cardsWithColor.length, "out of", cards.length)
          if (cards.length > 0) {
            console.log("🎨 Sample card colors:", cards.slice(0, 5).map((c: CardType) => ({
              id: c.id,
              name: c.name,
              inkColor: (c as any).inkColor,
              color: (c as any).color,
              hasColor: !!(c as any).inkColor || !!(c as any).color
            })))
          }
          
          if (cards.length === 0 && collectionCardIds.length > 0) {
            console.warn("⚠️ No se encontraron coincidencias. Sample collection IDs:", collectionCardIds.slice(0, 5))
            console.warn("⚠️ Sample card IDs from API:", data.data.slice(0, 5).map((c: CardType) => c.id))
          }
          
          setAvailableCards(cards)
        } else {
          console.error("❌ API response error:", data)
        }
      } catch (error) {
        console.error("❌ Error loading cards:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar las cartas",
          variant: "destructive"
        })
      } finally {
        setLoadingCards(false)
      }
    }

    loadAvailableCards()
  }, [user?.id, collection, collectionLoading, toast])

  // Filtrar cartas disponibles
  const filteredCards = useMemo(() => {
    let filtered = availableCards

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(card => 
        card.name.toLowerCase().includes(query) ||
        card.number?.toString().includes(query)
      )
    }

    if (selectedSet !== "all") {
      filtered = filtered.filter(card => card.set === selectedSet)
    }

    if (selectedType !== "all") {
      filtered = filtered.filter(card => card.type === selectedType)
    }

    if (selectedColor !== "all") {
      filtered = filtered.filter(card => {
        const cardColor = (card as any).inkColor || (card as any).color
        if (!cardColor) return false
        return String(cardColor).toLowerCase().trim() === selectedColor.toLowerCase().trim()
      })
    }

    return filtered
  }, [availableCards, searchQuery, selectedSet, selectedType, selectedColor])

  // Obtener sets únicos
  const availableSets = useMemo(() => {
    const sets = new Set(availableCards.map(card => card.set))
    return Array.from(sets).sort()
  }, [availableCards])

  // Obtener tipos únicos
  const availableTypes = useMemo(() => {
    const types = new Set(availableCards.map(card => card.type))
    return Array.from(types).sort()
  }, [availableCards])

  // Obtener colores únicos
  const availableColors = useMemo(() => {
    const colors = new Set(
      availableCards
        .map(card => {
          const color = (card as any).inkColor || (card as any).color
          return color ? String(color).trim() : null
        })
        .filter(color => color && color !== "" && color !== "null")
    )
    const sortedColors = Array.from(colors).sort()
    console.log("🎨 Available colors:", sortedColors, "from", availableCards.length, "cards")
    console.log("🎨 Sample cards with colors:", availableCards.slice(0, 5).map(c => ({
      name: c.name,
      inkColor: (c as any).inkColor,
      color: (c as any).color
    })))
    return sortedColors
  }, [availableCards])

  // Validar mazo
  const deckValidation = useMemo(() => {
    const totalCards = currentDeck.reduce((sum, item) => sum + item.quantity, 0)
    const colors = new Set(
      currentDeck
        .map(item => {
          const cardColor = (item.card as any).inkColor || (item.card as any).color
          return cardColor ? cardColor.toLowerCase() : null
        })
        .filter(color => color !== null)
    )
    
    const errors: string[] = []
    const warnings: string[] = []

    if (totalCards < 60) {
      errors.push(`El mazo tiene ${totalCards} cartas. Debe tener exactamente 60.`)
    } else if (totalCards > 60) {
      errors.push(`El mazo tiene ${totalCards} cartas. Debe tener exactamente 60.`)
    }

    if (colors.size > 2) {
      errors.push(`El mazo tiene ${colors.size} colores. Máximo 2 permitidos.`)
    }

    // Verificar máximo 4 copias por carta
    currentDeck.forEach(item => {
      if (item.quantity > 4) {
        errors.push(`${item.card.name}: máximo 4 copias permitidas (tienes ${item.quantity})`)
      }
    })

    return { errors, warnings, totalCards, colors: colors.size, isValid: errors.length === 0 }
  }, [currentDeck])

  // Agregar carta al mazo
  const addCardToDeck = (card: CardType) => {
    const existingIndex = currentDeck.findIndex(item => item.cardId === card.id)
    
    if (existingIndex >= 0) {
      // Ya existe, aumentar cantidad
      const newDeck = [...currentDeck]
      if (newDeck[existingIndex].quantity < 4) {
        newDeck[existingIndex].quantity += 1
        setCurrentDeck(newDeck)
      } else {
        toast({
          title: "Límite alcanzado",
          description: "Máximo 4 copias por carta",
          variant: "destructive"
        })
      }
    } else {
      // Nueva carta
      setCurrentDeck([...currentDeck, { cardId: card.id, card, quantity: 1 }])
    }
  }

  // Remover carta del mazo
  const removeCardFromDeck = (cardId: string) => {
    setCurrentDeck(currentDeck.filter(item => item.cardId !== cardId))
  }

  // Cambiar cantidad de carta
  const updateCardQuantity = (cardId: string, quantity: number) => {
    if (quantity <= 0) {
      removeCardFromDeck(cardId)
      return
    }
    if (quantity > 4) {
      toast({
        title: "Límite alcanzado",
        description: "Máximo 4 copias por carta",
        variant: "destructive"
      })
      return
    }

    const newDeck = currentDeck.map(item => 
      item.cardId === cardId ? { ...item, quantity } : item
    )
    setCurrentDeck(newDeck)
  }

  // Guardar mazo
  const saveDeck = () => {
    if (!deckName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Debes darle un nombre a tu mazo",
        variant: "destructive"
      })
      return
    }

    if (!deckValidation.isValid) {
      toast({
        title: "Mazo inválido",
        description: "Corrige los errores antes de guardar",
        variant: "destructive"
      })
      return
    }

    const newDeck: SavedDeck = {
      id: editingDeckId || `deck_${Date.now()}`,
      name: deckName.trim(),
      cards: currentDeck,
      createdAt: editingDeckId 
        ? savedDecks.find(d => d.id === editingDeckId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    let updatedDecks: SavedDeck[]
    if (editingDeckId) {
      updatedDecks = savedDecks.map(d => d.id === editingDeckId ? newDeck : d)
    } else {
      updatedDecks = [...savedDecks, newDeck]
    }

    setSavedDecks(updatedDecks)
    if (user?.id) {
      localStorage.setItem(`decks_${user.id}`, JSON.stringify(updatedDecks))
    }

    toast({
      title: "Mazo guardado",
      description: `"${newDeck.name}" ha sido guardado exitosamente`
    })

    // Limpiar
    setCurrentDeck([])
    setDeckName("")
    setEditingDeckId(null)
  }

  // Cargar mazo para editar
  const loadDeck = (deck: SavedDeck) => {
    setCurrentDeck(deck.cards)
    setDeckName(deck.name)
    setEditingDeckId(deck.id)
  }

  // Eliminar mazo
  const deleteDeck = (deckId: string) => {
    const updatedDecks = savedDecks.filter(d => d.id !== deckId)
    setSavedDecks(updatedDecks)
    if (user?.id) {
      localStorage.setItem(`decks_${user.id}`, JSON.stringify(updatedDecks))
    }
    toast({
      title: "Mazo eliminado",
      description: "El mazo ha sido eliminado"
    })
  }

  // Nuevo mazo
  const newDeck = () => {
    setCurrentDeck([])
    setDeckName("")
    setEditingDeckId(null)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Panel izquierdo: Cartas disponibles */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Cartas Disponibles</CardTitle>
            <CardDescription>
              Cartas de tu colección para agregar al mazo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Búsqueda y filtros */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar cartas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground/90">Set</Label>
                  <Select
                    value={selectedSet}
                    onValueChange={setSelectedSet}
                    disabled={availableSets.length === 0 || loadingCards}
                  >
                    <SelectTrigger className="bg-background/50 border-primary/30 hover:border-primary/50 transition-colors w-full">
                      <SelectValue placeholder="Todos los sets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los sets</SelectItem>
                      {availableSets.length > 0 && availableSets.map(set => (
                        <SelectItem key={set} value={set}>{set}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground/90">Tipo</Label>
                  <Select
                    value={selectedType}
                    onValueChange={setSelectedType}
                    disabled={availableTypes.length === 0 || loadingCards}
                  >
                    <SelectTrigger className="bg-background/50 border-primary/30 hover:border-primary/50 transition-colors w-full">
                      <SelectValue placeholder="Todos los tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      {availableTypes.length > 0 && availableTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground/90">Color</Label>
                  <Select
                    value={selectedColor}
                    onValueChange={setSelectedColor}
                    disabled={loadingCards}
                  >
                    <SelectTrigger className="bg-background/50 border-primary/30 hover:border-primary/50 transition-colors w-full">
                      <SelectValue placeholder={availableColors.length > 0 ? "Todos los colores" : "Sin colores disponibles"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los colores</SelectItem>
                      {availableColors.length > 0 ? (
                        availableColors.map(color => (
                          <SelectItem key={color} value={color}>{color}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="all" disabled>No hay colores disponibles</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Lista de cartas */}
            {loadingCards ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando cartas...
              </div>
            ) : collection.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground space-y-2">
                <p>No tienes cartas en tu colección.</p>
                <Link href="/lorcana-tcg/my-collection">
                  <Button variant="outline" size="sm" className="gap-2">
                    Ir a Mi Colección
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : availableCards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground space-y-2">
                <p>No se pudieron cargar las cartas de tu colección.</p>
                <p className="text-xs">Tienes {collection.length} cartas en tu colección, pero no se encontraron coincidencias.</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                  className="gap-2"
                >
                  Recargar
                </Button>
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron cartas con esos filtros.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto">
                {filteredCards.map(card => {
                  const inDeck = currentDeck.find(item => item.cardId === card.id)
                  const canAdd = !inDeck || inDeck.quantity < 4
                  
                  return (
                    <div
                      key={card.id}
                      className="relative border rounded-lg overflow-hidden hover:border-primary transition-colors cursor-pointer group"
                      onClick={() => canAdd && addCardToDeck(card)}
                    >
                      {card.image && (
                        <div className="aspect-[63/88] relative bg-muted">
                          <Image
                            src={card.image}
                            alt={card.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          />
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-xs font-semibold truncate">{card.name}</p>
                        <p className="text-xs text-muted-foreground">{card.set} • {card.number}</p>
                        {inDeck && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {inDeck.quantity}x
                          </Badge>
                        )}
                      </div>
                      {!canAdd && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <span className="text-xs font-semibold">Máx. 4</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Panel derecho: Mazo actual */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Mi Mazo</span>
              <Badge variant={deckValidation.isValid ? "default" : "destructive"}>
                {deckValidation.totalCards}/60
              </Badge>
            </CardTitle>
                      <CardDescription className="space-y-1">
                        <div>{deckValidation.colors} color(es) • {currentDeck.length} carta(s) única(s)</div>
                        {deckValidation.colors > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Array.from(new Set(
                              currentDeck
                                .map(item => {
                                  const cardColor = (item.card as any).inkColor || (item.card as any).color
                                  return cardColor ? cardColor : null
                                })
                                .filter(color => color !== null)
                            )).map(color => (
                              <Badge key={color} variant="outline" className="text-xs">
                                {color}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Validación */}
            {deckValidation.errors.length > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-semibold text-destructive">Errores:</span>
                </div>
                <ul className="text-xs text-destructive space-y-1">
                  {deckValidation.errors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Nombre del mazo */}
            <div>
              <Input
                placeholder="Nombre del mazo..."
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
              />
            </div>

            {/* Lista de cartas en el mazo */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {currentDeck.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Agrega cartas desde el panel izquierdo
                </p>
              ) : (
                currentDeck.map(item => (
                  <div
                    key={item.cardId}
                    className="flex items-center gap-2 p-2 border rounded-lg"
                  >
                    {item.card.image && (
                      <div className="w-12 h-16 relative rounded overflow-hidden bg-muted flex-shrink-0">
                        <Image
                          src={item.card.image}
                          alt={item.card.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{item.card.name}</p>
                      <p className="text-xs text-muted-foreground">{item.card.set}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateCardQuantity(item.cardId, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateCardQuantity(item.cardId, item.quantity + 1)}
                        disabled={item.quantity >= 4}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeCardFromDeck(item.cardId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2">
              <Button
                onClick={saveDeck}
                disabled={!deckValidation.isValid || !deckName.trim()}
                className="flex-1 gap-2"
              >
                <Save className="h-4 w-4" />
                {editingDeckId ? "Actualizar" : "Guardar"}
              </Button>
              <Button
                variant="outline"
                onClick={newDeck}
                disabled={currentDeck.length === 0}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mazos guardados */}
        {savedDecks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Mis Mazos Guardados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {savedDecks.map(deck => (
                <div
                  key={deck.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{deck.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {deck.cards.reduce((sum, c) => sum + c.quantity, 0)} cartas • {new Date(deck.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => loadDeck(deck)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteDeck(deck.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function MyDecksContent() {
  const { t } = useLanguage()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [activeTab, setActiveTab] = useState("guide")

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/lorcana-tcg/login")
    }
  }, [user, userLoading, router])

  if (userLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!user) {
    return null // Será redirigido
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="font-display text-4xl md:text-5xl lg:text-7xl font-black text-balance tracking-tight leading-none mb-2">
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Mis Mazos
            </span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Aprende a armar mazos y crea los tuyos para jugar Lorcana
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="guide" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Guía de Mazos
            </TabsTrigger>
            <TabsTrigger value="builder" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Crear Mazo
            </TabsTrigger>
          </TabsList>

          {/* Tab: Guía de Mazos */}
          <TabsContent value="guide" className="space-y-6">
            {/* Introducción */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  ¿Qué es un Mazo?
                </CardTitle>
                <CardDescription>
                  Aprende los conceptos básicos para armar tu primer mazo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground">
                  Un <strong>mazo</strong> es un conjunto de cartas que usas para jugar una partida de Disney Lorcana TCG. 
                  Cada mazo debe cumplir ciertas reglas para ser válido en el juego.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">
                    <strong>💡 Tip:</strong> Un buen mazo tiene una estrategia clara y cartas que trabajan juntas 
                    para lograr tu objetivo de victoria.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Reglas Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Reglas Básicas de un Mazo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">60 Cartas Exactas</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tu mazo debe tener exactamente <strong>60 cartas</strong>. No más, no menos.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Máximo 4 Copias</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Puedes incluir hasta <strong>4 copias</strong> de la misma carta (excepto cartas únicas).
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">2 Colores Máximo</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tu mazo puede usar hasta <strong>2 colores</strong> (ink types) diferentes.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Sin Límite de Rareza</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Puedes usar cualquier rareza (Common, Rare, Legendary, etc.) sin restricciones.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tipos de Mazos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5 text-primary" />
                  Tipos de Mazos
                </CardTitle>
                <CardDescription>
                  Diferentes estrategias para diferentes estilos de juego
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">⚔️ Mazo Agresivo (Aggro)</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Enfocado en atacar rápidamente y ganar antes de que el oponente se establezca.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Cartas de bajo costo</Badge>
                      <Badge variant="outline">Muchos personajes</Badge>
                      <Badge variant="outline">Ataque rápido</Badge>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">🛡️ Mazo Control</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Controla el juego, elimina amenazas y gana con cartas poderosas al final.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Eliminación</Badge>
                      <Badge variant="outline">Cartas de alto costo</Badge>
                      <Badge variant="outline">Control del campo</Badge>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">⚖️ Mazo Midrange</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Balance entre agresión temprana y poder tardío. Versátil y adaptable.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Balanceado</Badge>
                      <Badge variant="outline">Versátil</Badge>
                      <Badge variant="outline">Adaptable</Badge>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">🎯 Mazo Combo</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Construido alrededor de una combinación específica de cartas para ganar.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Sinergias</Badge>
                      <Badge variant="outline">Combinaciones</Badge>
                      <Badge variant="outline">Cartas clave</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Consejos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  Consejos para Armar tu Primer Mazo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 list-decimal list-inside">
                  <li className="text-foreground">
                    <strong>Elige 1-2 colores:</strong> Comienza con colores que te gusten o que tengan sinergia.
                  </li>
                  <li className="text-foreground">
                    <strong>Define tu estrategia:</strong> ¿Quieres atacar rápido, controlar o hacer combos?
                  </li>
                  <li className="text-foreground">
                    <strong>Curva de costos:</strong> Incluye cartas de diferentes costos (bajo, medio, alto).
                  </li>
                  <li className="text-foreground">
                    <strong>Usa 4 copias de tus cartas clave:</strong> Aumenta la consistencia de tu mazo.
                  </li>
                  <li className="text-foreground">
                    <strong>Prueba y ajusta:</strong> Juega con tu mazo y ajusta según lo que funcione.
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* CTA para crear mazo */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold">¿Listo para crear tu primer mazo?</h3>
                  <p className="text-muted-foreground">
                    Usa las cartas de tu colección para armar un mazo personalizado
                  </p>
                  <Button 
                    onClick={() => setActiveTab("builder")}
                    className="gap-2"
                  >
                    Crear Mi Primer Mazo
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Constructor de Mazos */}
          <TabsContent value="builder" className="space-y-6">
            <DeckBuilder />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  )
}

export default function MyDecksPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <MyDecksContent />
    </Suspense>
  )
}

