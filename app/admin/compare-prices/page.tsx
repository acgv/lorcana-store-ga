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
import { calculateFinalPrice } from "@/lib/price-calculator"

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
  const [updatingPrices, setUpdatingPrices] = useState<Set<string>>(new Set())
  const [updatingAll, setUpdatingAll] = useState(false)
  const [revertingSet, setRevertingSet] = useState(false)
  const [fetchingPrices, setFetchingPrices] = useState<Set<string>>(new Set())
  const [editingPrice, setEditingPrice] = useState<{ cardId: string; field: 'price' | 'foilPrice' | 'priceUSD' | 'foilPriceUSD' } | null>(null)
  const [editingPriceValue, setEditingPriceValue] = useState<string>("")

  // Parámetros de cálculo editables
  const [priceParams, setPriceParams] = useState({
    usTaxRate: 0.08,
    shippingUSD: 8,
    chileVATRate: 0.19,
    exchangeRate: 1000,
    profitMargin: 0.20,
    mercadoPagoFee: 0.034,
  })

  // Cargar parámetros desde la base de datos al inicio
  useEffect(() => {
    const loadPriceParams = async () => {
      try {
        const { supabase } = await import("@/lib/db")
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token

        const response = await fetch("/api/admin/price-calculation-settings", {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setPriceParams(result.data)
            // También guardar en localStorage como backup
            localStorage.setItem("priceCalculationParams", JSON.stringify(result.data))
            console.log("✅ Parámetros cargados desde BD:", result.data)
          }
        } else {
          // Fallback a localStorage si falla la BD
          const saved = localStorage.getItem("priceCalculationParams")
          if (saved) {
            try {
              const parsed = JSON.parse(saved)
              setPriceParams(parsed)
              console.log("⚠️ Usando parámetros de localStorage (fallback)")
            } catch (e) {
              console.error("Error loading price params:", e)
            }
          }
        }
      } catch (error) {
        console.error("Error loading price params from BD:", error)
        // Fallback a localStorage
        const saved = localStorage.getItem("priceCalculationParams")
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            setPriceParams(parsed)
          } catch (e) {
            console.error("Error loading price params:", e)
          }
        }
      }
    }

    loadPriceParams()
  }, [])

  // Guardar parámetros solo en localStorage cuando cambien
  // El guardado en BD se hace solo cuando se presiona "Recalcular Precios"
  const updatePriceParam = (key: keyof typeof priceParams, value: number) => {
    const updated = { ...priceParams, [key]: value }
    setPriceParams(updated)
    
    // Guardar solo en localStorage (no en BD para mejor performance)
    localStorage.setItem("priceCalculationParams", JSON.stringify(updated))
    console.log(`📝 Parámetro actualizado: ${key} = ${value}`)
  }

  const loadData = async (setFilter?: string) => {
    try {
      // Resetear estados de carga
      setRefreshing(true)
      setLoading(true)
      
      // Limpiar datos anteriores para mostrar que se está recargando
      setData(null)
      
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
      
      // Obtener parámetros actuales desde localStorage (siempre leer el más reciente)
      const savedParams = localStorage.getItem("priceCalculationParams")
      let currentParams = priceParams
      
      if (savedParams) {
        try {
          const parsed = JSON.parse(savedParams)
          currentParams = parsed
          // Sincronizar estado con localStorage si hay diferencia
          if (JSON.stringify(parsed) !== JSON.stringify(priceParams)) {
            console.log("🔄 Sincronizando parámetros desde localStorage:", parsed)
            setPriceParams(parsed)
          }
        } catch (e) {
          console.warn("⚠️ Error parseando parámetros desde localStorage:", e)
        }
      }

      // Agregar parámetros de cálculo de precios
      url.searchParams.set("usTaxRate", currentParams.usTaxRate.toString())
      url.searchParams.set("shippingUSD", currentParams.shippingUSD.toString())
      url.searchParams.set("chileVATRate", currentParams.chileVATRate.toString())
      url.searchParams.set("exchangeRate", currentParams.exchangeRate.toString())
      url.searchParams.set("profitMargin", currentParams.profitMargin.toString())
      url.searchParams.set("mercadoPagoFee", currentParams.mercadoPagoFee.toString())
      
      console.log("🔍 Enviando parámetros de cálculo:", currentParams)
      console.log("🔍 URL completa:", url.toString())

      // Cargar todos los datos de una vez (igual que en catálogo)
      const response = await fetch(url.toString(), {
        headers,
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` }
        }
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

      console.log(`📊 Datos recibidos de la API:`, {
        comparisons: allComparisons.length,
        cardsOnlyInAPI: allCardsOnlyInAPI.length,
        cardsOnlyInDB: allCardsOnlyInDB.length,
        stats: result.data?.stats,
      })

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
      if (allComparisons.length > 0) {
        const uniqueSetsInData = [...new Set(allComparisons.map(c => c.set))].sort()
        console.log('🔍 Sets únicos en los datos cargados:', uniqueSetsInData)
        console.log('🔍 Muestra de datos (primeros 5):', allComparisons.slice(0, 5).map(c => ({
          name: c.cardName,
          set: c.set,
          suggestedPrice: c.suggestedPriceCLP,
          currentPrice: c.currentPrice
        })))
      } else {
        console.warn("⚠️ No se encontraron comparaciones. Esto puede indicar que:")
        console.warn("  1. No hay cartas en la BD para el set filtrado")
        console.warn("  2. Los IDs de las cartas no coinciden entre API y BD")
        console.warn("  3. El filtro de set no está funcionando correctamente")
        console.warn(`📊 Cartas solo en API: ${allCardsOnlyInAPI.length}`)
        console.warn(`📊 Cartas solo en BD: ${allCardsOnlyInDB.length}`)
      }
      
      console.log(`✅ Comparaciones cargadas: ${allComparisons.length} cartas`)

      // Cargar precios buscados previamente desde localStorage
      const savedPrices = localStorage.getItem("searchedCardPrices")
      let pricesCache: Record<string, any> = {}
      
      if (savedPrices) {
        try {
          pricesCache = JSON.parse(savedPrices)
          console.log(`📥 Cargando ${Object.keys(pricesCache).length} precios guardados desde localStorage`)
        } catch (e) {
          console.warn("⚠️ Error parseando precios guardados:", e)
        }
      }

      // Fusionar precios guardados con los datos cargados y recalcular precios sugeridos
      const mergedComparisons = allComparisons.map((comp) => {
        const savedPrice = pricesCache[comp.cardId]
        let updatedComp = { ...comp }
        
        // Si hay precio guardado y tiene menos de 24 horas, usarlo
        if (savedPrice && savedPrice.timestamp) {
          const ageInHours = (Date.now() - savedPrice.timestamp) / (1000 * 60 * 60)
          if (ageInHours < 24) {
            console.log(`🔄 Restaurando precio guardado para ${comp.cardName} (edad: ${ageInHours.toFixed(1)} horas)`)
            updatedComp = {
              ...comp,
              marketPriceUSD: savedPrice.marketPriceUSD,
              marketFoilPriceUSD: savedPrice.marketFoilPriceUSD,
              priceSource: savedPrice.priceSource || comp.priceSource,
            }
          } else {
            console.log(`⏰ Precio guardado para ${comp.cardName} es muy antiguo (${ageInHours.toFixed(1)} horas), ignorando`)
          }
        }
        
        // Recalcular precios sugeridos si hay marketPriceUSD (usando parámetros actuales)
        if (updatedComp.marketPriceUSD !== null && updatedComp.marketPriceUSD !== undefined) {
          try {
            const calculation = calculateFinalPrice({
              basePriceUSD: updatedComp.marketPriceUSD,
              usTaxRate: priceParams.usTaxRate,
              shippingUSD: priceParams.shippingUSD,
              chileVATRate: priceParams.chileVATRate,
              exchangeRate: priceParams.exchangeRate,
              profitMargin: priceParams.profitMargin,
              mercadoPagoFee: priceParams.mercadoPagoFee,
            })
            updatedComp.suggestedPriceCLP = calculation.finalPriceCLP
            
            // Calcular diferencia y porcentaje
            const priceDiff = updatedComp.suggestedPriceCLP - (comp.currentPrice || 0)
            const priceDiffPercent = comp.currentPrice 
              ? (priceDiff / comp.currentPrice) * 100 
              : 0
            updatedComp.priceDifference = priceDiff
            updatedComp.priceDifferencePercent = priceDiffPercent
            updatedComp.needsPriceUpdate = Math.abs(priceDiffPercent) > 5
            
            console.log(`💰 Recalculado precio sugerido para ${comp.cardName}: $${updatedComp.suggestedPriceCLP.toLocaleString()} CLP (desde $${updatedComp.marketPriceUSD} USD)`)
          } catch (error) {
            console.warn(`⚠️ Error calculando precio sugerido para ${comp.cardName}:`, error)
          }
        }
        
        // Recalcular precio foil sugerido si hay marketFoilPriceUSD
        if (updatedComp.marketFoilPriceUSD !== null && updatedComp.marketFoilPriceUSD !== undefined) {
          try {
            const foilCalculation = calculateFinalPrice({
              basePriceUSD: updatedComp.marketFoilPriceUSD,
              usTaxRate: priceParams.usTaxRate,
              shippingUSD: priceParams.shippingUSD,
              chileVATRate: priceParams.chileVATRate,
              exchangeRate: priceParams.exchangeRate,
              profitMargin: priceParams.profitMargin,
              mercadoPagoFee: priceParams.mercadoPagoFee,
            })
            updatedComp.suggestedFoilPriceCLP = foilCalculation.finalPriceCLP
            
            // Calcular diferencia y porcentaje para foil
            const foilDiff = updatedComp.suggestedFoilPriceCLP - (comp.currentFoilPrice || 0)
            const foilDiffPercent = comp.currentFoilPrice 
              ? (foilDiff / comp.currentFoilPrice) * 100 
              : 0
            updatedComp.foilPriceDifference = foilDiff
            updatedComp.foilPriceDifferencePercent = foilDiffPercent
            
            // Si no hay precio normal pero sí foil, también considerar needsPriceUpdate
            if (!updatedComp.needsPriceUpdate) {
              updatedComp.needsPriceUpdate = Math.abs(foilDiffPercent) > 5
            }
            
            console.log(`💰 Recalculado precio foil sugerido para ${comp.cardName}: $${updatedComp.suggestedFoilPriceCLP.toLocaleString()} CLP (desde $${updatedComp.marketFoilPriceUSD} USD)`)
          } catch (error) {
            console.warn(`⚠️ Error calculando precio foil sugerido para ${comp.cardName}:`, error)
          }
        }
        
        return updatedComp
      })

      // Recalcular estadísticas con los datos fusionados
      const mergedStats = {
        ...stats,
        totalCompared: mergedComparisons.length,
        withStock: mergedComparisons.filter((c) => c.hasStock).length,
        withoutStock: mergedComparisons.filter((c) => !c.hasStock).length,
        needsPriceUpdate: mergedComparisons.filter((c) => c.needsPriceUpdate).length,
        averagePriceDifference:
          mergedComparisons.length > 0
            ? Math.round(
                (mergedComparisons.reduce((sum, c) => sum + c.priceDifferencePercent, 0) /
                  mergedComparisons.length) *
                  100
              ) / 100
            : 0,
      }

      // Actualizar estado de datos
      setData({
        comparisons: mergedComparisons,
        cardsOnlyInAPI: allCardsOnlyInAPI,
        cardsOnlyInDB: allCardsOnlyInDB,
        stats: mergedStats,
      })

      toast({
        title: "✅ Datos cargados",
        description: `Se procesaron ${allComparisons.length} cartas${allComparisons.length === 0 ? " (ver consola para detalles)" : ""}`,
      })

      // BÚSQUEDA AUTOMÁTICA DESACTIVADA
      // Las APIs de precios no son confiables, por lo que se desactiva la búsqueda automática
      // El usuario puede usar el botón "Buscar Precio" individual si lo desea
      console.log(`ℹ️ Búsqueda automática de precios desactivada - usar botón individual si se necesita`)
    } catch (error) {
      console.error("❌ Error loading comparison data:", error)
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      })
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo cargar la comparativa",
      })
      // Asegurar que el loading se desactive incluso si hay error
      setData(null)
    } finally {
      // Siempre resetear estados de carga
      setLoading(false)
      setRefreshing(false)
      console.log("✅ Estados de carga reseteados")
    }
  }

  // Función para buscar precio de TCGPlayer para una carta individual
  const fetchCardPrice = async (comp: ComparisonResult) => {
    setUpdatingPrices((prev) => new Set(prev).add(comp.cardId))
    setFetchingPrices((prev) => new Set(prev).add(comp.cardId))

    try {
      const { supabase } = await import("@/lib/db")
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      // Obtener parámetros actuales desde localStorage
      const savedParams = localStorage.getItem("priceCalculationParams")
      let currentParams = priceParams
      
      if (savedParams) {
        try {
          currentParams = JSON.parse(savedParams)
          console.log(`📥 Parámetros cargados desde localStorage para ${comp.cardName}:`, currentParams)
        } catch (e) {
          console.warn(`⚠️ Error parseando parámetros desde localStorage:`, e)
          // Usar priceParams del estado
        }
      } else {
        console.log(`📥 Usando parámetros del estado para ${comp.cardName}:`, currentParams)
      }

      const requestBody = {
        cardId: comp.cardId,
        cardName: comp.cardName,
        setId: comp.set, // El set viene en formato de BD (ej: "firstChapter")
        cardNumber: comp.number,
        setName: comp.set, // Podríamos mapear esto mejor
        ...currentParams,
      }
      
      console.log(`📤 Enviando request para ${comp.cardName} con parámetros:`, {
        usTaxRate: requestBody.usTaxRate,
        shippingUSD: requestBody.shippingUSD,
        chileVATRate: requestBody.chileVATRate,
        exchangeRate: requestBody.exchangeRate,
        profitMargin: requestBody.profitMargin,
        mercadoPagoFee: requestBody.mercadoPagoFee,
      })

      const response = await fetch("/api/admin/fetch-card-price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Error al buscar precio")
      }

      // Si no se encontró precio, mostrar mensaje informativo
      if (result.data && !result.data.marketPriceUSD) {
        toast({
          variant: "default",
          title: "⚠️ Precio no encontrado",
          description: `No se encontró precio de TCGPlayer para ${comp.cardName}. La API de CardMarket no tiene soporte para Lorcana.`,
        })
      } else if (result.data && result.data.marketPriceUSD) {
        toast({
          title: "✅ Precio TCGPlayer obtenido",
          description: `Precio de ${comp.cardName} encontrado: $${result.data.marketPriceUSD} USD`,
        })
      }

      // Actualizar el estado local con los nuevos datos
      if (data && result.data) {
        const updatedComparisons = data.comparisons.map((c) => {
          if (c.cardId === comp.cardId) {
            return {
              ...c,
              marketPriceUSD: result.data.marketPriceUSD,
              marketFoilPriceUSD: result.data.marketFoilPriceUSD,
              priceSource: result.data.priceSource,
              suggestedPriceCLP: result.data.suggestedPriceCLP,
              suggestedFoilPriceCLP: result.data.suggestedFoilPriceCLP,
              priceDifference: result.data.priceDifference,
              foilPriceDifference: result.data.foilPriceDifference,
              priceDifferencePercent: result.data.priceDifferencePercent,
              foilPriceDifferencePercent: result.data.foilPriceDifferencePercent,
              needsPriceUpdate: result.data.needsPriceUpdate,
            }
          }
          return c
        })

        // Guardar precio buscado en localStorage para persistencia
        const savedPrices = localStorage.getItem("searchedCardPrices")
        let pricesCache: Record<string, {
          marketPriceUSD: number | null
          marketFoilPriceUSD: number | null
          priceSource: string | null
          suggestedPriceCLP: number | null
          suggestedFoilPriceCLP: number | null
          priceDifference: number
          foilPriceDifference: number
          priceDifferencePercent: number
          foilPriceDifferencePercent: number
          needsPriceUpdate: boolean
          timestamp: number
        }> = {}
        
        if (savedPrices) {
          try {
            pricesCache = JSON.parse(savedPrices)
          } catch (e) {
            console.warn("⚠️ Error parseando precios guardados:", e)
          }
        }

        // Guardar el precio buscado con timestamp
        pricesCache[comp.cardId] = {
          marketPriceUSD: result.data.marketPriceUSD,
          marketFoilPriceUSD: result.data.marketFoilPriceUSD,
          priceSource: result.data.priceSource,
          suggestedPriceCLP: result.data.suggestedPriceCLP,
          suggestedFoilPriceCLP: result.data.suggestedFoilPriceCLP,
          priceDifference: result.data.priceDifference,
          foilPriceDifference: result.data.foilPriceDifference,
          priceDifferencePercent: result.data.priceDifferencePercent,
          foilPriceDifferencePercent: result.data.foilPriceDifferencePercent,
          needsPriceUpdate: result.data.needsPriceUpdate,
          timestamp: Date.now(),
        }

        localStorage.setItem("searchedCardPrices", JSON.stringify(pricesCache))
        console.log(`💾 Precio guardado en localStorage para ${comp.cardName} (${comp.cardId})`)

        // Recalcular estadísticas
        const stats = {
          ...data.stats,
          totalCompared: updatedComparisons.length,
          withStock: updatedComparisons.filter((c) => c.hasStock).length,
          withoutStock: updatedComparisons.filter((c) => !c.hasStock).length,
          needsPriceUpdate: updatedComparisons.filter((c) => c.needsPriceUpdate).length,
          averagePriceDifference:
            updatedComparisons.length > 0
              ? Math.round(
                  (updatedComparisons.reduce((sum, c) => sum + c.priceDifferencePercent, 0) /
                    updatedComparisons.length) *
                    100
                ) / 100
              : 0,
        }

        setData({
          ...data,
          comparisons: updatedComparisons,
          stats,
        })
      }

      if (result.data.marketPriceUSD) {
        toast({
          title: "✅ Precio encontrado",
          description: `Precio TCGPlayer: $${result.data.marketPriceUSD.toFixed(2)} USD${result.data.marketFoilPriceUSD ? ` (Foil: $${result.data.marketFoilPriceUSD.toFixed(2)} USD)` : ''}`,
        })
      } else {
        toast({
          variant: "default",
          title: "⚠️ Precio no encontrado",
          description: `La API de CardMarket no tiene soporte para Lorcana. Se intentó buscar en Lorcast API como alternativa.`,
        })
      }
    } catch (error) {
      console.error("Error fetching price:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo buscar el precio",
      })
    } finally {
      setUpdatingPrices((prev) => {
        const next = new Set(prev)
        next.delete(comp.cardId)
        return next
      })
      setFetchingPrices((prev) => {
        const next = new Set(prev)
        next.delete(comp.cardId)
        return next
      })
    }
  }

  // Función para guardar precio USD en la base de datos (solo USD, no los cálculos)
  const saveMarketPriceUSD = async (cardId: string, marketPriceUSD?: number, marketFoilPriceUSD?: number) => {
    try {
      const { supabase } = await import("@/lib/db")
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const updateData: any = {}
      if (marketPriceUSD !== undefined && marketPriceUSD !== null) {
        updateData.marketPriceUSD = marketPriceUSD
      }
      if (marketFoilPriceUSD !== undefined && marketFoilPriceUSD !== null) {
        updateData.marketFoilPriceUSD = marketFoilPriceUSD
      }

      if (Object.keys(updateData).length === 0) {
        return // No hay nada que actualizar
      }

      const response = await fetch("/api/admin/update-prices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          cardId,
          ...updateData,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        console.warn(`⚠️ Error guardando precio USD en BD para ${cardId}:`, result.error)
      } else {
        console.log(`✅ Precio USD guardado en BD para ${cardId}`)
      }
    } catch (error) {
      console.warn("⚠️ Error guardando precio USD en BD:", error)
      // No mostrar toast para no interrumpir el flujo del usuario
    }
  }

  // Función para actualizar precio de una carta individual
  const updateCardPrice = async (
    comp: ComparisonResult, 
    manualPrice?: number, 
    manualFoilPrice?: number,
    manualMarketPriceUSD?: number,
    manualMarketFoilPriceUSD?: number
  ) => {
    // Si se proporcionan precios manuales, usarlos directamente
    const priceToUpdate = manualPrice !== undefined ? manualPrice : comp.suggestedPriceCLP
    const foilPriceToUpdate = manualFoilPrice !== undefined ? manualFoilPrice : comp.suggestedFoilPriceCLP
    // Si se proporciona marketPriceUSD manual, usarlo (viene del campo editable)
    const marketPriceUSDToSave = manualMarketPriceUSD !== undefined ? manualMarketPriceUSD : comp.marketPriceUSD
    const marketFoilPriceUSDToSave = manualMarketFoilPriceUSD !== undefined ? manualMarketFoilPriceUSD : comp.marketFoilPriceUSD
    
    if (!priceToUpdate && !foilPriceToUpdate) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No hay precio disponible para actualizar",
      })
      return
    }

    setUpdatingPrices((prev) => new Set(prev).add(comp.cardId))

    try {
      const { supabase } = await import("@/lib/db")
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      // Guardar también el precio USD en localStorage para persistencia
      if (marketPriceUSDToSave !== null && marketPriceUSDToSave !== undefined) {
        const savedPrices = localStorage.getItem("searchedCardPrices")
        let pricesCache: Record<string, any> = {}
        
        if (savedPrices) {
          try {
            pricesCache = JSON.parse(savedPrices)
          } catch (e) {
            console.warn("⚠️ Error parseando precios guardados:", e)
          }
        }

        pricesCache[comp.cardId] = {
          ...pricesCache[comp.cardId],
          marketPriceUSD: marketPriceUSDToSave,
          marketFoilPriceUSD: marketFoilPriceUSDToSave !== null && marketFoilPriceUSDToSave !== undefined ? marketFoilPriceUSDToSave : pricesCache[comp.cardId]?.marketFoilPriceUSD,
          timestamp: Date.now(),
        }

        localStorage.setItem("searchedCardPrices", JSON.stringify(pricesCache))
        console.log(`💾 Precio USD guardado en localStorage para ${comp.cardName}: $${marketPriceUSDToSave} USD`)
      }

      const response = await fetch("/api/admin/update-prices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          cardId: comp.cardId,
          price: priceToUpdate ? Math.round(priceToUpdate) : undefined,
          foilPrice: foilPriceToUpdate ? Math.round(foilPriceToUpdate) : undefined,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Error al actualizar precio")
      }

      const priceMsg = priceToUpdate ? `Normal: $${Math.round(priceToUpdate).toLocaleString()} CLP` : ""
      const foilMsg = foilPriceToUpdate ? `Foil: $${Math.round(foilPriceToUpdate).toLocaleString()} CLP` : ""
      const pricesMsg = [priceMsg, foilMsg].filter(Boolean).join(" | ")
      
      toast({
        title: "✅ Precio actualizado",
        description: `${comp.cardName} - ${pricesMsg}`,
      })

      // Recargar datos para reflejar los cambios
      await loadData()
    } catch (error) {
      console.error("Error updating price:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el precio",
      })
    } finally {
      setUpdatingPrices((prev) => {
        const next = new Set(prev)
        next.delete(comp.cardId)
        return next
      })
    }
  }

  // Función para revertir precios de un set
  const revertSetPrices = async (set: string) => {
    const setNames: Record<string, string> = {
      'firstChapter': 'Set 1 - The First Chapter',
      'riseOfFloodborn': 'Set 2 - Rise of the Floodborn',
      'intoInklands': 'Set 3 - Into the Inklands',
      'ursulaReturn': 'Set 4 - Ursula\'s Return',
      'shimmering': 'Set 5 - Shimmering Skies',
      'azurite': 'Set 6 - Azurite Sea',
      'archazia': 'Set 7 - Archazia\'s Island',
      'reignOfJafar': 'Set 8 - Reign of Jafar',
      'fabled': 'Set 9 - Fabled',
      'whi': 'Set 10 - Whispers in the Well',
    }
    
    const setName = setNames[set] || set
    
    const confirmed = window.confirm(
      `¿Estás seguro de revertir TODOS los precios del ${setName} a valores estándar?\n\nEsto restaurará los precios basándose en la rareza de cada carta.\n\nEsta acción NO se puede deshacer.`
    )

    if (!confirmed) return

    setRevertingSet(true)

    try {
      const { supabase } = await import("@/lib/db")
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch("/api/admin/revert-set-prices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ set }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Error al revertir precios")
      }

      toast({
        title: "✅ Precios revertidos",
        description: result.message || `Se revirtieron ${result.stats?.success || 0} precios`,
      })

      // Recargar datos para reflejar los cambios
      await loadData()
    } catch (error) {
      console.error("Error reverting prices:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron revertir los precios",
      })
    } finally {
      setRevertingSet(false)
    }
  }

  // Función para actualización masiva
  const updateAllPrices = async () => {
    if (!data) return

    const cardsToUpdate = filteredComparisons.filter(
      (comp) => comp.needsPriceUpdate && comp.suggestedPriceCLP && comp.suggestedFoilPriceCLP
    )

    if (cardsToUpdate.length === 0) {
      toast({
        variant: "destructive",
        title: "Sin cartas para actualizar",
        description: "No hay cartas que necesiten actualización de precio",
      })
      return
    }

    const confirmed = window.confirm(
      `¿Estás seguro de actualizar los precios de ${cardsToUpdate.length} cartas?`
    )

    if (!confirmed) return

    setUpdatingAll(true)

    try {
      const { supabase } = await import("@/lib/db")
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const updates = cardsToUpdate.map((comp) => ({
        cardId: comp.cardId,
        price: Math.round(comp.suggestedPriceCLP!),
        foilPrice: Math.round(comp.suggestedFoilPriceCLP!),
      }))

      const response = await fetch("/api/admin/update-prices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ updates }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Error al actualizar precios")
      }

      toast({
        title: "✅ Precios actualizados",
        description: `Se actualizaron ${result.results?.success || 0} de ${cardsToUpdate.length} precios`,
      })

      // Recargar datos para reflejar los cambios
      await loadData()
    } catch (error) {
      console.error("Error updating prices:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron actualizar los precios",
      })
    } finally {
      setUpdatingAll(false)
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
            <div className="flex gap-2">
              {filterSet && filterSet !== "all" && (
                <Button
                  onClick={() => revertSetPrices(filterSet)}
                  disabled={revertingSet || refreshing || loading}
                  variant="destructive"
                >
                  {revertingSet ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Revirtiendo...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Revertir Precios del Set
                    </>
                  )}
                </Button>
              )}
              <Button 
                onClick={() => {
                  console.log("🔄 Botón 'Actualizar' clickeado")
                  loadData()
                }} 
                disabled={refreshing || loading || revertingSet}
              >
                {refreshing || loading ? (
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
                <div className="flex gap-2">
                  <Button 
                    onClick={async () => {
                      console.log("🔄 Botón 'Recalcular Precios' clickeado")
                      
                      // Guardar los parámetros actuales en la BD antes de recargar
                      try {
                        const { supabase } = await import("@/lib/db")
                        const { data: { session } } = await supabase.auth.getSession()
                        const token = session?.access_token

                        const response = await fetch("/api/admin/price-calculation-settings", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            ...(token && { Authorization: `Bearer ${token}` }),
                          },
                          body: JSON.stringify(priceParams),
                        })

                        if (response.ok) {
                          const result = await response.json()
                          if (result.success) {
                            console.log("✅ Parámetros guardados en BD antes de recalcular")
                            // También actualizar localStorage
                            localStorage.setItem("priceCalculationParams", JSON.stringify(priceParams))
                          }
                        } else {
                          console.warn("⚠️ Error guardando parámetros en BD, continuando con recálculo")
                        }
                      } catch (error) {
                        console.warn("⚠️ Error guardando parámetros en BD:", error)
                        // Continuar con el recálculo aunque falle el guardado
                      }
                      
                      // Recargar datos para recalcular precios sugeridos con los nuevos parámetros
                      await loadData()
                    }}
                    disabled={refreshing || loading}
                    variant="outline"
                    size="sm"
                  >
                    {refreshing || loading ? (
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
                  {/* Botón de búsqueda masiva desactivado - las APIs no son confiables */}
                  {/* 
                  <Button 
                    onClick={() => {
                      // Buscar precios para todas las cartas del set actual
                      if (data && data.comparisons.length > 0) {
                        fetchAllCardPrices(data.comparisons)
                      } else {
                        // Si no hay datos, cargar primero
                        loadData().then(() => {
                          setTimeout(() => {
                            if (data && data.comparisons.length > 0) {
                              fetchAllCardPrices(data.comparisons)
                            }
                          }, 500)
                        })
                      }
                    }}
                    disabled={refreshing || loading}
                    variant="default"
                    size="sm"
                  >
                    {fetchingAllPrices ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Buscando ({fetchProgress.current}/{fetchProgress.total})...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Buscar Precios del Set
                      </>
                    )}
                  </Button>
                  */}
                </div>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{data.stats.totalInDatabase}</div>
                  <p className="text-xs text-muted-foreground">En BD</p>
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
                  {data && filteredComparisons.filter(c => c.needsPriceUpdate && c.suggestedPriceCLP && c.suggestedFoilPriceCLP).length > 0 && (
                    <Button
                      onClick={updateAllPrices}
                      disabled={updatingAll || refreshing || loading}
                      variant="default"
                      size="sm"
                    >
                      {updatingAll ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Actualizando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Actualizar Todos los Precios Sugeridos
                        </>
                      )}
                    </Button>
                  )}
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
                          <TableHead className="text-right">Precio Actual</TableHead>
                          <TableHead className="text-right">Precio Normal (USD)</TableHead>
                          <TableHead className="text-right">Precio Sugerido (CLP)</TableHead>
                          <TableHead className="text-right">Diferencia</TableHead>
                          <TableHead className="text-right">Precio Foil Actual</TableHead>
                          <TableHead className="text-right">Precio Foil (USD)</TableHead>
                          <TableHead className="text-right">Precio Foil Sugerido (CLP)</TableHead>
                          <TableHead className="text-right">Diff. Foil</TableHead>
                          <TableHead className="w-[120px]">Acciones</TableHead>
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
                            <TableCell className="text-right font-semibold">
                              ${comp.currentPrice.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {editingPrice?.cardId === comp.cardId && editingPrice.field === 'priceUSD' ? (
                                <div className="flex flex-col items-end gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">USD:</span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editingPriceValue}
                                      onChange={(e) => {
                                        setEditingPriceValue(e.target.value)
                                        // Calcular automáticamente el precio en CLP y actualizar en tiempo real
                                        const usdPrice = parseFloat(e.target.value)
                                        if (!isNaN(usdPrice) && usdPrice >= 0) {
                                          const calculated = calculateFinalPrice({
                                            basePriceUSD: usdPrice,
                                            usTaxRate: priceParams.usTaxRate,
                                            shippingUSD: priceParams.shippingUSD,
                                            chileVATRate: priceParams.chileVATRate,
                                            exchangeRate: priceParams.exchangeRate,
                                            profitMargin: priceParams.profitMargin,
                                            mercadoPagoFee: priceParams.mercadoPagoFee,
                                          })
                                          
                                          // Calcular diferencia y porcentaje
                                          const priceDiff = calculated.finalPriceCLP - (comp.currentPrice || 0)
                                          const priceDiffPercent = comp.currentPrice 
                                            ? (priceDiff / comp.currentPrice) * 100 
                                            : 0
                                          
                                          // Actualizar el estado local para mostrar el precio calculado y diferencia
                                          if (data) {
                                            const updatedComparisons = data.comparisons.map((c) => {
                                              if (c.cardId === comp.cardId) {
                                                return {
                                                  ...c,
                                                  marketPriceUSD: usdPrice,
                                                  suggestedPriceCLP: calculated.finalPriceCLP,
                                                  priceDifference: priceDiff,
                                                  priceDifferencePercent: priceDiffPercent,
                                                  needsPriceUpdate: Math.abs(priceDiffPercent) > 5,
                                                }
                                              }
                                              return c
                                            })
                                            setData({
                                              ...data,
                                              comparisons: updatedComparisons,
                                            })
                                          }
                                        }
                                      }}
                                      className="w-20 h-8 text-right"
                                      autoFocus
                                      placeholder="0.00"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === 'Escape') {
                                          // Al presionar Enter, guardar y cerrar
                                          const usdPrice = parseFloat(editingPriceValue)
                                          if (!isNaN(usdPrice) && usdPrice >= 0) {
                                            // Guardar en localStorage
                                            const savedPrices = localStorage.getItem("searchedCardPrices")
                                            let pricesCache: Record<string, any> = {}
                                            
                                            if (savedPrices) {
                                              try {
                                                pricesCache = JSON.parse(savedPrices)
                                              } catch (e) {
                                                console.warn("⚠️ Error parseando precios guardados:", e)
                                              }
                                            }

                                            pricesCache[comp.cardId] = {
                                              ...pricesCache[comp.cardId],
                                              marketPriceUSD: usdPrice,
                                              marketFoilPriceUSD: comp.marketFoilPriceUSD ?? pricesCache[comp.cardId]?.marketFoilPriceUSD,
                                              timestamp: Date.now(),
                                            }

                                            localStorage.setItem("searchedCardPrices", JSON.stringify(pricesCache))
                                            
                                            // Guardar en BD
                                            saveMarketPriceUSD(comp.cardId, usdPrice, undefined)
                                          }
                                          setEditingPrice(null)
                                          setEditingPriceValue("")
                                        }
                                      }}
                                      onBlur={() => {
                                        // Al salir del campo, guardar si hay un valor válido
                                        const usdPrice = parseFloat(editingPriceValue)
                                        if (!isNaN(usdPrice) && usdPrice >= 0) {
                                          // Guardar en localStorage
                                          const savedPrices = localStorage.getItem("searchedCardPrices")
                                          let pricesCache: Record<string, any> = {}
                                          
                                          if (savedPrices) {
                                            try {
                                              pricesCache = JSON.parse(savedPrices)
                                            } catch (e) {
                                              console.warn("⚠️ Error parseando precios guardados:", e)
                                            }
                                          }

                                          pricesCache[comp.cardId] = {
                                            ...pricesCache[comp.cardId],
                                            marketPriceUSD: usdPrice,
                                            marketFoilPriceUSD: comp.marketFoilPriceUSD ?? pricesCache[comp.cardId]?.marketFoilPriceUSD,
                                            timestamp: Date.now(),
                                          }

                                          localStorage.setItem("searchedCardPrices", JSON.stringify(pricesCache))
                                          
                                          // Guardar en BD
                                          saveMarketPriceUSD(comp.cardId, usdPrice, undefined)
                                        }
                                        setEditingPrice(null)
                                        setEditingPriceValue("")
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingPrice(null)
                                        setEditingPriceValue("")
                                      }}
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                  {(() => {
                                    const usdPrice = parseFloat(editingPriceValue)
                                    if (!isNaN(usdPrice) && usdPrice >= 0) {
                                      const calculated = calculateFinalPrice({
                                        basePriceUSD: usdPrice,
                                        usTaxRate: priceParams.usTaxRate,
                                        shippingUSD: priceParams.shippingUSD,
                                        chileVATRate: priceParams.chileVATRate,
                                        exchangeRate: priceParams.exchangeRate,
                                        profitMargin: priceParams.profitMargin,
                                        mercadoPagoFee: priceParams.mercadoPagoFee,
                                      })
                                      return (
                                        <div className="text-xs text-blue-600">
                                          = ${calculated.finalPriceCLP.toLocaleString()} CLP
                                        </div>
                                      )
                                    }
                                    return null
                                  })()}
                                </div>
                              ) : (
                                <div 
                                  className="cursor-pointer hover:bg-muted rounded px-2 py-1 inline-block"
                                  onClick={() => {
                                    setEditingPrice({ cardId: comp.cardId, field: 'priceUSD' })
                                    setEditingPriceValue(comp.marketPriceUSD?.toString() || "")
                                  }}
                                  title="Click para ingresar precio en USD (se calculará automáticamente en CLP)"
                                >
                                  {comp.marketPriceUSD ? `$${comp.marketPriceUSD.toFixed(2)} USD` : "Click para ingresar"}
                                </div>
                              )}
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
                              {editingPrice?.cardId === comp.cardId && editingPrice.field === 'foilPrice' ? (
                                <div className="flex items-center gap-2 justify-end">
                                  <Input
                                    type="number"
                                    value={editingPriceValue}
                                    onChange={(e) => setEditingPriceValue(e.target.value)}
                                    className="w-24 h-8 text-right"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const newPrice = parseFloat(editingPriceValue)
                                        if (!isNaN(newPrice) && newPrice >= 0) {
                                          updateCardPrice(comp, undefined, newPrice)
                                          setEditingPrice(null)
                                          setEditingPriceValue("")
                                        }
                                      } else if (e.key === 'Escape') {
                                        setEditingPrice(null)
                                        setEditingPriceValue("")
                                      }
                                    }}
                                    onBlur={() => {
                                      const newPrice = parseFloat(editingPriceValue)
                                      if (!isNaN(newPrice) && newPrice >= 0) {
                                        updateCardPrice(comp, undefined, newPrice)
                                      }
                                      setEditingPrice(null)
                                      setEditingPriceValue("")
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingPrice(null)
                                      setEditingPriceValue("")
                                    }}
                                  >
                                    ✕
                                  </Button>
                                </div>
                              ) : (
                                <div 
                                  className="cursor-pointer hover:bg-muted rounded px-2 py-1 inline-block"
                                  onClick={() => {
                                    setEditingPrice({ cardId: comp.cardId, field: 'foilPrice' })
                                    setEditingPriceValue(comp.currentFoilPrice.toString())
                                  }}
                                  title="Click para editar precio foil"
                                >
                                  ${comp.currentFoilPrice.toLocaleString()}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {editingPrice?.cardId === comp.cardId && editingPrice.field === 'foilPriceUSD' ? (
                                <div className="flex flex-col items-end gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">USD:</span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editingPriceValue}
                                      onChange={(e) => {
                                        setEditingPriceValue(e.target.value)
                                        // Calcular automáticamente el precio en CLP y actualizar en tiempo real
                                        const usdPrice = parseFloat(e.target.value)
                                        if (!isNaN(usdPrice) && usdPrice >= 0) {
                                          const calculated = calculateFinalPrice({
                                            basePriceUSD: usdPrice,
                                            usTaxRate: priceParams.usTaxRate,
                                            shippingUSD: priceParams.shippingUSD,
                                            chileVATRate: priceParams.chileVATRate,
                                            exchangeRate: priceParams.exchangeRate,
                                            profitMargin: priceParams.profitMargin,
                                            mercadoPagoFee: priceParams.mercadoPagoFee,
                                          })
                                          
                                          // Calcular diferencia y porcentaje para foil
                                          const foilDiff = calculated.finalPriceCLP - (comp.currentFoilPrice || 0)
                                          const foilDiffPercent = comp.currentFoilPrice 
                                            ? (foilDiff / comp.currentFoilPrice) * 100 
                                            : 0
                                          
                                          // Actualizar el estado local para mostrar el precio calculado y diferencia
                                          if (data) {
                                            const updatedComparisons = data.comparisons.map((c) => {
                                              if (c.cardId === comp.cardId) {
                                                return {
                                                  ...c,
                                                  marketFoilPriceUSD: usdPrice,
                                                  suggestedFoilPriceCLP: calculated.finalPriceCLP,
                                                  foilPriceDifference: foilDiff,
                                                  foilPriceDifferencePercent: foilDiffPercent,
                                                  needsPriceUpdate: Math.abs(foilDiffPercent) > 5 || (c.needsPriceUpdate ?? false),
                                                }
                                              }
                                              return c
                                            })
                                            setData({
                                              ...data,
                                              comparisons: updatedComparisons,
                                            })
                                          }
                                        }
                                      }}
                                      className="w-20 h-8 text-right"
                                      autoFocus
                                      placeholder="0.00"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === 'Escape') {
                                          // Al presionar Enter, guardar y cerrar
                                          const usdPrice = parseFloat(editingPriceValue)
                                          if (!isNaN(usdPrice) && usdPrice >= 0) {
                                            // Guardar en localStorage
                                            const savedPrices = localStorage.getItem("searchedCardPrices")
                                            let pricesCache: Record<string, any> = {}
                                            
                                            if (savedPrices) {
                                              try {
                                                pricesCache = JSON.parse(savedPrices)
                                              } catch (e) {
                                                console.warn("⚠️ Error parseando precios guardados:", e)
                                              }
                                            }

                                            pricesCache[comp.cardId] = {
                                              ...pricesCache[comp.cardId],
                                              marketFoilPriceUSD: usdPrice,
                                              marketPriceUSD: comp.marketPriceUSD ?? pricesCache[comp.cardId]?.marketPriceUSD,
                                              timestamp: Date.now(),
                                            }

                                            localStorage.setItem("searchedCardPrices", JSON.stringify(pricesCache))
                                            
                                            // Guardar en BD
                                            saveMarketPriceUSD(comp.cardId, undefined, usdPrice)
                                          }
                                          setEditingPrice(null)
                                          setEditingPriceValue("")
                                        }
                                      }}
                                      onBlur={() => {
                                        // Al salir del campo, guardar si hay un valor válido
                                        const usdPrice = parseFloat(editingPriceValue)
                                        if (!isNaN(usdPrice) && usdPrice >= 0) {
                                          // Guardar en localStorage
                                          const savedPrices = localStorage.getItem("searchedCardPrices")
                                          let pricesCache: Record<string, any> = {}
                                          
                                          if (savedPrices) {
                                            try {
                                              pricesCache = JSON.parse(savedPrices)
                                            } catch (e) {
                                              console.warn("⚠️ Error parseando precios guardados:", e)
                                            }
                                          }

                                          pricesCache[comp.cardId] = {
                                            ...pricesCache[comp.cardId],
                                            marketFoilPriceUSD: usdPrice,
                                            marketPriceUSD: comp.marketPriceUSD ?? pricesCache[comp.cardId]?.marketPriceUSD,
                                            timestamp: Date.now(),
                                          }

                                          localStorage.setItem("searchedCardPrices", JSON.stringify(pricesCache))
                                          
                                          // Guardar en BD
                                          saveMarketPriceUSD(comp.cardId, undefined, usdPrice)
                                        }
                                        setEditingPrice(null)
                                        setEditingPriceValue("")
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingPrice(null)
                                        setEditingPriceValue("")
                                      }}
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                  {(() => {
                                    const usdPrice = parseFloat(editingPriceValue)
                                    if (!isNaN(usdPrice) && usdPrice >= 0) {
                                      const calculated = calculateFinalPrice({
                                        basePriceUSD: usdPrice,
                                        usTaxRate: priceParams.usTaxRate,
                                        shippingUSD: priceParams.shippingUSD,
                                        chileVATRate: priceParams.chileVATRate,
                                        exchangeRate: priceParams.exchangeRate,
                                        profitMargin: priceParams.profitMargin,
                                        mercadoPagoFee: priceParams.mercadoPagoFee,
                                      })
                                      return (
                                        <div className="text-xs text-blue-600">
                                          = ${calculated.finalPriceCLP.toLocaleString()} CLP
                                        </div>
                                      )
                                    }
                                    return null
                                  })()}
                                </div>
                              ) : (
                                <div 
                                  className="cursor-pointer hover:bg-muted rounded px-2 py-1 inline-block"
                                  onClick={() => {
                                    setEditingPrice({ cardId: comp.cardId, field: 'foilPriceUSD' })
                                    setEditingPriceValue(comp.marketFoilPriceUSD?.toString() || "")
                                  }}
                                  title="Click para ingresar precio foil en USD (se calculará automáticamente en CLP)"
                                >
                                  {comp.marketFoilPriceUSD ? `$${comp.marketFoilPriceUSD.toFixed(2)} USD` : "Click para ingresar"}
                                </div>
                              )}
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
                                {/* Botón para actualizar precio si hay precio sugerido (normal o foil) */}
                                {(comp.suggestedPriceCLP || comp.suggestedFoilPriceCLP) ? (
                                  <Button
                                    onClick={() => updateCardPrice(comp)}
                                    disabled={updatingPrices.has(comp.cardId) || fetchingPrices.has(comp.cardId) || updatingAll}
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                  >
                                    {updatingPrices.has(comp.cardId) ? (
                                      <>
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        Actualizando...
                                      </>
                                    ) : (
                                      <>
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                        Actualizar
                                      </>
                                    )}
                                  </Button>
                                ) : null}
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

