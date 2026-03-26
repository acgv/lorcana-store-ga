"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/hooks/use-user"
import { supabase } from "@/lib/db"
import { Sparkles } from "lucide-react"

type ChallengeOption = { id: string; text: string }
type ChallengeData = {
  id: string
  date: string
  title: string
  prompt: string
  options: ChallengeOption[]
  explanation?: string | null
}
type LeaderboardRow = {
  rank: number
  user: string
  points: number
  isCorrect: boolean
  createdAt: string
}

export default function DailyChallengePage() {
  const { user, loading } = useUser()
  const [challenge, setChallenge] = useState<ChallengeData | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [myAttempt, setMyAttempt] = useState<{ selected_option: string; is_correct: boolean; points: number } | null>(null)
  const [selectedOption, setSelectedOption] = useState<string>("")
  const [submitResult, setSubmitResult] = useState<{ isCorrect: boolean; points: number; explanation?: string | null } | null>(null)
  const [loadingPage, setLoadingPage] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const alreadyAnswered = useMemo(() => Boolean(myAttempt), [myAttempt])

  const loadChallenge = useCallback(async () => {
    if (!user?.id) return
    setLoadingPage(true)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error("No hay sesión activa")

      const res = await fetch("/api/games/daily-challenge", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "No se pudo cargar el desafío diario")

      setChallenge(json.data.challenge)
      setLeaderboard(json.data.leaderboard || [])
      setMyAttempt(json.data.myAttempt)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingPage(false)
    }
  }, [user?.id])

  useEffect(() => {
    void loadChallenge()
  }, [loadChallenge])

  const submit = useCallback(async () => {
    if (!challenge) return
    if (!selectedOption) return
    setSubmitting(true)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error("No hay sesión activa")

      const res = await fetch("/api/games/daily-challenge", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challengeId: challenge.id,
          selectedOption,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "No se pudo enviar respuesta")
      setSubmitResult(json.data)
      await loadChallenge()
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }, [challenge, loadChallenge, selectedOption])

  if (loading || !user) return null

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-black flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-primary" /> Desafío Diario
            </h1>
            <p className="text-muted-foreground mt-1">Resuelve el reto del día y sube en el ranking.</p>
          </div>
          <Link href="/lorcana-tcg/play">
            <Button variant="outline">Ir a jugar</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-8">
            <CardHeader>
              <CardTitle>{challenge?.title || "Cargando..."}</CardTitle>
              <CardDescription>{challenge?.date || ""}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingPage || !challenge ? (
                <p className="text-muted-foreground">Cargando desafío...</p>
              ) : (
                <>
                  <div className="rounded-lg border bg-muted/20 p-3 text-sm">{challenge.prompt}</div>
                  <div className="grid grid-cols-1 gap-2">
                    {challenge.options.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        className={[
                          "text-left rounded-md border p-3 transition",
                          selectedOption === o.id ? "border-primary bg-primary/10" : "hover:bg-muted/30",
                        ].join(" ")}
                        onClick={() => setSelectedOption(o.id)}
                        disabled={alreadyAnswered}
                      >
                        <span className="font-semibold mr-2">{o.id}.</span>
                        {o.text}
                      </button>
                    ))}
                  </div>
                  {!alreadyAnswered ? (
                    <Button onClick={submit} disabled={!selectedOption || submitting}>
                      {submitting ? "Enviando..." : "Enviar respuesta"}
                    </Button>
                  ) : (
                    <Badge variant="secondary">Ya respondiste hoy</Badge>
                  )}

                  {(submitResult || myAttempt) && (
                    <div className="rounded-lg border p-3 bg-muted/20">
                      <p className="font-medium">
                        {submitResult
                          ? submitResult.isCorrect
                            ? "¡Correcto!"
                            : "No era la óptima"
                          : myAttempt?.is_correct
                            ? "Ya la acertaste hoy"
                            : "Ya participaste hoy"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Puntos: {submitResult?.points ?? myAttempt?.points ?? 0}
                      </p>
                      {(submitResult?.explanation || challenge.explanation) && (
                        <p className="text-sm mt-2">{submitResult?.explanation || challenge.explanation}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Ranking diario</CardTitle>
              <CardDescription>Top 20 del día</CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay intentos hoy.</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((r) => (
                    <div key={`${r.rank}-${r.user}`} className="rounded-md border p-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">#{r.rank} · {r.user}</p>
                        <p className="text-xs text-muted-foreground">{r.isCorrect ? "Correcto" : "Participó"}</p>
                      </div>
                      <Badge>{r.points}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
