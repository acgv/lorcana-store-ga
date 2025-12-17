"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import type { CardSubmission } from "@/lib/types"

export default function EditSubmissionPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const submissionId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submission, setSubmission] = useState<CardSubmission | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    set: "",
    rarity: "",
    type: "",
    cardNumber: "",
    description: "",
    image: "",
    price: "",
    foilPrice: "",
  })

  useEffect(() => {
    fetchSubmission()
  }, [submissionId])

  const fetchSubmission = async () => {
    try {
      const res = await fetch(`/api/submissions?id=${submissionId}`)
      const data = await res.json()

      if (data.success && data.data.length > 0) {
        const sub = data.data[0]
        setSubmission(sub)
        
        // Populate form with existing data
        setFormData({
          name: sub.card.name || "",
          set: sub.card.set || "",
          rarity: sub.card.rarity || "",
          type: sub.card.type || "",
          cardNumber: sub.card.cardNumber || "",
          description: sub.card.description || "",
          image: sub.card.image || "",
          price: sub.card.price?.toString() || "",
          foilPrice: sub.card.foilPrice?.toString() || "",
        })
      }
    } catch (error) {
      console.error("Error fetching submission:", error)
      toast({
        variant: "destructive",
        title: t("error"),
        description: "Failed to load submission",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const updatedCard = {
        name: formData.name,
        set: formData.set,
        rarity: formData.rarity,
        type: formData.type,
        cardNumber: formData.cardNumber,
        description: formData.description,
        image: formData.image,
        price: formData.price ? parseFloat(formData.price) : 0,
        foilPrice: formData.foilPrice ? parseFloat(formData.foilPrice) : 0,
      }

      const response = await fetch("/api/submissions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: submissionId,
          updates: {
            card: {
              ...submission?.card,
              ...updatedCard,
            },
          },
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: t("success"),
          description: t("submissionUpdated"),
        })
        router.push("/admin/submissions")
      } else {
        toast({
          variant: "destructive",
          title: t("error"),
          description: data.error || "Failed to update submission",
        })
      }
    } catch (error) {
      console.error("Error updating submission:", error)
      toast({
        variant: "destructive",
        title: t("error"),
        description: "Failed to update submission",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex flex-col">
          <AdminHeader title="Edit Submission" />
          <main className="flex-1 container mx-auto px-4 py-8">
            <div className="text-center">{t("loadingText")}</div>
          </main>
          <Footer />
        </div>
      </AuthGuard>
    )
  }

  if (!submission) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex flex-col">
          <AdminHeader title="Edit Submission" />
          <main className="flex-1 container mx-auto px-4 py-8">
            <div className="text-center text-muted-foreground">
              Submission not found
            </div>
          </main>
          <Footer />
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <AdminHeader title="Edit Submission" />
        
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 py-4">
          <Link href="/admin/submissions">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t("goBack")}
            </Button>
          </Link>
        </div>

        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Form */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("editSubmission")}</CardTitle>
                    <CardDescription>{t("editSubmissionDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSave} className="space-y-4">
                      {/* Card Name */}
                      <div className="space-y-2">
                        <Label htmlFor="name">{t("cardName")}</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleChange("name", e.target.value)}
                          required
                        />
                      </div>

                      {/* Set */}
                      <div className="space-y-2">
                        <Label htmlFor="set">{t("set")}</Label>
                        <Select value={formData.set} onValueChange={(value) => handleChange("set", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectSet")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="firstChapter">1. {t("firstChapter")}</SelectItem>
                            <SelectItem value="riseOfFloodborn">2. {t("riseOfFloodborn")}</SelectItem>
                            <SelectItem value="intoInklands">3. {t("intoInklands")}</SelectItem>
                            <SelectItem value="ursulaReturn">4. {t("ursulaReturn")}</SelectItem>
                            <SelectItem value="shimmering">5. {t("shimmering")}</SelectItem>
                            <SelectItem value="azurite">6. {t("azurite")}</SelectItem>
                            <SelectItem value="archazia">7. {t("archazia")}</SelectItem>
                            <SelectItem value="reignOfJafar">8. {t("reignOfJafar")}</SelectItem>
                            <SelectItem value="fabled">9. {t("fabled")}</SelectItem>
                            <SelectItem value="whi">10. {t("whispersInTheWell")}</SelectItem>
                            <SelectItem value="unknown">{t("unknown")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Type */}
                      <div className="space-y-2">
                        <Label htmlFor="type">{t("type")}</Label>
                        <Select value={formData.type} onValueChange={(value) => handleChange("type", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectType")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="character">{t("character")}</SelectItem>
                            <SelectItem value="action">{t("action")}</SelectItem>
                            <SelectItem value="item">{t("item")}</SelectItem>
                            <SelectItem value="song">{t("song")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Rarity */}
                      <div className="space-y-2">
                        <Label htmlFor="rarity">{t("rarity")}</Label>
                        <Select value={formData.rarity} onValueChange={(value) => handleChange("rarity", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectRarity")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="common">{t("common")}</SelectItem>
                            <SelectItem value="uncommon">{t("uncommon")}</SelectItem>
                            <SelectItem value="rare">{t("rare")}</SelectItem>
                            <SelectItem value="superRare">{t("superRare")}</SelectItem>
                            <SelectItem value="legendary">{t("legendary")}</SelectItem>
                            <SelectItem value="enchanted">{t("enchanted")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Card Number */}
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">{t("cardNumber")}</Label>
                        <Input
                          id="cardNumber"
                          value={formData.cardNumber}
                          onChange={(e) => handleChange("cardNumber", e.target.value)}
                          placeholder="101/204"
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <Label htmlFor="description">{t("description")}</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => handleChange("description", e.target.value)}
                          rows={4}
                        />
                      </div>

                      {/* Image URL */}
                      <div className="space-y-2">
                        <Label htmlFor="image">{t("imageUrl")}</Label>
                        <Input
                          id="image"
                          value={formData.image}
                          onChange={(e) => handleChange("image", e.target.value)}
                          type="url"
                        />
                      </div>

                      {/* Prices */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="price">{t("price")}</Label>
                          <Input
                            id="price"
                            value={formData.price}
                            onChange={(e) => handleChange("price", e.target.value)}
                            type="number"
                            min="0"
                            step="1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="foilPrice">{t("foilPriceLabel")}</Label>
                          <Input
                            id="foilPrice"
                            value={formData.foilPrice}
                            onChange={(e) => handleChange("foilPrice", e.target.value)}
                            type="number"
                            min="0"
                            step="1"
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => router.push("/admin/submissions")}
                        >
                          {t("cancel")}
                        </Button>
                        <Button type="submit" disabled={saving} className="flex-1">
                          {saving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              {t("saving")}
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              {t("saveChanges")}
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Preview */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("preview")}</CardTitle>
                    <CardDescription>{t("previewDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Image Preview */}
                      {formData.image && (
                        <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                          <Image
                            src={formData.image}
                            alt={formData.name || "Card preview"}
                            fill
                            className="object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.svg"
                            }}
                          />
                        </div>
                      )}

                      {/* Card Info */}
                      <div>
                        <h3 className="font-display text-2xl font-bold mb-2">
                          {formData.name || t("untitled")}
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {formData.type && (
                            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary capitalize">
                              {t(formData.type)}
                            </span>
                          )}
                          {formData.rarity && (
                            <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent capitalize">
                              {t(formData.rarity)}
                            </span>
                          )}
                        </div>
                      </div>

                      {formData.description && (
                        <p className="text-sm text-muted-foreground italic">
                          {formData.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {formData.set && (
                          <div>
                            <p className="text-muted-foreground">{t("set")}</p>
                            <p className="font-medium">{formData.set}</p>
                          </div>
                        )}
                        {formData.cardNumber && (
                          <div>
                            <p className="text-muted-foreground">{t("cardNumber")}</p>
                            <p className="font-medium">{formData.cardNumber}</p>
                          </div>
                        )}
                        {formData.price && (
                          <div>
                            <p className="text-muted-foreground">{t("price")}</p>
                            <p className="font-medium">${Math.floor(parseFloat(formData.price))}</p>
                          </div>
                        )}
                        {formData.foilPrice && (
                          <div>
                            <p className="text-muted-foreground">{t("foilPriceLabel")}</p>
                            <p className="font-medium">${Math.floor(parseFloat(formData.foilPrice))}</p>
                          </div>
                        )}
                      </div>

                      {/* Submission Info */}
                      {submission && (
                        <div className="pt-4 border-t border-border">
                          <p className="text-xs text-muted-foreground">
                            <strong>{t("submittedBy")}:</strong> {submission.submittedBy}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <strong>{t("submittedAt")}:</strong>{" "}
                            {new Date(submission.submittedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </AuthGuard>
  )
}

