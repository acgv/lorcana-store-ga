import { NextResponse, type NextRequest } from "next/server"
import { supabase } from "@/lib/db"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const redirect = requestUrl.searchParams.get("redirect") || "/submit-card"

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to the specified page or default to submit-card
  return NextResponse.redirect(new URL(redirect, requestUrl.origin))
}

