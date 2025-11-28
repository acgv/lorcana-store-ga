"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { useUser } from "@/hooks/use-user"
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
  Home, Briefcase, Smartphone, Building
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

export default function MyProfilePage() {
  const { t } = useLanguage()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { toast } = useToast()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [addresses, setAddresses] = useState<UserAddress[]>([])
  const [phones, setPhones] = useState<UserPhone[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold mb-2">Mi Perfil</h1>
          <p className="text-muted-foreground">
            Gestiona tu información personal, direcciones y teléfonos
          </p>
        </div>

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

