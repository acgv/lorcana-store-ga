"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useUser } from "@/hooks/use-user"

interface CollectionItem {
  id: string
  card_id: string
  status: "owned" | "wanted"
  version: "normal" | "foil"
  quantity: number
}

export function useCollection() {
  const { user } = useUser()
  const [collection, setCollection] = useState<CollectionItem[]>([])
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false) // Flag para prevenir múltiples cargas
  const lastUserIdRef = useRef<string | null>(null) // Track último usuario cargado

  const loadCollection = useCallback(async (force = false) => {
    if (!user?.id) return
    if (loadingRef.current) return // Ya está cargando, salir
    if (!force && lastUserIdRef.current === user.id) return // Ya cargado para este usuario

    try {
      loadingRef.current = true
      setLoading(true)
      
      console.log("🔄 Loading collection for user:", user.id, force ? "(forced)" : "")
      const response = await fetch(`/api/my-collection?userId=${user.id}`)
      const data = await response.json()

      if (data.success) {
        const items = data.data || []
        setCollection(items)
        lastUserIdRef.current = user.id // Marcar como cargado
        
        // Log detallado para debugging
        const setsCount = items.reduce((acc: Record<string, number>, item: any) => {
          const setId = item.card_id?.split("-")[0] || "unknown"
          acc[setId] = (acc[setId] || 0) + 1
          return acc
        }, {})
        
        console.log("✅ Collection loaded:", {
          total: items.length,
          bySet: setsCount,
          sampleIds: items.slice(0, 5).map((i: any) => i.card_id)
        })
      } else {
        console.error("❌ API returned error:", data.error)
      }
    } catch (error) {
      console.error("❌ Error loading collection:", error)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      // Solo cargar si cambió el usuario
      if (lastUserIdRef.current !== user.id) {
        loadCollection()
      }
    } else {
      setCollection([])
      lastUserIdRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]) // Solo user.id como dependencia

  const isInCollection = (
    cardId: string, 
    status: "owned" | "wanted", 
    version: "normal" | "foil"
  ): boolean => {
    if (!cardId || !collection || collection.length === 0) return false
    
    // Comparar IDs de forma case-insensitive y sin espacios
    const normalizedCardId = String(cardId).trim().toLowerCase()
    
    return collection.some((item) => {
      const normalizedItemId = String(item.card_id || "").trim().toLowerCase()
      return normalizedItemId === normalizedCardId && 
             item.status === status && 
             item.version === version
    })
  }

  const addToCollection = async (
    cardId: string, 
    status: "owned" | "wanted",
    version: "normal" | "foil" = "normal",
    quantity: number = 1
  ) => {
    if (!user) return { success: false, error: "Not logged in" }

    try {
      const response = await fetch("/api/my-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          cardId,
          status,
          version,
          quantity,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Invalidar cache y recargar
        lastUserIdRef.current = null
        await loadCollection()
      }

      return data
    } catch (error) {
      console.error("Error adding to collection:", error)
      return { success: false, error: "Failed to add to collection" }
    }
  }

  const removeFromCollection = async (
    cardId: string, 
    status: "owned" | "wanted",
    version: "normal" | "foil" = "normal"
  ) => {
    if (!user) return { success: false, error: "Not logged in" }

    try {
      const response = await fetch(
        `/api/my-collection?userId=${user.id}&cardId=${cardId}&status=${status}&version=${version}`,
        { method: "DELETE" }
      )

      const data = await response.json()

      if (data.success) {
        // Invalidar cache y recargar
        lastUserIdRef.current = null
        await loadCollection()
      }

      return data
    } catch (error) {
      console.error("Error removing from collection:", error)
      return { success: false, error: "Failed to remove from collection" }
    }
  }

  const manualRefresh = () => {
    // Invalidar cache para forzar recarga
    lastUserIdRef.current = null
    loadCollection(true) // Forzar recarga
  }

  return {
    collection,
    loading,
    isInCollection,
    addToCollection,
    removeFromCollection,
    loadCollection, // Exponer para refresh manual
    refresh: manualRefresh, // Forzar recarga invalidando cache
  }
}

