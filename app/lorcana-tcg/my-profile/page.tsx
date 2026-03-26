"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { useUser } from "@/hooks/use-user"
import { supabase } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  User, MapPin, Phone, Loader2, Plus, Edit2, Trash2, Save, X, 
  Home, Briefcase, Smartphone, Building, Sparkles, Trophy, Flame
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface UserProfile {
  id?: string
  user_id: string
  first_name?: string
  last_name?: string
  birth_date?: string
  document_type?: string
  document_number?: string
}

interface UserAddress {
  id: string
  user_id: string
  alias: string
  street: string
  number: string
  commune: string
  city: string
  region: string
  postal_code?: string
  additional_info?: string
  is_default: boolean
}

interface UserPhone {
  id: string
  user_id: string
  phone_number: string
  phone_type: string
  country_code: string
  is_default: boolean
  is_verified: boolean
}

interface GameStats {
  totalGames: number
  wins: number
  winRate: number
  bestWinStreak: number
  inkedCards: number
  dailyCorrect: number
  weeklyCompleted: boolean
  xp: number
  level: number
}

interface GameBadge {
  id: string
  name: string
  description: string
  rarity: "common" | "rare" | "epic" | "legendary"
  image?: string
  unlocked: boolean
}

export default function MyProfilePage() {
  const { t } = useLanguage()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { toast } = useToast()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [addresses, setAddresses] = useState<UserAddress[]>([])
  const [phones, setPhones] = useState<UserPhone[]>([])
  const [gameStats, setGameStats] = useState<GameStats | null>(null)
  const [gameBadges, setGameBadges] = useState<GameBadge[]>([])
  const [lastUnlockedBadge, setLastUnlockedBadge] = useState<GameBadge | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [spinningBadgeId, setSpinningBadgeId] = useState<string | null>(null)
  const [badgeTheme, setBadgeTheme] = useState<"classic" | "arcane">("arcane")
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const badgeImageSrc = (b: GameBadge | null) => {
    if (!b) return "/placeholder.svg"
    if (badgeTheme === "arcane") return `/badges/arcane/${b.id}.svg`
    return b.image || "/placeholder.svg"
  }

  const playBadgeFlipSound = () => {
    if (!soundEnabled) return
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const now = audioCtx.currentTime
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = "triangle"
      osc.frequency.setValueAtTime(980, now)
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.12)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.07, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start(now)
      osc.stop(now + 0.17)
    } catch {
      // Ignore audio errors silently.
    }
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/lorcana-tcg/login?redirect=/lorcana-tcg/my-profile")
    }
  }, [user, userLoading, router])

  // Load user data
  useEffect(() => {
    if (user?.id) {
      loadUserData()
    }
  }, [user])

  const loadUserData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)

      // Load profile
      const profileRes = await fetch(`/api/user/profile?userId=${user.id}`)
      const profileData = await profileRes.json()
      if (profileData.success) {
        setProfile(profileData.data || { user_id: user.id })
      }

      // Load addresses
      const addressesRes = await fetch(`/api/user/addresses?userId=${user.id}`)
      const addressesData = await addressesRes.json()
      if (addressesData.success) {
        setAddresses(addressesData.data || [])
      }

      // Load phones
      const phonesRes = await fetch(`/api/user/phones?userId=${user.id}`)
      const phonesData = await phonesRes.json()
      if (phonesData.success) {
        setPhones(phonesData.data || [])
      }

      // Load game progression profile (auth token required)
      const { data: authData } = await supabase.auth.getSession()
      const token = authData.session?.access_token
      if (token) {
        const gameRes = await fetch("/api/user/game-profile", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const gameData = await gameRes.json()
        if (gameData.success) {
          const stats = gameData.data.stats || null
          const badges: GameBadge[] = gameData.data.badges || []
          setGameStats(stats)
          setGameBadges(badges)

          // Notifica nuevas insignias desbloqueadas una sola vez por usuario.
          const unlockedIds = badges.filter((b) => b.unlocked).map((b) => b.id)
          const storageKey = `lorcana_seen_badges_${user.id}`
          const seenRaw = localStorage.getItem(storageKey)
          const seen = seenRaw ? (JSON.parse(seenRaw) as string[]) : []
          const newIds = unlockedIds.filter((id) => !seen.includes(id))
          if (newIds.length > 0) {
            const latest = badges.find((b) => b.id === newIds[newIds.length - 1]) || null
            if (latest) {
              setLastUnlockedBadge(latest)
              setShowConfetti(true)
              toast({
                title: "Nueva insignia desbloqueada",
                description: `${latest.name}`,
              })
              window.setTimeout(() => setShowConfetti(false), 1600)
            }
          } else {
            const latestUnlocked = badges.filter((b) => b.unlocked).slice(-1)[0] || null
            setLastUnlockedBadge(latestUnlocked)
          }
          localStorage.setItem(storageKey, JSON.stringify(Array.from(new Set([...seen, ...unlockedIds]))))
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user?.id) return

    try {
      setSaving(true)
      const response = await fetch("/api/user/profile", {
        method: profile?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          ...profile,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "✅ Éxito",
          description: "Perfil actualizado correctamente",
        })
        setProfile(data.data)
      } else {
        throw new Error(data.error || "Error al guardar")
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo guardar el perfil",
      })
    } finally {
      setSaving(false)
    }
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {showConfetti && (
          <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
            {Array.from({ length: 28 }).map((_, i) => {
              const left = (i * 13) % 100
              const delay = (i % 8) * 60
              const colors = ["#f59e0b", "#22d3ee", "#a78bfa", "#34d399", "#fb7185"]
              return (
                <span
                  key={`confetti-${i}`}
                  style={{
                    position: "absolute",
                    left: `${left}%`,
                    top: "-12px",
                    width: 8,
                    height: 14,
                    borderRadius: 2,
                    background: colors[i % colors.length],
                    transform: `rotate(${(i * 29) % 360}deg)`,
                    animation: `badge-confetti 1400ms ease-out ${delay}ms forwards`,
                  }}
                />
              )
            })}
          </div>
        )}
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold mb-2">Mi Perfil</h1>
          <p className="text-muted-foreground">
            Gestiona tu información personal, direcciones y teléfonos
          </p>
        </div>

        <Card className="mb-6 bg-gradient-to-b from-card to-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Progreso Lorcana GA
            </CardTitle>
            <CardDescription>Tu avance, nivel e insignias únicas de la comunidad.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {gameStats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Nivel</p>
                    <p className="text-2xl font-bold">{gameStats.level}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">XP</p>
                    <p className="text-2xl font-bold">{gameStats.xp}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Victorias</p>
                    <p className="text-2xl font-bold">{gameStats.wins}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                    <p className="text-2xl font-bold">{gameStats.winRate}%</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Racha</p>
                    <p className="text-2xl font-bold">{gameStats.bestWinStreak}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Insignias</p>
                    <div className="flex items-center gap-2">
                      <Select
                        value={badgeTheme}
                        onValueChange={(v) => setBadgeTheme(v as "classic" | "arcane")}
                      >
                        <SelectTrigger className="h-8 w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="classic">Classic</SelectItem>
                          <SelectItem value="arcane">Arcane</SelectItem>
                        </SelectContent>
                      </Select>
                      <label className="inline-flex items-center gap-1 text-xs text-muted-foreground border rounded px-2 py-1">
                        <input
                          type="checkbox"
                          checked={soundEnabled}
                          onChange={(e) => setSoundEnabled(e.target.checked)}
                        />
                        sonido
                      </label>
                      <Badge variant="secondary">
                        {gameBadges.filter((b) => b.unlocked).length}/{gameBadges.length}
                      </Badge>
                    </div>
                  </div>
                  {lastUnlockedBadge && (
                    <div className="rounded-md border border-primary/40 bg-primary/10 p-3 flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-md overflow-hidden border border-primary/40 bg-background/60">
                        <Image
                          src={badgeImageSrc(lastUnlockedBadge)}
                          alt={lastUnlockedBadge.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Última insignia ganada</p>
                        <p className="font-medium">{lastUnlockedBadge.name}</p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {gameBadges.map((b) => (
                      <div
                        key={b.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          playBadgeFlipSound()
                          setSpinningBadgeId(b.id)
                          window.setTimeout(() => setSpinningBadgeId((prev) => (prev === b.id ? null : prev)), 750)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            playBadgeFlipSound()
                            setSpinningBadgeId(b.id)
                            window.setTimeout(() => setSpinningBadgeId((prev) => (prev === b.id ? null : prev)), 750)
                          }
                        }}
                        className={[
                          "rounded-md border p-3 cursor-pointer select-none transition hover:scale-[1.01]",
                          b.unlocked ? "bg-primary/10 border-primary/40" : "opacity-60",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <div
                            className={[
                              "relative w-10 h-10 rounded-md overflow-hidden border bg-background/60 shrink-0 badge-coin",
                              spinningBadgeId === b.id ? "badge-coin-spin" : "",
                            ].join(" ")}
                          >
                            <Image
                              src={badgeImageSrc(b)}
                              alt={b.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm line-clamp-1">{b.name}</p>
                            <span className="text-xs uppercase text-muted-foreground">{b.rarity}</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{b.description}</p>
                        <div className="mt-2">
                          {b.unlocked ? (
                            <Badge className="gap-1"><Trophy className="h-3 w-3" /> Desbloqueada</Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1"><Flame className="h-3 w-3" /> Bloqueada</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aún no hay progreso suficiente para mostrar.</p>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Datos Personales
            </TabsTrigger>
            <TabsTrigger value="addresses" className="gap-2">
              <MapPin className="h-4 w-4" />
              Direcciones ({addresses.length}/5)
            </TabsTrigger>
            <TabsTrigger value="phones" className="gap-2">
              <Phone className="h-4 w-4" />
              Teléfonos ({phones.length}/5)
            </TabsTrigger>
          </TabsList>

          {/* Tab: Datos Personales */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Datos Personales</CardTitle>
                <CardDescription>
                  Información básica de tu perfil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Nombre</Label>
                    <Input
                      id="first_name"
                      value={profile?.first_name || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, first_name: e.target.value, user_id: user.id } as UserProfile)
                      }
                      placeholder="Juan"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Apellido</Label>
                    <Input
                      id="last_name"
                      value={profile?.last_name || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, last_name: e.target.value, user_id: user.id } as UserProfile)
                      }
                      placeholder="Pérez"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={profile?.birth_date || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, birth_date: e.target.value, user_id: user.id } as UserProfile)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="document_type">Tipo de Documento</Label>
                    <Select
                      value={profile?.document_type || ""}
                      onValueChange={(value) =>
                        setProfile({ ...profile, document_type: value, user_id: user.id } as UserProfile)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RUT">RUT</SelectItem>
                        <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                        <SelectItem value="Cédula">Cédula</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="document_number">Número de Documento</Label>
                    <Input
                      id="document_number"
                      value={profile?.document_number || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, document_number: e.target.value, user_id: user.id } as UserProfile)
                      }
                      placeholder="12.345.678-9"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Cambios
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Direcciones */}
          <TabsContent value="addresses">
            <AddressesManager
              userId={user.id}
              addresses={addresses}
              onUpdate={loadUserData}
            />
          </TabsContent>

          {/* Tab: Teléfonos */}
          <TabsContent value="phones">
            <PhonesManager
              userId={user.id}
              phones={phones}
              onUpdate={loadUserData}
            />
          </TabsContent>
        </Tabs>
        <style jsx global>{`
          @keyframes badge-confetti {
            0% {
              opacity: 1;
              transform: translateY(0) rotate(0deg);
            }
            100% {
              opacity: 0;
              transform: translateY(80vh) rotate(540deg);
            }
          }
          @keyframes badge-coin-spin {
            0% {
              transform: perspective(400px) rotateY(0deg) scale(1);
              box-shadow: 0 0 0 rgba(0, 0, 0, 0);
            }
            40% {
              transform: perspective(400px) rotateY(180deg) scale(1.15);
              box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
            }
            100% {
              transform: perspective(400px) rotateY(360deg) scale(1);
              box-shadow: 0 0 0 rgba(0, 0, 0, 0);
            }
          }
          .badge-coin {
            transform-style: preserve-3d;
            will-change: transform;
          }
          .badge-coin-spin {
            animation: badge-coin-spin 700ms cubic-bezier(0.2, 0.8, 0.2, 1);
          }
        `}</style>
      </main>
      <Footer />
    </div>
  )
}

// Componente para gestionar direcciones
function AddressesManager({
  userId,
  addresses,
  onUpdate,
}: {
  userId: string
  addresses: UserAddress[]
  onUpdate: () => void
}) {
  const { toast } = useToast()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<UserAddress>>({
    alias: "",
    street: "",
    number: "",
    commune: "",
    city: "",
    region: "",
    postal_code: "",
    additional_info: "",
    is_default: false,
  })

  const handleEdit = (address: UserAddress) => {
    setFormData(address)
    setEditingId(address.id)
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setFormData({
      alias: "",
      street: "",
      number: "",
      commune: "",
      city: "",
      region: "",
      postal_code: "",
      additional_info: "",
      is_default: addresses.length === 0, // Primera dirección es predeterminada
    })
    setEditingId(null)
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.alias || !formData.street || !formData.number || !formData.commune || !formData.city || !formData.region) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
      })
      return
    }

    if (addresses.length >= 5 && !editingId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Máximo 5 direcciones permitidas",
      })
      return
    }

    try {
      const response = editingId
        ? await fetch("/api/user/addresses", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              addressId: editingId,
              userId,
              ...formData,
            }),
          })
        : await fetch("/api/user/addresses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              ...formData,
            }),
          })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "✅ Éxito",
          description: editingId ? "Dirección actualizada" : "Dirección agregada",
        })
        setIsDialogOpen(false)
        onUpdate()
      } else {
        throw new Error(data.error || "Error al guardar")
      }
    } catch (error) {
      console.error("Error saving address:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo guardar la dirección",
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta dirección?")) return

    try {
      const response = await fetch(`/api/user/addresses?addressId=${id}&userId=${userId}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "✅ Éxito",
          description: "Dirección eliminada",
        })
        onUpdate()
      } else {
        throw new Error(data.error || "Error al eliminar")
      }
    } catch (error) {
      console.error("Error deleting address:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar la dirección",
      })
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch("/api/user/addresses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId: id,
          userId,
          is_default: true,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "✅ Éxito",
          description: "Dirección predeterminada actualizada",
        })
        onUpdate()
      } else {
        throw new Error(data.error || "Error al actualizar")
      }
    } catch (error) {
      console.error("Error setting default address:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Direcciones</CardTitle>
            <CardDescription>
              Gestiona tus direcciones de envío (máximo 5)
            </CardDescription>
          </div>
          <Button onClick={handleAdd} disabled={addresses.length >= 5}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Dirección
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {addresses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tienes direcciones guardadas</p>
            <p className="text-sm mt-2">Agrega una dirección para facilitar tus compras</p>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="p-4 border rounded-lg flex items-start justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{address.alias}</h4>
                    {address.is_default && (
                      <Badge variant="default" className="text-xs">
                        Predeterminada
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {address.street} {address.number}
                    {address.additional_info && `, ${address.additional_info}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {address.commune}, {address.city}, {address.region}
                    {address.postal_code && ` (${address.postal_code})`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!address.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(address.id)}
                    >
                      Marcar como predeterminada
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(address)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(address.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dialog para agregar/editar dirección */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Dirección" : "Agregar Dirección"}
              </DialogTitle>
              <DialogDescription>
                Completa los campos para {editingId ? "actualizar" : "agregar"} tu dirección
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="alias">Alias *</Label>
                <Input
                  id="alias"
                  value={formData.alias || ""}
                  onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                  placeholder="Casa, Trabajo, Oficina..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="street">Calle *</Label>
                  <Input
                    id="street"
                    value={formData.street || ""}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Av. Principal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">Número *</Label>
                  <Input
                    id="number"
                    value={formData.number || ""}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="123"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="additional_info">Información Adicional</Label>
                <Input
                  id="additional_info"
                  value={formData.additional_info || ""}
                  onChange={(e) => setFormData({ ...formData, additional_info: e.target.value })}
                  placeholder="Depto 401, Casa color azul..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commune">Comuna *</Label>
                  <Input
                    id="commune"
                    value={formData.commune || ""}
                    onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                    placeholder="Las Condes"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad *</Label>
                  <Input
                    id="city"
                    value={formData.city || ""}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Santiago"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="region">Región *</Label>
                  <Input
                    id="region"
                    value={formData.region || ""}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder="Región Metropolitana"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Código Postal</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code || ""}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="1234567"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default || false}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_default" className="cursor-pointer">
                  Marcar como dirección predeterminada
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                {editingId ? "Actualizar" : "Agregar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// Componente para gestionar teléfonos
function PhonesManager({
  userId,
  phones,
  onUpdate,
}: {
  userId: string
  phones: UserPhone[]
  onUpdate: () => void
}) {
  const { toast } = useToast()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<UserPhone>>({
    phone_number: "",
    phone_type: "mobile",
    country_code: "+56",
    is_default: false,
  })

  const handleEdit = (phone: UserPhone) => {
    setFormData(phone)
    setEditingId(phone.id)
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setFormData({
      phone_number: "",
      phone_type: "mobile",
      country_code: "+56",
      is_default: phones.length === 0, // Primer teléfono es predeterminado
    })
    setEditingId(null)
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.phone_number) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor ingresa un número de teléfono",
      })
      return
    }

    if (phones.length >= 5 && !editingId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Máximo 5 teléfonos permitidos",
      })
      return
    }

    try {
      const response = editingId
        ? await fetch("/api/user/phones", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phoneId: editingId,
              userId,
              ...formData,
            }),
          })
        : await fetch("/api/user/phones", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              ...formData,
            }),
          })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "✅ Éxito",
          description: editingId ? "Teléfono actualizado" : "Teléfono agregado",
        })
        setIsDialogOpen(false)
        onUpdate()
      } else {
        throw new Error(data.error || "Error al guardar")
      }
    } catch (error) {
      console.error("Error saving phone:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo guardar el teléfono",
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este teléfono?")) return

    try {
      const response = await fetch(`/api/user/phones?phoneId=${id}&userId=${userId}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "✅ Éxito",
          description: "Teléfono eliminado",
        })
        onUpdate()
      } else {
        throw new Error(data.error || "Error al eliminar")
      }
    } catch (error) {
      console.error("Error deleting phone:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el teléfono",
      })
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch("/api/user/phones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneId: id,
          userId,
          is_default: true,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "✅ Éxito",
          description: "Teléfono predeterminado actualizado",
        })
        onUpdate()
      } else {
        throw new Error(data.error || "Error al actualizar")
      }
    } catch (error) {
      console.error("Error setting default phone:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar",
      })
    }
  }

  const getPhoneIcon = (type: string) => {
    switch (type) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />
      case "home":
        return <Home className="h-4 w-4" />
      case "work":
        return <Briefcase className="h-4 w-4" />
      default:
        return <Phone className="h-4 w-4" />
    }
  }

  const getPhoneTypeLabel = (type: string) => {
    switch (type) {
      case "mobile":
        return "Móvil"
      case "home":
        return "Casa"
      case "work":
        return "Trabajo"
      default:
        return "Otro"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Teléfonos</CardTitle>
            <CardDescription>
              Gestiona tus números de teléfono (máximo 5)
            </CardDescription>
          </div>
          <Button onClick={handleAdd} disabled={phones.length >= 5}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Teléfono
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {phones.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tienes teléfonos guardados</p>
            <p className="text-sm mt-2">Agrega un teléfono para facilitar tus compras</p>
          </div>
        ) : (
          <div className="space-y-4">
            {phones.map((phone) => (
              <div
                key={phone.id}
                className="p-4 border rounded-lg flex items-start justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getPhoneIcon(phone.phone_type)}
                    <h4 className="font-semibold">{phone.phone_number}</h4>
                    {phone.is_default && (
                      <Badge variant="default" className="text-xs">
                        Predeterminado
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getPhoneTypeLabel(phone.phone_type)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!phone.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(phone.id)}
                    >
                      Marcar como predeterminado
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(phone)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(phone.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dialog para agregar/editar teléfono */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Teléfono" : "Agregar Teléfono"}
              </DialogTitle>
              <DialogDescription>
                Formato: +56 9 1234 5678
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone_number">Número de Teléfono *</Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number || ""}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+56 9 1234 5678"
                />
                <p className="text-xs text-muted-foreground">
                  Formato: +56 9 1234 5678
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_type">Tipo</Label>
                <Select
                  value={formData.phone_type || "mobile"}
                  onValueChange={(value) => setFormData({ ...formData, phone_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile">Móvil</SelectItem>
                    <SelectItem value="home">Casa</SelectItem>
                    <SelectItem value="work">Trabajo</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_default_phone"
                  checked={formData.is_default || false}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_default_phone" className="cursor-pointer">
                  Marcar como teléfono predeterminado
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                {editingId ? "Actualizar" : "Agregar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

