"use client"

import Link from "next/link"
import Image from "next/image"
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
            <div className="flex gap-4 mb-4">
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
            
            {/* Certification Badge */}
            <div className="mb-4">
              <a
                href="/mercadopago-certificate.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block group transition-transform hover:scale-105"
                title="Desarrollador Certificado por Mercado Pago - Ver Certificado"
              >
                <Image
                  src="/mercadopago-certified-badge.png"
                  alt="Desarrollador Certificado Mercado Pago - Checkout Pro"
                  width={150}
                  height={50}
                  className="opacity-90 group-hover:opacity-100 transition-opacity"
                />
              </a>
            </div>
            
            <div>
              <LanguageSelector />
            </div>
          </div>
        </div>
        
        {/* Legal Information */}
        <div className="mt-6 pt-6 border-t border-border/40">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-foreground">
              © 2025 G&A Company SpA. Todos los derechos reservados.
            </p>
            <p className="text-xs text-muted-foreground">
              "CA Arte Gráfico Sublimable" es una marca registrada de G&A Company SpA en Chile.
            </p>
            <p className="text-xs text-muted-foreground">
              El dominio gacompany.cl es propiedad de G&A Company SpA.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
