// Database configuration and helpers
// Para uso con Supabase o Firebase

import type { Card, CardSubmission, ActivityLog } from "./types"
import { createClient } from "@supabase/supabase-js"

// Supabase client (usa variables definidas en .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Mock database para desarrollo (reemplazar con Supabase/Firebase)
export class Database {
  private static cards: Card[] = []
  private static submissions: CardSubmission[] = []
  private static logs: ActivityLog[] = []

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

  // Submissions
  static async getSubmissions(status?: string): Promise<CardSubmission[]> {
    if (status) {
      return this.submissions.filter((s) => s.status === status)
    }
    return this.submissions
  }

  static async getSubmissionById(id: string): Promise<CardSubmission | null> {
    return this.submissions.find((s) => s.id === id) || null
  }

  static async createSubmission(submission: Omit<CardSubmission, "id">): Promise<CardSubmission> {
    const newSubmission = {
      ...submission,
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      submittedAt: new Date().toISOString(),
    }
    this.submissions.push(newSubmission)
    return newSubmission
  }

  static async updateSubmission(
    id: string,
    updates: Partial<CardSubmission>
  ): Promise<CardSubmission | null> {
    const index = this.submissions.findIndex((s) => s.id === id)
    if (index === -1) return null

    this.submissions[index] = {
      ...this.submissions[index],
      ...updates,
    }
    return this.submissions[index]
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

  // Activity Logs
  static async createLog(log: Omit<ActivityLog, "id" | "timestamp">): Promise<ActivityLog> {
    const newLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    }
    this.logs.push(newLog)
    return newLog
  }

  static async getLogs(limit = 100): Promise<ActivityLog[]> {
    return this.logs.slice(-limit).reverse()
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

