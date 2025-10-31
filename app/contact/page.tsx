"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"

export default function ContactPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="font-serif text-4xl font-bold mb-8">{t("contact")}</h1>
        <p className="text-muted-foreground">Coming soon...</p>
      </main>
      <Footer />
    </div>
  )
}
