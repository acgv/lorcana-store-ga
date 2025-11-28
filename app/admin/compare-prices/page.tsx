"use client"

import { useEffect, useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  const [filterSet, setFilterSet] = useState<string>("all")
  const [filterStock, setFilterStock] = useState<string>("all")
  const [filterPrice, setFilterPrice] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("comparison")

  const loadData = async () => {
    try {
      setRefreshing(true)
      
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

      // Cargar primera página para obtener información de paginación
      const firstPageResponse = await fetch("/api/admin/compare-prices?page=1&pageSize=50", {
        headers,
      })
      
      if (!firstPageResponse.ok) {
        const errorData = await firstPageResponse.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `HTTP ${firstPageResponse.status}`)
      }
      
      const firstPageResult = await firstPageResponse.json()

      if (!firstPageResult.success) {
        throw new Error(firstPageResult.error || "Failed to load comparison data")
      }

      const pagination = firstPageResult.data.pagination
      let allComparisons: ComparisonResult[] = [...firstPageResult.data.comparisons]
      let allCardsOnlyInAPI: Array<{ name: string; set: string; number: number; rarity: string }> = [
        ...firstPageResult.data.cardsOnlyInAPI,
      ]
      let allCardsOnlyInDB: Array<{ id: string; name: string; set: string }> = 
        firstPageResult.data.cardsOnlyInDB || []

      // Mostrar primera página inmediatamente
      const updateStats = () => ({
        totalInDatabase: pagination.totalInDatabase || firstPageResult.data.stats.totalInDatabase,
        totalInAPI: pagination.totalInAPI || firstPageResult.data.stats.totalInAPI,
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
      })

      setData({
        comparisons: allComparisons,
        cardsOnlyInAPI: allCardsOnlyInAPI,
        cardsOnlyInDB: allCardsOnlyInDB,
        stats: updateStats(),
      })

      setLoading(false) // Ya podemos mostrar los datos

      // Si hay más páginas, cargarlas en segundo plano y actualizar progresivamente
      if (pagination.hasMore && pagination.totalPages > 1) {

        // Cargar páginas restantes en paralelo (con límite para no sobrecargar)
        const pagesToLoad = Array.from({ length: pagination.totalPages - 1 }, (_, i) => i + 2)
        const batchSize = 5 // Cargar 5 páginas a la vez
        let lastPageData: any = null

        for (let i = 0; i < pagesToLoad.length; i += batchSize) {
          const batch = pagesToLoad.slice(i, i + batchSize)
          const batchPromises = batch.map(async (page) => {
            const response = await fetch(`/api/admin/compare-prices?page=${page}&pageSize=50`, {
              headers,
            })
            if (!response.ok) {
              console.warn(`Failed to load page ${page}`)
              return null
            }
            const result = await response.json()
            return result.success ? result.data : null
          })

          const batchResults = await Promise.all(batchPromises)
          
          batchResults.forEach((pageData, index) => {
            if (pageData) {
              allComparisons.push(...pageData.comparisons)
              allCardsOnlyInAPI.push(...pageData.cardsOnlyInAPI)
              
              // Guardar la última página para obtener cartas solo en BD
              const pageNum = batch[index]
              if (pageNum === pagination.totalPages) {
                lastPageData = pageData
              }
            }
          })

          // Actualizar UI con datos parciales inmediatamente
          setData({
            comparisons: [...allComparisons],
            cardsOnlyInAPI: [...allCardsOnlyInAPI],
            cardsOnlyInDB: [...allCardsOnlyInDB],
            stats: updateStats(),
          })

          // Mostrar progreso
          const currentPage = Math.min(i + batchSize, pagesToLoad.length)
          const totalPages = pagesToLoad.length
          toast({
            title: "Cargando...",
            description: `Página ${currentPage}/${totalPages} (${allComparisons.length} cartas cargadas)`,
            duration: 2000,
          })
        }

        // Obtener cartas solo en BD de la última página
        if (lastPageData && lastPageData.cardsOnlyInDB) {
          allCardsOnlyInDB = lastPageData.cardsOnlyInDB
        }

        // Actualización final con todos los datos
        setData({
          comparisons: allComparisons,
          cardsOnlyInAPI: allCardsOnlyInAPI,
          cardsOnlyInDB: allCardsOnlyInDB,
          stats: updateStats(),
        })

        toast({
          title: "✅ Carga completada",
          description: `Se procesaron ${allComparisons.length} cartas de ${pagination.totalPages} páginas`,
        })
      } else {
        // Si solo hay una página, ya está todo cargado
        toast({
          title: "✅ Datos cargados",
          description: `Se procesaron ${allComparisons.length} cartas`,
        })
      }
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

  useEffect(() => {
    loadData()
  }, [])

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

  // Mapeo de nombres de sets de la API/BD a valores normalizados del filtro
  const setValueMap: Record<string, string> = {
    // Valores de la BD
    'firstChapter': 'firstChapter',
    'riseOfFloodborn': 'riseOfFloodborn',
    'intoInklands': 'intoInklands',
    'ursulaReturn': 'ursulaReturn',
    'shimmering': 'shimmering',
    'azurite': 'azurite',
    'archazia': 'archazia',
    'reignOfJafar': 'reignOfJafar',
    'fabled': 'fabled',
    'whi': 'whi',
    'whisper': 'whi',
    // Valores de la API (nombres completos)
    'The First Chapter': 'firstChapter',
    'Rise of the Floodborn': 'riseOfFloodborn',
    'Into the Inklands': 'intoInklands',
    "Ursula's Return": 'ursulaReturn',
    'Shimmering Skies': 'shimmering',
    'Azurite Sea': 'azurite',
    "Archazia's Island": 'archazia',
    'Reign of Jafar': 'reignOfJafar',
    'Fabled': 'fabled',
    'Whispers in the Well': 'whi',
  }

  // Normalizar nombre de set a valor del filtro
  const normalizeSetToFilterValue = (set: string): string => {
    if (!set) return ''
    const trimmed = set.trim()
    
    // Primero verificar coincidencia exacta (case sensitive)
    if (setValueMap[trimmed]) {
      return setValueMap[trimmed]
    }
    
    // Luego verificar coincidencia exacta (case insensitive)
    const lowerTrimmed = trimmed.toLowerCase()
    for (const [key, value] of Object.entries(setValueMap)) {
      if (key.toLowerCase() === lowerTrimmed) {
        return value
      }
    }
    
    // Finalmente, buscar por coincidencia parcial
    for (const [key, value] of Object.entries(setValueMap)) {
      const lowerKey = key.toLowerCase()
      if (lowerTrimmed.includes(lowerKey) || lowerKey.includes(lowerTrimmed)) {
        return value
      }
    }
    
    // Si no se encuentra, devolver el original (puede que ya sea un valor del filtro)
    return trimmed
  }

  // Filtrar comparaciones
  const filteredComparisons = data?.comparisons.filter((comp) => {
    // Búsqueda por nombre
    if (searchTerm && !comp.cardName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }

    // Filtro por rareza
    if (filterRarity !== "all" && comp.rarity !== filterRarity) {
      return false
    }

    // Filtro por set (normalizar para comparar)
    if (filterSet !== "all") {
      const compSetNormalized = normalizeSetToFilterValue(comp.set)
      // Debug: solo en desarrollo
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
        console.log('Filtro set:', { filterSet, compSet: comp.set, normalized: compSetNormalized })
      }
      if (compSetNormalized !== filterSet) {
        return false
      }
    }

    // Filtro por stock
    if (filterStock === "with" && !comp.hasStock) return false
    if (filterStock === "without" && comp.hasStock) return false

    // Filtro por precio
    if (filterPrice === "needs-update" && !comp.needsPriceUpdate) return false
    if (filterPrice === "higher" && comp.priceDifferencePercent <= 0) return false
    if (filterPrice === "lower" && comp.priceDifferencePercent >= 0) return false

    return true
  }) || []



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

