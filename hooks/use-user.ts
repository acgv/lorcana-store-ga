"use client"

import { useEffect, useState } from "react"
import { supabase, supabaseAdmin } from "@/lib/db"
import type { User } from "@supabase/supabase-js"

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        // Save user info to localStorage for admin panel
        const userName = session.user.user_metadata?.name || 
                        session.user.user_metadata?.full_name || 
                        session.user.email?.split('@')[0]
        if (userName) {
          localStorage.setItem('user_name', userName)
          localStorage.setItem('user_email', session.user.email || '')
        }
        checkAdminStatus(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        // Save user info to localStorage
        const userName = session.user.user_metadata?.name || 
                        session.user.user_metadata?.full_name || 
                        session.user.email?.split('@')[0]
        if (userName) {
          localStorage.setItem('user_name', userName)
          localStorage.setItem('user_email', session.user.email || '')
        }
        checkAdminStatus(session.user.id)
      } else {
        setIsAdmin(false)
        setLoading(false)
        // Clear saved user info
        localStorage.removeItem('user_name')
        localStorage.removeItem('user_email')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkAdminStatus = async (userId: string) => {
    try {
      // Check if user has admin role in user_roles table
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle()

      if (error) {
        console.error("Error checking admin status:", error)
        setIsAdmin(false)
      } else {
        setIsAdmin(!!data)
      }
    } catch (error) {
      console.error("Exception checking admin status:", error)
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
  }

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
    isAdmin,
  }
}

