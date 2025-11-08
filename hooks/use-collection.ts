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

  const loadCollection = useCallback(async () => {
    if (!user?.id) return
    if (loadingRef.current) return // Ya está cargando, salir
    if (lastUserIdRef.current === user.id) return // Ya cargado para este usuario

    try {
      loadingRef.current = true
      setLoading(true)
      
      console.log("🔄 Loading collection for user:", user.id)
      const response = await fetch(`/api/my-collection?userId=${user.id}`)
      const data = await response.json()

      if (data.success) {
        setCollection(data.data || [])
        lastUserIdRef.current = user.id // Marcar como cargado
        console.log("✅ Collection loaded:", data.data?.length || 0, "items")
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
    return collection.some(
      (item) => item.card_id === cardId && item.status === status && item.version === version
    )
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

  return {
    collection,
    loading,
    isInCollection,
    addToCollection,
    removeFromCollection,
    loadCollection, // Exponer para refresh manual
    refresh: loadCollection, // Alias para compatibilidad
  }
}

