"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Send, CheckCircle } from "lucide-react"

export default function SubmitCardPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    set: "",
    rarity: "",
    type: "",
    cardNumber: "",
    description: "",
    imageUrl: "",
    suggestedPrice: "",
    contactEmail: "",
    additionalNotes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Validar campos requeridos
      if (!formData.name || !formData.contactEmail) {
        toast({
          variant: "destructive",
          title: t("error"),
          description: t("fillRequiredFields"),
        })
        setSubmitting(false)
        return
      }

      // Construir el objeto de carta
      const cardData = {
        name: formData.name,
        set: formData.set || "unknown",
        rarity: formData.rarity || "common",
        type: formData.type || "character",
        cardNumber: formData.cardNumber,
        description: formData.description,
        image: formData.imageUrl || "/placeholder.svg",
        price: formData.suggestedPrice ? parseFloat(formData.suggestedPrice) : 0,
        foilPrice: 0,
        normalStock: 0,
        foilStock: 0,
      }

      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          card: cardData,
          submittedBy: formData.contactEmail,
          images: formData.imageUrl ? [formData.imageUrl] : [],
          metadata: {
            source: "web",
            notes: formData.additionalNotes,
          },
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSubmitted(true)
        toast({
          title: t("submissionSuccess"),
          description: t("submissionSuccessDesc"),
        })

        // Limpiar formulario
        setFormData({
          name: "",
          set: "",
          rarity: "",
          type: "",
          cardNumber: "",
          description: "",
          imageUrl: "",
          suggestedPrice: "",
          contactEmail: "",
          additionalNotes: "",
        })
      } else {
        toast({
          variant: "destructive",
          title: t("error"),
          description: data.error || t("submissionError"),
        })
      }
    } catch (error) {
      console.error("Error submitting card:", error)
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("submissionError"),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-primary/10 p-4">
                    <CheckCircle className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl">{t("submissionSuccess")}</CardTitle>
                <CardDescription>{t("submissionSuccessDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("submissionReviewMessage")}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => setSubmitted(false)} variant="outline">
                    {t("submitAnother")}
                  </Button>
                  <Button onClick={() => router.push("/catalog")}>
                    {t("browseCatalog")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="font-display text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              {t("submitCard")}
            </h1>
            <p className="text-muted-foreground text-lg">
              {t("submitCardDescription")}
            </p>
          </div>

          {/* Form */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>{t("cardInformation")}</CardTitle>
              <CardDescription>{t("cardInformationDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Card Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    {t("cardName")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder={t("cardNamePlaceholder")}
                    required
                  />
                </div>

                {/* Row: Set & Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="set">{t("set")}</Label>
                    <Select value={formData.set} onValueChange={(value) => handleChange("set", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectSet")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="firstChapter">{t("firstChapter")}</SelectItem>
                        <SelectItem value="riseOfFloodborn">{t("riseOfFloodborn")}</SelectItem>
                        <SelectItem value="intoInklands">{t("intoInklands")}</SelectItem>
                        <SelectItem value="ursulaReturn">{t("ursulaReturn")}</SelectItem>
                        <SelectItem value="shimmering">{t("shimmering")}</SelectItem>
                        <SelectItem value="azurite">{t("azurite")}</SelectItem>
                        <SelectItem value="unknown">{t("unknown")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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
                </div>

                {/* Row: Rarity & Card Number */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">{t("cardNumber")}</Label>
                    <Input
                      id="cardNumber"
                      value={formData.cardNumber}
                      onChange={(e) => handleChange("cardNumber", e.target.value)}
                      placeholder="101/204"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">{t("description")}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder={t("descriptionPlaceholder")}
                    rows={4}
                  />
                </div>

                {/* Image URL */}
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">{t("imageUrl")}</Label>
                  <Input
                    id="imageUrl"
                    value={formData.imageUrl}
                    onChange={(e) => handleChange("imageUrl", e.target.value)}
                    placeholder="https://example.com/card-image.jpg"
                    type="url"
                  />
                  <p className="text-xs text-muted-foreground">{t("imageUrlHelp")}</p>
                </div>

                {/* Suggested Price */}
                <div className="space-y-2">
                  <Label htmlFor="suggestedPrice">{t("suggestedPrice")}</Label>
                  <Input
                    id="suggestedPrice"
                    value={formData.suggestedPrice}
                    onChange={(e) => handleChange("suggestedPrice", e.target.value)}
                    placeholder="1000"
                    type="number"
                    min="0"
                    step="1"
                  />
                  <p className="text-xs text-muted-foreground">{t("suggestedPriceHelp")}</p>
                </div>

                {/* Contact Email */}
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">
                    {t("contactEmail")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contactEmail"
                    value={formData.contactEmail}
                    onChange={(e) => handleChange("contactEmail", e.target.value)}
                    placeholder="tu@email.com"
                    type="email"
                    required
                  />
                  <p className="text-xs text-muted-foreground">{t("contactEmailHelp")}</p>
                </div>

                {/* Additional Notes */}
                <div className="space-y-2">
                  <Label htmlFor="additionalNotes">{t("additionalNotes")}</Label>
                  <Textarea
                    id="additionalNotes"
                    value={formData.additionalNotes}
                    onChange={(e) => handleChange("additionalNotes", e.target.value)}
                    placeholder={t("additionalNotesPlaceholder")}
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/catalog")}
                  >
                    {t("cancel")}
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("submitting")}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {t("submitCard")}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}

