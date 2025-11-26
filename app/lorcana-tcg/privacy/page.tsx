"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Lock, Eye, Database, UserCheck, FileText, Mail, Clock } from "lucide-react"

export default function PrivacyPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Encabezado */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="font-serif text-3xl md:text-4xl font-bold">Política de Privacidad</h1>
            </div>
            <p className="text-muted-foreground">
              Última actualización: <strong>3 de noviembre de 2025</strong>
            </p>
            <p className="text-muted-foreground mt-2">
              En <strong className="text-foreground">GA Company</strong>, nos comprometemos a proteger tu privacidad. 
              Esta política explica cómo recopilamos, usamos y protegemos tu información personal.
            </p>
          </div>

          {/* Navegación rápida */}
          <Card className="mb-8 bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Contenido</CardTitle>
            </CardHeader>
            <CardContent>
              <nav className="grid sm:grid-cols-2 gap-2 text-sm">
                <a href="#informacion-recopilada" className="text-primary hover:underline">1. Información que Recopilamos</a>
                <a href="#uso-informacion" className="text-primary hover:underline">2. Cómo Usamos tu Información</a>
                <a href="#cookies" className="text-primary hover:underline">3. Cookies y Tecnologías</a>
                <a href="#compartir-datos" className="text-primary hover:underline">4. Compartir Información</a>
                <a href="#seguridad" className="text-primary hover:underline">5. Seguridad de Datos</a>
                <a href="#tus-derechos" className="text-primary hover:underline">6. Tus Derechos</a>
                <a href="#menores" className="text-primary hover:underline">7. Privacidad de Menores</a>
                <a href="#cambios" className="text-primary hover:underline">8. Cambios a esta Política</a>
                <a href="#contacto" className="text-primary hover:underline">9. Contáctanos</a>
              </nav>
            </CardContent>
          </Card>

          {/* Sección 1: Información que Recopilamos */}
          <section id="informacion-recopilada" className="mb-8 scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">1. Información que Recopilamos</h2>
            </div>
            
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">Información que Proporcionas Directamente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Cuando usas nuestro sitio web, podemos recopilar:</p>
                <ul className="space-y-2 ml-4">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span><strong className="text-foreground">Información de contacto:</strong> nombre, correo electrónico, número de teléfono</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span><strong className="text-foreground">Información de cuenta:</strong> nombre de usuario, preferencias</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span><strong className="text-foreground">Información de compra:</strong> historial de pedidos, cartas guardadas en favoritos</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span><strong className="text-foreground">Comunicaciones:</strong> mensajes que nos envías, consultas sobre productos</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información Recopilada Automáticamente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Cuando visitas nuestro sitio, recopilamos automáticamente:</p>
                <ul className="space-y-2 ml-4">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span><strong className="text-foreground">Datos de navegación:</strong> páginas visitadas, tiempo en el sitio, clics</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span><strong className="text-foreground">Información del dispositivo:</strong> tipo de dispositivo, navegador, sistema operativo</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span><strong className="text-foreground">Dirección IP:</strong> para seguridad y análisis de tráfico</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span><strong className="text-foreground">Cookies:</strong> para mejorar tu experiencia (ver sección de Cookies)</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Sección 2: Cómo Usamos tu Información */}
          <section id="uso-informacion" className="mb-8 scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">2. Cómo Usamos tu Información</h2>
            </div>
            
            <Card>
              <CardContent className="pt-6 space-y-3 text-sm text-muted-foreground">
                <p>Usamos tu información para:</p>
                <div className="grid sm:grid-cols-2 gap-3 mt-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-semibold text-foreground mb-1">🛒 Procesar Pedidos</h4>
                    <p className="text-xs">Gestionar compras, envíos y comunicarnos sobre el estado de tu pedido</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-semibold text-foreground mb-1">💬 Atención al Cliente</h4>
                    <p className="text-xs">Responder consultas, resolver problemas y brindarte soporte</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-semibold text-foreground mb-1">📧 Comunicaciones</h4>
                    <p className="text-xs">Enviarte actualizaciones de inventario, novedades de Lorcana (si lo autorizas)</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-semibold text-foreground mb-1">🔒 Seguridad</h4>
                    <p className="text-xs">Prevenir fraude, proteger tu cuenta y garantizar la seguridad del sitio</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-semibold text-foreground mb-1">📊 Mejoras del Sitio</h4>
                    <p className="text-xs">Analizar el uso del sitio para mejorar la experiencia del usuario</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-semibold text-foreground mb-1">⚖️ Cumplimiento Legal</h4>
                    <p className="text-xs">Cumplir con obligaciones legales y regulatorias</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Sección 3: Cookies */}
          <section id="cookies" className="mb-8 scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">3. Cookies y Tecnologías de Seguimiento</h2>
            </div>
            
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">¿Qué son las Cookies?</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>
                  Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas un sitio web. 
                  Nos ayudan a recordar tus preferencias y mejorar tu experiencia.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tipos de Cookies que Usamos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="space-y-3">
                  <div className="border-l-4 border-primary pl-3">
                    <h4 className="font-semibold text-foreground">Cookies Esenciales</h4>
                    <p className="text-xs mt-1">Necesarias para el funcionamiento del sitio (navegación, seguridad, sesión)</p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-3">
                    <h4 className="font-semibold text-foreground">Cookies de Rendimiento</h4>
                    <p className="text-xs mt-1">Nos ayudan a entender cómo usas el sitio y mejorar el rendimiento</p>
                  </div>
                  <div className="border-l-4 border-purple-500 pl-3">
                    <h4 className="font-semibold text-foreground">Cookies de Funcionalidad</h4>
                    <p className="text-xs mt-1">Recuerdan tus preferencias (idioma, cartas favoritas, filtros aplicados)</p>
                  </div>
                  <div className="border-l-4 border-amber-500 pl-3">
                    <h4 className="font-semibold text-foreground">Cookies de Terceros</h4>
                    <p className="text-xs mt-1">Vercel Analytics para métricas de uso del sitio (anónimas)</p>
                  </div>
                </div>
                <p className="mt-4 p-3 bg-muted rounded-lg text-xs">
                  <strong className="text-foreground">Control de Cookies:</strong> Puedes configurar tu navegador para rechazar cookies, 
                  pero algunas funciones del sitio podrían no funcionar correctamente.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Sección 4: Compartir Información */}
          <section id="compartir-datos" className="mb-8 scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <UserCheck className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">4. Compartir Información con Terceros</h2>
            </div>
            
            <Card>
              <CardContent className="pt-6 space-y-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">
                  No vendemos ni alquilamos tu información personal a terceros.
                </p>
                <p>Podemos compartir tu información únicamente en estos casos:</p>
                <ul className="space-y-2 ml-4">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span><strong className="text-foreground">Proveedores de servicios:</strong> Empresas que nos ayudan con envíos, pagos o hosting (están obligados a proteger tu información)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span><strong className="text-foreground">Cumplimiento legal:</strong> Si la ley lo requiere o para proteger nuestros derechos</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span><strong className="text-foreground">Con tu consentimiento:</strong> Si nos das permiso explícito para compartir tu información</span>
                  </li>
                </ul>
                <div className="p-3 bg-primary/10 rounded-lg mt-4">
                  <p className="text-xs text-primary font-medium">
                    🔒 Todos los terceros con los que trabajamos cumplen con estrictas normas de privacidad y seguridad.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Sección 5: Seguridad */}
          <section id="seguridad" className="mb-8 scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">5. Seguridad de tus Datos</h2>
            </div>
            
            <Card>
              <CardContent className="pt-6 space-y-4 text-sm text-muted-foreground">
                <p>
                  Implementamos medidas de seguridad técnicas y organizativas para proteger tu información contra 
                  acceso no autorizado, pérdida, alteración o divulgación.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-semibold text-foreground mb-1">🔐 Cifrado SSL/TLS</h4>
                    <p className="text-xs">Todas las comunicaciones están cifradas</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-semibold text-foreground mb-1">🛡️ Acceso Restringido</h4>
                    <p className="text-xs">Solo personal autorizado accede a datos</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-semibold text-foreground mb-1">💾 Backups Seguros</h4>
                    <p className="text-xs">Respaldos regulares y protegidos</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-semibold text-foreground mb-1">🔍 Monitoreo</h4>
                    <p className="text-xs">Vigilancia continua de seguridad</p>
                  </div>
                </div>
                <p className="mt-4 text-xs italic">
                  <strong className="text-foreground">Nota:</strong> Ningún sistema es 100% seguro. Te recomendamos usar contraseñas fuertes 
                  y no compartir tu información de acceso.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Sección 6: Tus Derechos */}
          <section id="tus-derechos" className="mb-8 scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">6. Tus Derechos de Privacidad</h2>
            </div>
            
            <Card>
              <CardContent className="pt-6 space-y-4 text-sm text-muted-foreground">
                <p>Tienes derecho a:</p>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <span className="text-xl">📋</span>
                    <div>
                      <h4 className="font-semibold text-foreground">Acceder a tus Datos</h4>
                      <p className="text-xs">Solicitar una copia de la información que tenemos sobre ti</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xl">✏️</span>
                    <div>
                      <h4 className="font-semibold text-foreground">Rectificar Datos</h4>
                      <p className="text-xs">Corregir información inexacta o incompleta</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xl">🗑️</span>
                    <div>
                      <h4 className="font-semibold text-foreground">Eliminar tus Datos</h4>
                      <p className="text-xs">Solicitar la eliminación de tu información (con excepciones legales)</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xl">⛔</span>
                    <div>
                      <h4 className="font-semibold text-foreground">Oponerte al Procesamiento</h4>
                      <p className="text-xs">Rechazar ciertos usos de tu información (como marketing)</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xl">📦</span>
                    <div>
                      <h4 className="font-semibold text-foreground">Portabilidad de Datos</h4>
                      <p className="text-xs">Recibir tus datos en un formato estructurado y común</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xl">🚫</span>
                    <div>
                      <h4 className="font-semibold text-foreground">Retirar Consentimiento</h4>
                      <p className="text-xs">Cancelar permisos previos en cualquier momento</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg mt-4">
                  <p className="text-xs font-medium text-foreground mb-2">Para ejercer tus derechos:</p>
                  <p className="text-xs">
                    Contáctanos en{" "}
                    <a href="mailto:ga.company.contact@gmail.com" className="text-primary hover:underline">
                      ga.company.contact@gmail.com
                    </a>
                    {" "}o llama al{" "}
                    <a href="tel:+56951830357" className="text-primary hover:underline">
                      +56 9 5183 0357
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Sección 7: Menores */}
          <section id="menores" className="mb-8 scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <UserCheck className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">7. Privacidad de Menores de Edad</h2>
            </div>
            
            <Card>
              <CardContent className="pt-6 space-y-3 text-sm text-muted-foreground">
                <p>
                  Nuestro sitio no está dirigido a menores de 13 años. No recopilamos intencionalmente información personal 
                  de niños menores de 13 años sin el consentimiento de los padres.
                </p>
                <p>
                  Si eres padre o tutor y descubres que tu hijo nos ha proporcionado información personal sin tu consentimiento, 
                  contáctanos inmediatamente y eliminaremos esa información de nuestros registros.
                </p>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-400">
                    ⚠️ Si eres menor de 18 años, te recomendamos usar este sitio con la supervisión de un adulto.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Sección 8: Cambios */}
          <section id="cambios" className="mb-8 scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">8. Cambios a esta Política</h2>
            </div>
            
            <Card>
              <CardContent className="pt-6 space-y-3 text-sm text-muted-foreground">
                <p>
                  Podemos actualizar esta Política de Privacidad ocasionalmente para reflejar cambios en nuestras prácticas 
                  o por razones legales.
                </p>
                <p>
                  Cuando hagamos cambios significativos, te notificaremos mediante:
                </p>
                <ul className="ml-4 space-y-1">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Un aviso destacado en nuestro sitio web</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Un correo electrónico a tu dirección registrada (si aplica)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>Actualización de la fecha "Última actualización" al inicio de esta página</span>
                  </li>
                </ul>
                <p className="mt-4 p-3 bg-muted rounded-lg text-xs">
                  Te recomendamos revisar esta política periódicamente para mantenerte informado sobre cómo protegemos tu información.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Sección 9: Contacto */}
          <section id="contacto" className="mb-8 scroll-mt-20">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">9. Contáctanos</h2>
            </div>
            
            <Card>
              <CardContent className="pt-6 space-y-4 text-sm text-muted-foreground">
                <p>
                  Si tienes preguntas, inquietudes o solicitudes sobre esta Política de Privacidad o cómo manejamos 
                  tu información personal, no dudes en contactarnos:
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      Correo Electrónico
                    </h4>
                    <a href="mailto:ga.company.contact@gmail.com" className="text-primary hover:underline">
                      ga.company.contact@gmail.com
                    </a>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      <span className="text-primary">📱</span>
                      Teléfono / WhatsApp
                    </h4>
                    <a href="tel:+56951830357" className="text-primary hover:underline">
                      +56 9 5183 0357
                    </a>
                  </div>
                </div>
                <p className="mt-4 text-xs">
                  <strong className="text-foreground">Tiempo de respuesta:</strong> Nos comprometemos a responder tus consultas 
                  en un plazo máximo de 48 horas hábiles.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Banner final */}
          <div className="p-6 md:p-8 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
            <h3 className="font-serif text-xl font-bold mb-3 text-center">
              Tu Privacidad es Nuestra Prioridad
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-2xl mx-auto">
              Estamos comprometidos con la protección de tu información personal. Si tienes alguna duda o necesitas ejercer 
              tus derechos de privacidad, estamos aquí para ayudarte.
            </p>
            <div className="flex justify-center mt-6">
              <a
                href="/lorcana-tcg/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
              >
                <Mail className="h-4 w-4" />
                Contáctanos
              </a>
            </div>
          </div>
          
          {/* Legal Information Section */}
          <div className="mt-12 pt-8 border-t border-border/40">
            <div className="text-center space-y-3">
              <h3 className="font-serif text-lg font-bold text-foreground">
                Información Legal
              </h3>
              <div className="space-y-2 max-w-2xl mx-auto">
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
        </div>
      </main>
      <Footer />
    </div>
  )
}

