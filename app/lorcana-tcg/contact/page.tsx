"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { Mail, Phone } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ContactPage() {
  const { t } = useLanguage()

  const contactInfo = [
    {
      icon: Mail,
      label: "Email",
      value: "ga.multiverse.store@gmail.com",
      href: "mailto:ga.multiverse.store@gmail.com",
      description: "Escríbenos para cualquier consulta"
    },
    {
      icon: Phone,
      label: "Teléfono",
      value: "+56 9 5183 0357",
      href: "tel:+56951830357",
      description: "Llámanos o envíanos un WhatsApp"
    }
    // Instagram y TikTok ocultos - no relacionados con Lorcana
    // {
    //   icon: Instagram,
    //   label: "Instagram",
    //   value: "@arte.grafico.sublimable",
    //   href: "https://instagram.com/arte.grafico.sublimable",
    //   description: "Síguenos en Instagram"
    // },
    // {
    //   icon: Music2,
    //   label: "TikTok",
    //   value: "@arte.grafico.sublimable",
    //   href: "https://tiktok.com/@arte.grafico.sublimable",
    //   description: "Mira nuestro contenido en TikTok"
    // }
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4 text-center">Contacto y Horarios de Atención</h1>
          <p className="text-muted-foreground text-center mb-8 md:mb-12">
            ¿Tienes alguna pregunta? Estamos aquí para ayudarte
          </p>

          <section className="mb-12">
            <h2 className="font-serif text-xl md:text-2xl font-bold mb-6 text-center">Medios de Contacto</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {contactInfo.map((contact) => {
                const Icon = contact.icon
                return (
                  <Card key={contact.label} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{contact.label}</CardTitle>
                      </div>
                      <CardDescription>{contact.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="outline"
                        className="w-full justify-start border border-border hover:border-orange-500 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:border-orange-500"
                        asChild
                      >
                        <a 
                          href={contact.href} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <span className="truncate">{contact.value}</span>
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
          
          <section className="p-6 md:p-8 bg-muted rounded-lg text-center">
            <h2 className="font-serif text-xl md:text-2xl font-bold mb-3">Horarios</h2>
            <p className="text-muted-foreground">
              Lunes a Sábado: 10:00 AM - 8:00 PM<br />
              Domingo: Cerrado
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
