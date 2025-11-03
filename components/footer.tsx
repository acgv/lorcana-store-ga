"use client"

import Link from "next/link"
import { Instagram, Music2, Mail, Phone } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { LanguageSelector } from "@/components/language-selector"

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="border-t border-border/40 bg-card/50 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-display text-lg font-bold mb-4 text-primary">Lorcana Singles</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("heroSubtitle")}</p>
          </div>
          <div>
            <h4 className="font-medium mb-4">Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t("about")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t("contact")}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  {t("privacy")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-4">Follow Us</h4>
            <div className="flex gap-4">
              <a 
                href="https://instagram.com/arte.grafico.sublimable" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                title="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="https://tiktok.com/@arte.grafico.sublimable" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                title="TikTok"
              >
                <Music2 className="h-5 w-5" />
              </a>
              <a 
                href="mailto:ga.company.contact@gmail.com"
                className="text-muted-foreground hover:text-primary transition-colors"
                title="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
              <a 
                href="https://wa.me/56951830357"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                title="WhatsApp"
              >
                <Phone className="h-5 w-5" />
              </a>
            </div>
            <div className="mt-4">
              <LanguageSelector />
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
          {t("copyright")}
        </div>
      </div>
    </footer>
  )
}
