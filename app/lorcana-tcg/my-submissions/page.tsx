"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { useUser } from "@/hooks/use-user"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { FileText, Lock, Loader2, CheckCircle, XCircle, Clock } from "lucide-react"
import type { CardSubmission } from "@/lib/types"

export default function MySubmissionsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { toast } = useToast()
  const [submissions, setSubmissions] = useState<CardSubmission[]>([])
  const [loading, setLoading] = useState(true)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/lorcana-tcg/login?redirect=/lorcana-tcg/my-submissions")
    }
  }, [user, userLoading, router])

  // Fetch user's submissions
  useEffect(() => {
    if (user && !userLoading) {
      fetchSubmissions()
    }
  }, [user, userLoading])

  const fetchSubmissions = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch(`/api/my-submissions?userId=${user.id}`)
      const data = await response.json()

      if (data.success) {
        setSubmissions(data.data || [])
      } else {
        toast({
          variant: "destructive",
          title: t("error"),
          description: data.error || "Failed to load submissions",
        })
      }
    } catch (error) {
      console.error("Error fetching submissions:", error)
      toast({
        variant: "destructive",
        title: t("error"),
        description: "Failed to load your submissions",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500/10 text-green-700 border-green-500/20">
            {t("statusApproved")}
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-700 border-red-500/20">
            {t("statusRejected")}
          </Badge>
        )
      default:
        return (
          <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
            {t("statusPending")}
          </Badge>
        )
    }
  }

  if (userLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t("loadingText")}</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>{t("loginToView")}</CardTitle>
              <CardDescription>{t("signInRequiredDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => router.push("/lorcana-tcg/login?redirect=/lorcana-tcg/my-submissions")}>
                {t("signIn")}
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">{t("mySubmissions")}</h1>
                <p className="text-muted-foreground">{t("mySubmissionsDesc")}</p>
              </div>
              <Button onClick={() => router.push("/lorcana-tcg/submit-card")}>
                <FileText className="h-4 w-4 mr-2" />
                {t("submitCard")}
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Empty State */}
          {!loading && submissions.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t("noSubmissions")}</h3>
                <p className="text-muted-foreground text-center mb-6">{t("noSubmissionsDesc")}</p>
                <Button onClick={() => router.push("/lorcana-tcg/submit-card")}>
                  {t("submitCard")}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Submissions List */}
          {!loading && submissions.length > 0 && (
            <div className="grid gap-6">
              {submissions.map((submission) => (
                <Card key={submission.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(submission.status)}
                          <CardTitle className="text-xl">
                            {submission.card.name || t("untitled")}
                          </CardTitle>
                          {getStatusBadge(submission.status)}
                        </div>
                        <CardDescription className="flex flex-wrap gap-4 text-sm">
                          <span>
                            {t("submittedOn")}:{" "}
                            {new Date(submission.submittedAt).toLocaleDateString()}
                          </span>
                          {submission.reviewedAt && (
                            <span>
                              {t("reviewedOn")}:{" "}
                              {new Date(submission.reviewedAt).toLocaleDateString()}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Card Details */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">{t("set")}:</span>
                          <span className="font-medium">{submission.card.set || t("unknown")}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">{t("type")}:</span>
                          <span className="font-medium">{submission.card.type || t("unknown")}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">{t("rarity")}:</span>
                          <span className="font-medium">{submission.card.rarity || t("unknown")}</span>
                        </div>
                        {submission.card.price > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">{t("suggestedPrice")}:</span>
                            <span className="font-medium">${Math.floor(submission.card.price)} CLP</span>
                          </div>
                        )}
                      </div>

                      {/* Rejection Reason (if rejected) */}
                      {submission.status === "rejected" && submission.rejectionReason && (
                        <div className="md:col-span-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                          <p className="text-sm font-medium text-destructive mb-1">
                            {t("rejectionReason")}:
                          </p>
                          <p className="text-sm text-destructive/80">{submission.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

