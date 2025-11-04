"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, CheckCircle, XCircle, Eye } from "lucide-react"
import type { CardSubmission } from "@/lib/types"

export default function SubmissionsPage() {
  const { t } = useLanguage()
  const [submissions, setSubmissions] = useState<CardSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<CardSubmission | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectDialog, setShowRejectDialog] = useState(false)

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const fetchSubmissions = async () => {
    try {
      const res = await fetch("/api/submissions?status=pending")
      const data = await res.json()
      if (data.success) {
        setSubmissions(data.data)
      }
    } catch (error) {
      console.error("Error fetching submissions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (submission: CardSubmission) => {
    try {
      const res = await fetch(`/api/submissions/${submission.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedBy: "admin" }),
      })

      const data = await res.json()
      if (data.success) {
        alert("Card approved and published successfully!")
        fetchSubmissions()
      }
    } catch (error) {
      console.error("Error approving submission:", error)
      alert("Failed to approve submission")
    }
  }

  const handleReject = async () => {
    if (!selectedSubmission || !rejectReason.trim()) {
      alert("Please provide a rejection reason")
      return
    }

    try {
      const res = await fetch(`/api/submissions/${selectedSubmission.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rejectedBy: "admin",
          reason: rejectReason,
        }),
      })

      const data = await res.json()
      if (data.success) {
        alert("Submission rejected")
        setShowRejectDialog(false)
        setRejectReason("")
        setSelectedSubmission(null)
        fetchSubmissions()
      }
    } catch (error) {
      console.error("Error rejecting submission:", error)
      alert("Failed to reject submission")
    }
  }

  return (
    <AuthGuard>
    <div className="min-h-screen bg-background">
      <AdminHeader title="Pending Submissions" />
      
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-4">
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground font-serif">{t("loadingSubmissions")}</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold mb-2">All caught up!</h2>
            <p className="text-muted-foreground font-serif">No pending submissions to review</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {submissions.map((submission) => (
              <Card key={submission.id} className="p-6 border-border hover:border-primary/30 transition-all">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Image */}
                  {submission.images && submission.images.length > 0 && (
                    <div className="relative w-full md:w-48 h-64 flex-shrink-0 rounded overflow-hidden foil-effect">
                      <Image
                        src={submission.images[0] || "/placeholder.svg"}
                        alt={submission.card.name || "Card"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="font-display text-2xl font-bold mb-2 tracking-wide">
                          {submission.card.name}
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant="secondary" className="font-serif">
                            {submission.card.type}
                          </Badge>
                          <Badge variant="outline" className="font-serif">
                            {submission.card.rarity}
                          </Badge>
                          {submission.card.version && (
                            <Badge className="font-serif">{submission.card.version}</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm font-serif">
                      <div>
                        <p className="text-muted-foreground">Set</p>
                        <p className="font-medium">{submission.card.set || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Card Number</p>
                        <p className="font-medium">{submission.card.cardNumber || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Language</p>
                        <p className="font-medium uppercase">{submission.card.language || "EN"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Price</p>
                        <p className="font-medium">${Math.floor(submission.card.price || 0)}</p>
                      </div>
                    </div>

                    {submission.card.description && (
                      <p className="text-sm text-muted-foreground mb-4 font-serif italic">
                        {submission.card.description}
                      </p>
                    )}

                    <div className="text-xs text-muted-foreground mb-4 font-serif">
                      <p>Submitted: {new Date(submission.submittedAt).toLocaleString()}</p>
                      <p>Source: {submission.metadata.source}</p>
                      {submission.metadata.ocrConfidence && (
                        <p>OCR Confidence: {(submission.metadata.ocrConfidence * 100).toFixed(0)}%</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => handleApprove(submission)}
                        className="font-serif font-semibold"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {t("approvePublish")}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setSelectedSubmission(submission)
                          setShowRejectDialog(true)
                        }}
                        className="font-serif font-semibold"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {t("reject")}
                      </Button>
                      <Link href={`/admin/submissions/${submission.id}/edit`}>
                        <Button variant="outline" className="font-serif">
                          <Eye className="h-4 w-4 mr-2" />
                          {t("edit")}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{t("rejectSubmission")}</DialogTitle>
            <DialogDescription className="font-serif">
              Please provide a reason for rejecting this submission. This will be sent to the submitter.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter rejection reason..."
            className="min-h-[120px] font-serif"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRejectDialog(false)} className="font-serif">
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleReject} className="font-serif">
              {t("rejectSubmission")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AuthGuard>
  )
}

