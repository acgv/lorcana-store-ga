// Database configuration and helpers
// Para uso con Supabase o Firebase

import type { Card, CardSubmission, ActivityLog } from "./types"
import { createClient } from "@supabase/supabase-js"

// Supabase client (usa variables definidas en .env.local)
// Solo se crea si las variables están configuradas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Cliente público (solo lectura) - Para frontend y lectura de cartas
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })
  : null

// Cliente admin (bypass RLS) - SOLO para API routes (server-side)
// ⚠️ NUNCA exponer en frontend, usa solo en app/api/**
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
    })
  : null

// Helper functions to map between Supabase column names (snake_case) and TypeScript types (camelCase)
const mapSubmissionFromDB = (dbRow: any): CardSubmission => ({
  id: dbRow.id,
  card: dbRow.card,
  status: dbRow.status,
  submittedBy: dbRow.submittedby,
  submittedAt: dbRow.submittedat,
  reviewedBy: dbRow.reviewedby,
  reviewedAt: dbRow.reviewedat,
  rejectionReason: dbRow.rejectionreason,
  images: dbRow.images || [],
  metadata: dbRow.metadata || { source: 'manual' },
})

const mapLogFromDB = (dbRow: any): ActivityLog => ({
  id: dbRow.id,
  userId: dbRow.userid,
  action: dbRow.action,
  entityType: dbRow.entitytype,
  entityId: dbRow.entityid,
  timestamp: dbRow.timestamp,
  details: dbRow.details,
})

// Database helper class
// ✅ Submissions and Logs are now connected to Supabase
// ⚠️ Cards still use mock data (for backwards compatibility)
export class Database {
  private static cards: Card[] = []

  // Cards
  static async getCards(filters?: {
    status?: string
    type?: string
    set?: string
    rarity?: string
    language?: string
  }): Promise<Card[]> {
    let filtered = this.cards

    if (filters) {
      if (filters.status) {
        filtered = filtered.filter((c) => c.status === filters.status)
      }
      if (filters.type) {
        filtered = filtered.filter((c) => c.type === filters.type)
      }
      if (filters.set) {
        filtered = filtered.filter((c) => c.set === filters.set)
      }
      if (filters.rarity) {
        filtered = filtered.filter((c) => c.rarity === filters.rarity)
      }
      if (filters.language) {
        filtered = filtered.filter((c) => c.language === filters.language)
      }
    }

    return filtered
  }

  static async getCardById(id: string): Promise<Card | null> {
    return this.cards.find((c) => c.id === id) || null
  }

  static async createCard(card: Card): Promise<Card> {
    const newCard = {
      id: (card as any).id || `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...card,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: card.status || "approved",
    }
    this.cards.push(newCard as Card)
    return newCard as Card
  }

  static async updateCard(id: string, updates: Partial<Card>): Promise<Card | null> {
    const index = this.cards.findIndex((c) => c.id === id)
    if (index === -1) return null

    this.cards[index] = {
      ...this.cards[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    return this.cards[index]
  }

  static async deleteCard(id: string): Promise<boolean> {
    const index = this.cards.findIndex((c) => c.id === id)
    if (index === -1) return false

    this.cards.splice(index, 1)
    return true
  }

  // Submissions - Connected to Supabase
  static async getSubmissions(status?: string): Promise<CardSubmission[]> {
    if (!supabaseAdmin) {
      console.warn("⚠️ Supabase not configured, returning empty submissions")
      return []
    }

    try {
      let query = supabaseAdmin.from('submissions').select('*')
      
      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query.order('submittedat', { ascending: false })

      if (error) {
        console.error("Error fetching submissions from Supabase:", error)
        return []
      }

      return (data || []).map(mapSubmissionFromDB)
    } catch (error) {
      console.error("Exception fetching submissions:", error)
      return []
    }
  }

  static async getSubmissionById(id: string): Promise<CardSubmission | null> {
    if (!supabaseAdmin) {
      console.warn("⚠️ Supabase not configured")
      return null
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('submissions')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error("Error fetching submission by ID:", error)
        return null
      }

      return data ? mapSubmissionFromDB(data) : null
    } catch (error) {
      console.error("Exception fetching submission:", error)
      return null
    }
  }

  static async createSubmission(submission: Omit<CardSubmission, "id">): Promise<CardSubmission> {
    if (!supabaseAdmin) {
      throw new Error("Supabase not configured")
    }

    try {
      const newSubmission = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        card: submission.card,
        status: submission.status || 'pending',
        submittedby: submission.submittedBy,
        submittedat: new Date().toISOString(),
        reviewedby: submission.reviewedBy || null,
        reviewedat: submission.reviewedAt || null,
        rejectionreason: submission.rejectionReason || null,
        images: submission.images || null,
        metadata: submission.metadata || null,
      }

      const { data, error } = await supabaseAdmin
        .from('submissions')
        .insert([newSubmission])
        .select()
        .single()

      if (error) {
        console.error("Error creating submission:", error)
        throw error
      }

      return mapSubmissionFromDB(data)
    } catch (error) {
      console.error("Exception creating submission:", error)
      throw error
    }
  }

  static async updateSubmission(
    id: string,
    updates: Partial<CardSubmission>
  ): Promise<CardSubmission | null> {
    if (!supabaseAdmin) {
      console.warn("⚠️ Supabase not configured")
      return null
    }

    try {
      const updateData: any = {}
      
      if (updates.status) updateData.status = updates.status
      if (updates.reviewedBy) updateData.reviewedby = updates.reviewedBy
      if (updates.reviewedAt) updateData.reviewedat = updates.reviewedAt
      if (updates.rejectionReason) updateData.rejectionreason = updates.rejectionReason
      if (updates.card) updateData.card = updates.card

      const { data, error } = await supabaseAdmin
        .from('submissions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error("Error updating submission:", error)
        return null
      }

      return data ? mapSubmissionFromDB(data) : null
    } catch (error) {
      console.error("Exception updating submission:", error)
      return null
    }
  }

  static async approveSubmission(id: string, approvedBy: string): Promise<Card | null> {
    const submission = await this.getSubmissionById(id)
    if (!submission) return null

    // Actualizar submission
    await this.updateSubmission(id, {
      status: "approved",
      reviewedBy: approvedBy,
      reviewedAt: new Date().toISOString(),
    })

    // Crear o actualizar card
    const card = await this.createCard({
      ...submission.card,
      id: submission.card.id || `card_${Date.now()}`,
      status: "approved",
      approvedBy,
    } as Card)

    return card
  }

  static async rejectSubmission(id: string, rejectedBy: string, reason: string): Promise<boolean> {
    const submission = await this.getSubmissionById(id)
    if (!submission) return false

    await this.updateSubmission(id, {
      status: "rejected",
      reviewedBy: rejectedBy,
      reviewedAt: new Date().toISOString(),
      rejectionReason: reason,
    })

    return true
  }

  // Activity Logs - Connected to Supabase
  static async createLog(log: Omit<ActivityLog, "id" | "timestamp">): Promise<ActivityLog> {
    if (!supabaseAdmin) {
      console.warn("⚠️ Supabase not configured, log not saved")
      return {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...log,
      }
    }

    try {
      const newLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userid: log.userId,
        action: log.action,
        entitytype: log.entityType,
        entityid: log.entityId,
        details: log.details || null,
        timestamp: new Date().toISOString(),
      }

      const { data, error } = await supabaseAdmin
        .from('logs')
        .insert([newLog])
        .select()
        .single()

      if (error) {
        console.error("Error creating log:", error)
        throw error
      }

      return mapLogFromDB(data)
    } catch (error) {
      console.error("Exception creating log:", error)
      throw error
    }
  }

  static async getLogs(limit = 100): Promise<ActivityLog[]> {
    if (!supabaseAdmin) {
      console.warn("⚠️ Supabase not configured, returning empty logs")
      return []
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) {
        console.error("Error fetching logs from Supabase:", error)
        return []
      }

      return (data || []).map(mapLogFromDB)
    } catch (error) {
      console.error("Exception fetching logs:", error)
      return []
    }
  }

  // Initialize with mock data
  static initialize(cards: Card[]) {
    this.cards = cards.map((card) => ({
      ...card,
      status: card.status || "approved",
      language: card.language || "en",
      version: card.version || "normal",
      stock: card.stock || 10,
    }))
  }
}

