"use client"

import { useEffect, useState, useMemo } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Download,
  Search,
  Filter,
} from "lucide-react"
import Image from "next/image"

interface ComparisonResult {
  cardId: string
  cardName: string
  set: string
  number: number
  rarity: string
  type: string
  currentNormalStock: number
  currentFoilStock: number
  currentPrice: number
  currentFoilPrice: number
  marketPriceUSD: number | null
  marketFoilPriceUSD: number | null
  priceSource: "tcgplayer" | "standard"
  suggestedPriceCLP: number | null
  suggestedFoilPriceCLP: number | null
  priceDifference: number
  foilPriceDifference: number
  priceDifferencePercent: number
  foilPriceDifferencePercent: number
  hasStock: boolean
  needsPriceUpdate: boolean
  image: string
}

interface ComparisonData {
  comparisons: ComparisonResult[]
  cardsOnlyInAPI: Array<{ name: string; set: string; number: number; rarity: string }>
  cardsOnlyInDB: Array<{ id: string; name: string; set: string }>
  stats: {
    totalInDatabase: number
    totalInAPI: number
    totalCompared: number
    withStock: number
    withoutStock: number
    needsPriceUpdate: number
    onlyInAPI: number
    onlyInDB: number
    averagePriceDifference: number
  }
}

export default function ComparePricesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<ComparisonData | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRarity, setFilterRarity] = useState<string>("all")
  const [filterSet, setFilterSet] = useState<string>("firstChapter") // Por defecto set 1
  const [filterStock, setFilterStock] = useState<string>("all")
  const [filterPrice, setFilterPrice] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("comparison")

  // Parámetros de cálculo editables
  const [priceParams, setPriceParams] = useState({
    usTaxRate: 0.08,
    shippingUSD: 8,
    chileVATRate: 0.19,
    exchangeRate: 1000,
    profitMargin: 0.20,
    mercadoPagoFee: 0.034,
  })

  // Cargar parámetros desde localStorage al inicio
  useEffect(() => {
    const saved = localStorage.getItem("priceCalculationParams")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setPriceParams(parsed)
      } catch (e) {
        console.error("Error loading price params:", e)
      }
    }
  }, [])

  // Guardar parámetros en localStorage cuando cambien
  const updatePriceParam = (key: keyof typeof priceParams, value: number) => {
    const updated = { ...priceParams, [key]: value }
    setPriceParams(updated)
    localStorage.setItem("priceCalculationParams", JSON.stringify(updated))
  }

  const loadData = async (setFilter?: string) => {
    try {
      setRefreshing(true)
      setLoading(true)
      
      // Obtener token de sesión para autenticación
      const { supabase } = await import("@/lib/db")
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }

      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      // Construir URL con filtro de set y parámetros de cálculo
      const url = new URL("/api/admin/compare-prices", window.location.origin)
      const setToFilter = setFilter !== undefined ? setFilter : filterSet
      if (setToFilter && setToFilter !== "all") {
        url.searchParams.set("set", setToFilter)
        console.log(`🔍 Cargando datos para set: ${setToFilter}`)
      } else {
        console.log(`🔍 Cargando datos para todos los sets`)
      }
      
      // Agregar parámetros de cálculo de precios
      url.searchParams.set("usTaxRate", priceParams.usTaxRate.toString())
      url.searchParams.set("shippingUSD", priceParams.shippingUSD.toString())
      url.searchParams.set("chileVATRate", priceParams.chileVATRate.toString())
      url.searchParams.set("exchangeRate", priceParams.exchangeRate.toString())
      url.searchParams.set("profitMargin", priceParams.profitMargin.toString())
      url.searchParams.set("mercadoPagoFee", priceParams.mercadoPagoFee.toString())

      // Cargar todos los datos de una vez (igual que en catálogo)
      const response = await fetch(url.toString(), {
        headers,
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to load comparison data")
      }

      const allComparisons: ComparisonResult[] = result.data?.comparisons || []
      const allCardsOnlyInAPI: Array<{ name: string; set: string; number: number; rarity: string }> = 
        result.data?.cardsOnlyInAPI || []
      const allCardsOnlyInDB: Array<{ id: string; name: string; set: string }> = 
        result.data?.cardsOnlyInDB || []

      // Calcular estadísticas
      const stats = {
        totalInDatabase: result.data?.stats?.totalInDatabase || 0,
        totalInAPI: result.data?.stats?.totalInAPI || 0,
        totalCompared: allComparisons.length,
        withStock: allComparisons.filter((c) => c.hasStock).length,
        withoutStock: allComparisons.filter((c) => !c.hasStock).length,
        needsPriceUpdate: allComparisons.filter((c) => c.needsPriceUpdate).length,
        onlyInAPI: allCardsOnlyInAPI.length,
        onlyInDB: allCardsOnlyInDB.length,
        averagePriceDifference:
          allComparisons.length > 0
            ? Math.round(
                (allComparisons.reduce((sum, c) => sum + c.priceDifferencePercent, 0) /
                  allComparisons.length) *
                  100
              ) / 100
            : 0,
      }

      // Log temporal para ver qué valores de set vienen en los datos
      const uniqueSetsInData = [...new Set(allComparisons.map(c => c.set))].sort()
      console.log('🔍 Sets únicos en los datos cargados:', uniqueSetsInData)
      console.log('🔍 Muestra de datos (primeros 5):', allComparisons.slice(0, 5).map(c => ({
        name: c.cardName,
        set: c.set
      })))
      console.log(`✅ Comparaciones cargadas: ${allComparisons.length} cartas`)

      setData({
        comparisons: allComparisons,
        cardsOnlyInAPI: allCardsOnlyInAPI,
        cardsOnlyInDB: allCardsOnlyInDB,
        stats,
      })

      toast({
        title: "✅ Datos cargados",
        description: `Se procesaron ${allComparisons.length} cartas`,
      })
    } catch (error) {
      console.error("Error loading comparison data:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo cargar la comparativa",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Cargar datos cuando cambie el filtro de set (o carga inicial)
  useEffect(() => {
    console.log(`🔄 useEffect triggered - filterSet: ${filterSet}`)
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSet])

  // Mapeo de sets normalizados a nombres legibles
  const setDisplayNames: Record<string, string> = {
    'firstChapter': 'The First Chapter',
    'riseOfFloodborn': 'Rise of the Floodborn',
    'intoInklands': 'Into the Inklands',
    'ursulaReturn': "Ursula's Return",
    'shimmering': 'Shimmering Skies',
    'azurite': 'Azurite Sea',
    'archazia': "Archazia's Island",
    'reignOfJafar': 'Reign of Jafar',
    'fabled': 'Fabled',
    'whi': 'Whispers in the Well',
    'whisper': 'Whispers in the Well',
  }

  // Orden de sets por lanzamiento (1-10)
  const setOrder: Record<string, number> = {
    'firstChapter': 1,
    'riseOfFloodborn': 2,
    'intoInklands': 3,
    'ursulaReturn': 4,
    'shimmering': 5,
    'azurite': 6,
    'archazia': 7,
    'reignOfJafar': 8,
    'fabled': 9,
    'whi': 10,
    'whisper': 10,
  }

  // Filtrar comparaciones (exactamente igual que en catálogo y mi colección)
  const filteredComparisons = useMemo(() => {
    if (!data?.comparisons) return []
    
    // Debug: ver qué está pasando con el filtro
    if (filterSet !== "all") {
      const uniqueSets = [...new Set(data.comparisons.map(c => c.set))].sort()
      const matchingCards = data.comparisons.filter(c => c.set === filterSet)
      console.log('🔍 FILTRO SET DEBUG:', {
        filterSet,
        uniqueSetsInData: uniqueSets,
        totalCards: data.comparisons.length,
        matchingCards: matchingCards.length,
        sampleMatching: matchingCards.slice(0, 3).map(c => ({ name: c.cardName, set: c.set })),
        sampleNonMatching: data.comparisons.filter(c => c.set !== filterSet).slice(0, 3).map(c => ({ name: c.cardName, set: c.set }))
      })
    }
    
    return data.comparisons.filter((comp) => {
      // Búsqueda por nombre
      if (searchTerm && !comp.cardName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      // Filtro por rareza
      if (filterRarity !== "all" && comp.rarity !== filterRarity) {
        return false
      }

      // Filtro por set ya se aplica en el backend, pero mantenemos la validación por si acaso
      // (Los datos ya vienen filtrados del backend, así que esto no debería ser necesario)
      if (filterSet !== "all" && comp.set !== filterSet) {
        return false
      }

      // Filtro por stock
      if (filterStock === "with" && !comp.hasStock) return false
      if (filterStock === "without" && comp.hasStock) return false

      // Filtro por precio
      if (filterPrice === "needs-update" && !comp.needsPriceUpdate) return false
      if (filterPrice === "higher" && comp.priceDifferencePercent <= 0) return false
      if (filterPrice === "lower" && comp.priceDifferencePercent >= 0) return false

      return true
    })
  }, [data?.comparisons, searchTerm, filterRarity, filterSet, filterStock, filterPrice])



  if (loading) {
    return (
      <AuthGuard>
        <AdminHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <AdminHeader />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Comparativa de Precios y Stock</h1>
              <p className="text-muted-foreground">
                Compara tu inventario con los precios estándar de la API de Lorcana
              </p>
            </div>
            <Button onClick={loadData} disabled={refreshing}>
              {refreshing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </>
              )}
            </Button>
          </div>

          {/* Parámetros de Cálculo Editables */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Parámetros de Cálculo de Precios</CardTitle>
                  <CardDescription>
                    Edita los valores constantes utilizados para calcular los precios sugeridos
                  </CardDescription>
                </div>
                <Button 
                  onClick={loadData} 
                  disabled={refreshing}
                  variant="outline"
                  size="sm"
                >
                  {refreshing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Recalculando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Recalcular Precios
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="usTaxRate">Tax en EEUU (ej: 0.08)</Label>
                  <Input
                    id="usTaxRate"
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    value={priceParams.usTaxRate}
                    onChange={(e) => updatePriceParam("usTaxRate", parseFloat(e.target.value) || 0)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shippingUSD">Envío en USD</Label>
                  <Input
                    id="shippingUSD"
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceParams.shippingUSD}
                    onChange={(e) => updatePriceParam("shippingUSD", parseFloat(e.target.value) || 0)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chileVATRate">IVA Chile (19%)</Label>
                  <Input
                    id="chileVATRate"
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    value={priceParams.chileVATRate}
                    onChange={(e) => updatePriceParam("chileVATRate", parseFloat(e.target.value) || 0)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exchangeRate">Tipo de cambio USD→CLP</Label>
                  <Input
                    id="exchangeRate"
                    type="number"
                    step="1"
                    min="1"
                    value={priceParams.exchangeRate}
                    onChange={(e) => updatePriceParam("exchangeRate", parseFloat(e.target.value) || 0)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profitMargin">Ganancia deseada (ej: 0.20)</Label>
                  <Input
                    id="profitMargin"
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    value={priceParams.profitMargin}
                    onChange={(e) => updatePriceParam("profitMargin", parseFloat(e.target.value) || 0)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mercadoPagoFee">Comisión MercadoPago (ej: 0.034)</Label>
                  <Input
                    id="mercadoPagoFee"
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    value={priceParams.mercadoPagoFee}
                    onChange={(e) => updatePriceParam("mercadoPagoFee", parseFloat(e.target.value) || 0)}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estadísticas */}
          {data?.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{data.stats.totalInDatabase}</div>
                  <p className="text-xs text-muted-foreground">En BD</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{data.stats.totalInAPI}</div>
                  <p className="text-xs text-muted-foreground">En API</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{data.stats.withStock}</div>
                  <p className="text-xs text-muted-foreground">Con Stock</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-orange-500">
                    {data.stats.withoutStock}
                  </div>
                  <p className="text-xs text-muted-foreground">Sin Stock</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-red-500">
                    {data.stats.needsPriceUpdate}
                  </div>
                  <p className="text-xs text-muted-foreground">Precio a Actualizar</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-blue-500">
                    {data.stats.onlyInAPI}
                  </div>
                  <p className="text-xs text-muted-foreground">Solo en API</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-purple-500">
                    {data.stats.onlyInDB}
                  </div>
                  <p className="text-xs text-muted-foreground">Solo en BD</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">
                    {data.stats.averagePriceDifference > 0 ? "+" : ""}
                    {data.stats.averagePriceDifference.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">Diff. Promedio</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="comparison">Comparativa ({filteredComparisons.length})</TabsTrigger>
            <TabsTrigger value="only-api">
              Solo en API ({data?.cardsOnlyInAPI.length || 0})
            </TabsTrigger>
            <TabsTrigger value="only-db">
              Solo en BD ({data?.cardsOnlyInDB.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Tab: Comparativa */}
          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Comparativa de Precios y Stock</CardTitle>
                    <CardDescription>
                      Compara tus precios y stock con los estándares de la API
                    </CardDescription>
                  </div>
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar carta..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterRarity} onValueChange={setFilterRarity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Rareza" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las rarezas</SelectItem>
                      <SelectItem value="common">Common</SelectItem>
                      <SelectItem value="uncommon">Uncommon</SelectItem>
                      <SelectItem value="rare">Rare</SelectItem>
                      <SelectItem value="superRare">Super Rare</SelectItem>
                      <SelectItem value="legendary">Legendary</SelectItem>
                      <SelectItem value="enchanted">Enchanted</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterSet} onValueChange={setFilterSet}>
                    <SelectTrigger>
                      <SelectValue placeholder="Set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los sets</SelectItem>
                      <SelectItem value="firstChapter">Set 1 - The First Chapter</SelectItem>
                      <SelectItem value="riseOfFloodborn">Set 2 - Rise of the Floodborn</SelectItem>
                      <SelectItem value="intoInklands">Set 3 - Into the Inklands</SelectItem>
                      <SelectItem value="ursulaReturn">Set 4 - Ursula's Return</SelectItem>
                      <SelectItem value="shimmering">Set 5 - Shimmering Skies</SelectItem>
                      <SelectItem value="azurite">Set 6 - Azurite Sea</SelectItem>
                      <SelectItem value="archazia">Set 7 - Archazia's Island</SelectItem>
                      <SelectItem value="reignOfJafar">Set 8 - Reign of Jafar</SelectItem>
                      <SelectItem value="fabled">Set 9 - Fabled</SelectItem>
                      <SelectItem value="whi">Set 10 - Whispers in the Well</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStock} onValueChange={setFilterStock}>
                    <SelectTrigger>
                      <SelectValue placeholder="Stock" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todo el Stock</SelectItem>
                      <SelectItem value="with">Con stock</SelectItem>
                      <SelectItem value="without">Sin stock</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterPrice} onValueChange={setFilterPrice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Precio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los Precios</SelectItem>
                      <SelectItem value="needs-update">Necesita actualización</SelectItem>
                      <SelectItem value="higher">Más caro que estándar</SelectItem>
                      <SelectItem value="lower">Más barato que estándar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {filteredComparisons.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No se encontraron cartas con los filtros aplicados</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Imagen</TableHead>
                          <TableHead>Carta</TableHead>
                          <TableHead>Set</TableHead>
                          <TableHead>Rareza</TableHead>
                          <TableHead className="text-right">Stock Normal</TableHead>
                          <TableHead className="text-right">Stock Foil</TableHead>
                          <TableHead className="text-right">Precio Actual</TableHead>
                          <TableHead className="text-right">Precio TCGPlayer (USD)</TableHead>
                          <TableHead className="text-right">Precio Sugerido (CLP)</TableHead>
                          <TableHead className="text-right">Diferencia</TableHead>
                          <TableHead className="text-right">Precio Foil Actual</TableHead>
                          <TableHead className="text-right">Precio Foil TCGPlayer (USD)</TableHead>
                          <TableHead className="text-right">Precio Foil Sugerido (CLP)</TableHead>
                          <TableHead className="text-right">Diff. Foil</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredComparisons.map((comp) => (
                          <TableRow key={comp.cardId}>
                            <TableCell>
                              <div className="relative w-16 h-20">
                                <Image
                                  src={comp.image || "/placeholder.svg"}
                                  alt={comp.cardName}
                                  fill
                                  className="object-contain rounded"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{comp.cardName}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{comp.set}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{comp.rarity}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {comp.currentNormalStock > 0 ? (
                                <span className="text-green-600 font-semibold">
                                  {comp.currentNormalStock}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {comp.currentFoilStock > 0 ? (
                                <span className="text-green-600 font-semibold">
                                  {comp.currentFoilStock}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ${comp.currentPrice.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {comp.marketPriceUSD ? `$${comp.marketPriceUSD.toFixed(2)} USD` : "-"}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-blue-600">
                              {comp.suggestedPriceCLP ? `$${comp.suggestedPriceCLP.toLocaleString()}` : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {comp.priceDifferencePercent !== 0 && (
                                <div className="flex items-center justify-end gap-1">
                                  {comp.priceDifferencePercent > 0 ? (
                                    <TrendingUp className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4 text-green-500" />
                                  )}
                                  <span
                                    className={
                                      Math.abs(comp.priceDifferencePercent) > 5
                                        ? "font-bold text-red-500"
                                        : "text-muted-foreground"
                                    }
                                  >
                                    {comp.priceDifferencePercent > 0 ? "+" : ""}
                                    {comp.priceDifferencePercent.toFixed(1)}%
                                  </span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ${comp.currentFoilPrice.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {comp.marketFoilPriceUSD ? `$${comp.marketFoilPriceUSD.toFixed(2)} USD` : "-"}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-blue-600">
                              {comp.suggestedFoilPriceCLP ? `$${comp.suggestedFoilPriceCLP.toLocaleString()}` : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {comp.foilPriceDifferencePercent !== 0 && (
                                <div className="flex items-center justify-end gap-1">
                                  {comp.foilPriceDifferencePercent > 0 ? (
                                    <TrendingUp className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4 text-green-500" />
                                  )}
                                  <span
                                    className={
                                      Math.abs(comp.foilPriceDifferencePercent) > 5
                                        ? "font-bold text-red-500"
                                        : "text-muted-foreground"
                                    }
                                  >
                                    {comp.foilPriceDifferencePercent > 0 ? "+" : ""}
                                    {comp.foilPriceDifferencePercent.toFixed(1)}%
                                  </span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {comp.hasStock ? (
                                  <Badge variant="default" className="text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Con Stock
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Sin Stock
                                  </Badge>
                                )}
                                {comp.needsPriceUpdate && (
                                  <Badge variant="outline" className="text-xs border-orange-500">
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    Actualizar Precio
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Solo en API */}
          <TabsContent value="only-api">
            <Card>
              <CardHeader>
                <CardTitle>Cartas Solo en la API</CardTitle>
                <CardDescription>
                  Cartas que existen en la API de Lorcana pero no están en tu base de datos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data?.cardsOnlyInAPI.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>¡Excelente! Todas las cartas de la API están en tu base de datos</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Set</TableHead>
                          <TableHead>Número</TableHead>
                          <TableHead>Rareza</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.cardsOnlyInAPI.map((card, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{card.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{card.set}</Badge>
                            </TableCell>
                            <TableCell>{card.number}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{card.rarity}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Solo en BD */}
          <TabsContent value="only-db">
            <Card>
              <CardHeader>
                <CardTitle>Cartas Solo en tu Base de Datos</CardTitle>
                <CardDescription>
                  Cartas que están en tu BD pero no aparecen en la API de Lorcana
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data?.cardsOnlyInDB.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Todas tus cartas están en la API</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Set</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.cardsOnlyInDB.map((card) => (
                          <TableRow key={card.id}>
                            <TableCell className="font-mono text-xs">{card.id}</TableCell>
                            <TableCell className="font-medium">{card.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{card.set}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  )
}

