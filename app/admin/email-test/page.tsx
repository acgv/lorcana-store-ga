"use client"

import { useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Mail, Send, Loader2, CheckCircle, AlertCircle } from "lucide-react"

export default function EmailTestPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("Correo de Prueba - Multiverse Store")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [lastResult, setLastResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !email.includes("@")) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor ingresa un correo electrónico válido",
      })
      return
    }

    setSending(true)
    setLastResult(null)

    try {
      const response = await fetch("/api/admin/send-test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject: subject || undefined,
          message: message || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setLastResult({ success: true, message: data.message })
        toast({
          title: "¡Éxito!",
          description: `Correo enviado exitosamente a ${email}`,
        })
        // Limpiar formulario después de enviar
        setEmail("")
        setSubject("Correo de Prueba - Multiverse Store")
        setMessage("")
      } else {
        setLastResult({ success: false, error: data.error || "Error desconocido" })
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "No se pudo enviar el correo",
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      setLastResult({ success: false, error: errorMessage })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al enviar el correo. Verifica la configuración de email.",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <AdminHeader title="Enviar Correo de Prueba" />
        
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Enviar Correo de Prueba
              </CardTitle>
              <CardDescription>
                Envía un correo de prueba a cualquier dirección para verificar que la configuración de email funciona correctamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendTestEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Destinatario *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={sending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Asunto</Label>
                  <Input
                    id="subject"
                    type="text"
                    placeholder="Correo de Prueba - Multiverse Store"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={sending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mensaje (opcional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Escribe un mensaje personalizado o deja vacío para usar el mensaje por defecto..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    disabled={sending}
                  />
                </div>

                {lastResult && (
                  <div className={`p-4 rounded-lg border ${
                    lastResult.success 
                      ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" 
                      : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                  }`}>
                    <div className="flex items-start gap-2">
                      {lastResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                      )}
                      <div>
                        <p className={`font-medium ${
                          lastResult.success 
                            ? "text-green-800 dark:text-green-200" 
                            : "text-red-800 dark:text-red-200"
                        }`}>
                          {lastResult.success ? "Correo enviado exitosamente" : "Error al enviar correo"}
                        </p>
                        <p className={`text-sm mt-1 ${
                          lastResult.success 
                            ? "text-green-700 dark:text-green-300" 
                            : "text-red-700 dark:text-red-300"
                        }`}>
                          {lastResult.message || lastResult.error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={sending || !email}
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Correo de Prueba
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Notas:</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>El correo se enviará desde la cuenta configurada en las variables de entorno (SMTP_FROM o SMTP_USER)</li>
                  <li>Si no especificas un mensaje, se usará un mensaje por defecto</li>
                  <li>Verifica que las variables de entorno SMTP_* estén correctamente configuradas</li>
                  <li>Revisa la consola del servidor para ver logs detallados del envío</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}

