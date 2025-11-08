"use client"

import { useEffect, useState } from "react"
import { useUser } from "@/hooks/use-user"

interface CollectionItem {
  id: string
  card_id: string
  status: "owned" | "wanted"
  quantity: number
}

export function useCollection() {
  const { user } = useUser()
  const [collection, setCollection] = useState<CollectionItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      loadCollection()
    } else {
      setCollection([])
    }
  }, [user])

  const loadCollection = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch(`/api/my-collection?userId=${user.id}`)
      const data = await response.json()

      if (data.success) {
        setCollection(data.data || [])
      }
    } catch (error) {
      console.error("Error loading collection:", error)
    } finally {
      setLoading(false)
    }
  }

  const isInCollection = (cardId: string, status: "owned" | "wanted"): boolean => {
    return collection.some((item) => item.card_id === cardId && item.status === status)
  }

  const addToCollection = async (cardId: string, status: "owned" | "wanted") => {
    if (!user) return { success: false, error: "Not logged in" }

    try {
      const response = await fetch("/api/my-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          cardId,
          status,
          quantity: 1,
        }),
      })

      const data = await response.json()

      if (data.success) {
        await loadCollection() // Reload
      }

      return data
    } catch (error) {
      console.error("Error adding to collection:", error)
      return { success: false, error: "Failed to add to collection" }
    }
  }

  const removeFromCollection = async (cardId: string, status: "owned" | "wanted") => {
    if (!user) return { success: false, error: "Not logged in" }

    try {
      const response = await fetch(
        `/api/my-collection?userId=${user.id}&cardId=${cardId}&status=${status}`,
        { method: "DELETE" }
      )

      const data = await response.json()

      if (data.success) {
        await loadCollection() // Reload
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
    refresh: loadCollection,
  }
}

