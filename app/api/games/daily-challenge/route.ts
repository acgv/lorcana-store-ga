import { NextRequest, NextResponse } from "next/server"
import { verifySupabaseSession } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

type ChallengeOption = { id: string; text: string }

const FALLBACK_CHALLENGE = {
  title: "Desafío Diario: Línea óptima",
  prompt:
    "Estás en fase main con 3 tinta lista. ¿Qué jugada suele dar mejor tempo para el próximo turno en un escenario neutral?",
  options: [
    { id: "A", text: "Gastar toda la tinta en una carta de coste 3 sin lore inmediato." },
    { id: "B", text: "Jugar una carta de coste 2 y guardar 1 tinta sin plan." },
    { id: "C", text: "Priorizar mesa que habilite quest en el siguiente turno." },
    { id: "D", text: "Pasar turno sin jugar para no arriesgar." },
  ] satisfies ChallengeOption[],
  correctOption: "C",
  explanation:
    "En Lorcana, sostener presencia de mesa y preparar quest consistente suele generar ventaja de lore por turnos.",
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function ensureTodayChallenge(dateKey: string) {
  const { data: existing, error: findErr } = await supabaseAdmin!
    .from("daily_challenges")
    .select("id, challenge_date, title, prompt, options, correct_option, explanation")
    .eq("challenge_date", dateKey)
    .maybeSingle()
  if (findErr) throw findErr
  if (existing) return existing

  const { data: created, error: insertErr } = await supabaseAdmin!
    .from("daily_challenges")
    .insert({
      challenge_date: dateKey,
      title: FALLBACK_CHALLENGE.title,
      prompt: FALLBACK_CHALLENGE.prompt,
      options: FALLBACK_CHALLENGE.options,
      correct_option: FALLBACK_CHALLENGE.correctOption,
      explanation: FALLBACK_CHALLENGE.explanation,
    })
    .select("id, challenge_date, title, prompt, options, correct_option, explanation")
    .single()
  if (insertErr) throw insertErr
  return created
}

export async function GET(request: NextRequest) {
  const auth = await verifySupabaseSession(request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 })
  }

  try {
    const today = ymd(new Date())
    const challenge = await ensureTodayChallenge(today)

    const { data: myAttempt, error: myErr } = await supabaseAdmin
      .from("daily_challenge_attempts")
      .select("selected_option, is_correct, points, created_at")
      .eq("challenge_id", challenge.id)
      .eq("user_id", auth.userId)
      .maybeSingle()
    if (myErr) throw myErr

    const { data: leaderboard, error: lbErr } = await supabaseAdmin
      .from("daily_challenge_attempts")
      .select("user_id, points, is_correct, created_at")
      .eq("challenge_id", challenge.id)
      .order("points", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(20)
    if (lbErr) throw lbErr

    return NextResponse.json({
      success: true,
      data: {
        challenge: {
          id: challenge.id,
          date: challenge.challenge_date,
          title: challenge.title,
          prompt: challenge.prompt,
          options: challenge.options,
          explanation: challenge.explanation,
        },
        myAttempt: myAttempt || null,
        leaderboard:
          (leaderboard || []).map((r, i) => ({
            rank: i + 1,
            user: String(r.user_id).slice(0, 8),
            points: r.points,
            isCorrect: r.is_correct,
            createdAt: r.created_at,
          })) ?? [],
      },
    })
  } catch (e) {
    console.error("daily challenge GET:", e)
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifySupabaseSession(request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 })
  }

  let body: { challengeId?: string; selectedOption?: string }
  try {
    body = (await request.json()) as { challengeId?: string; selectedOption?: string }
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const challengeId = String(body.challengeId || "").trim()
  const selectedOption = String(body.selectedOption || "").trim()
  if (!challengeId || !selectedOption) {
    return NextResponse.json({ success: false, error: "challengeId and selectedOption are required" }, { status: 400 })
  }

  try {
    const { data: challenge, error: cErr } = await supabaseAdmin
      .from("daily_challenges")
      .select("id, correct_option, explanation")
      .eq("id", challengeId)
      .maybeSingle()
    if (cErr) throw cErr
    if (!challenge) return NextResponse.json({ success: false, error: "Challenge not found" }, { status: 404 })

    const isCorrect = selectedOption === challenge.correct_option
    const points = isCorrect ? 100 : 20

    const { error: upErr } = await supabaseAdmin.from("daily_challenge_attempts").upsert(
      {
        challenge_id: challenge.id,
        user_id: auth.userId,
        selected_option: selectedOption,
        is_correct: isCorrect,
        points,
      },
      { onConflict: "challenge_id,user_id" }
    )
    if (upErr) throw upErr

    return NextResponse.json({
      success: true,
      data: {
        isCorrect,
        points,
        explanation: challenge.explanation,
      },
    })
  } catch (e) {
    console.error("daily challenge POST:", e)
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 })
  }
}
