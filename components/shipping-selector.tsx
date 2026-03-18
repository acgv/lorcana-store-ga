"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/components/language-provider"
import { useUser } from "@/hooks/use-user"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { MapPin, Package, Truck, Plus, Phone } from "lucide-react"
import { 
  SHIPPING_METHODS, 
  SHIPPING_ZONES, 
  SHIPPING_CONFIG,
  calculateShippingCost,
  isFreeShipping 
} from "@/lib/shipping-config"
import { usePromotion } from "@/hooks/use-promotion"

export interface ShippingData {
  method: "pickup" | "shipping"
  zone?: string
  address?: {
    street: string
    number: string
    commune: string
    city: string
    region: string
    postalCode?: string
    notes?: string
  }
  phone?: string
  rut?: string
  cost: number
  // Flags para guardar después de la compra
  saveAddress?: boolean
  savePhone?: boolean
}

interface ShippingSelectorProps {
  cartTotal: number
  onShippingChange: (data: ShippingData) => void
}

interface SavedAddress {
  id: string
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

interface SavedPhone {
  id: string
  phone_number: string
  phone_type: string
  is_default: boolean
}

export function ShippingSelector({ cartTotal, onShippingChange }: ShippingSelectorProps) {
  const { t, language } = useLanguage()
  const { getFinalShippingCost } = usePromotion()
  const { user, isAuthenticated } = useUser()
  
  const [method, setMethod] = useState<"pickup" | "shipping">("shipping")
  const [zone, setZone] = useState<string>("rm")
  const [address, setAddress] = useState({
    street: "",
    number: "",
    commune: "",
    city: "",
    region: "RM",
    postalCode: "",
    notes: "",
  })
  const [phone, setPhone] = useState("")
  const [rut, setRut] = useState("")
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [savedPhones, setSavedPhones] = useState<SavedPhone[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [selectedPhoneId, setSelectedPhoneId] = useState<string | null>(null)
  const [saveAddress, setSaveAddress] = useState(false)
  const [savePhone, setSavePhone] = useState(false)
  const [shippingThresholds, setShippingThresholds] = useState({
    free_shipping_threshold: SHIPPING_CONFIG.freeShippingThreshold,
    zone_rm_cost: SHIPPING_ZONES.find(z => z.id === "rm")?.cost || 5000,
    zone_other_cost: SHIPPING_ZONES.find(z => z.id === "zone2")?.cost || 8000,
    zone_extreme_cost: SHIPPING_ZONES.find(z => z.id === "zone3")?.cost || 12000,
  })

  // Cargar umbrales dinámicos desde la API
  useEffect(() => {
    fetch("/api/shipping-thresholds")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setShippingThresholds({
            free_shipping_threshold: data.data.free_shipping_threshold || SHIPPING_CONFIG.freeShippingThreshold,
            zone_rm_cost: data.data.zone_rm_cost || SHIPPING_ZONES.find(z => z.id === "rm")?.cost || 5000,
            zone_other_cost: data.data.zone_other_cost || SHIPPING_ZONES.find(z => z.id === "zone2")?.cost || 8000,
            zone_extreme_cost: data.data.zone_extreme_cost || SHIPPING_ZONES.find(z => z.id === "zone3")?.cost || 12000,
          })
        }
      })
      .catch(err => {
        console.error("Error loading shipping thresholds:", err)
        // Usar valores por defecto si falla
      })
  }, [])

  // Cargar direcciones y teléfonos guardados si el usuario está autenticado
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // Cargar direcciones
      fetch(`/api/user/addresses?userId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setSavedAddresses(data.data)
            // Si hay una dirección predeterminada, seleccionarla automáticamente
            const defaultAddress = data.data.find((a: SavedAddress) => a.is_default)
            if (defaultAddress) {
              handleSelectAddress(defaultAddress)
            }
          }
        })
        .catch(err => console.error("Error loading addresses:", err))

      // Cargar teléfonos
      fetch(`/api/user/phones?userId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setSavedPhones(data.data)
            // Si hay un teléfono predeterminado, seleccionarlo automáticamente
            const defaultPhone = data.data.find((p: SavedPhone) => p.is_default)
            if (defaultPhone) {
              setPhone(defaultPhone.phone_number)
              setSelectedPhoneId(defaultPhone.id)
            }
          }
        })
        .catch(err => console.error("Error loading phones:", err))
    }
  }, [isAuthenticated, user])

  // Calcular costo de envío usando umbrales dinámicos
  const getZoneCost = (zoneId: string): number => {
    if (zoneId === "rm") return shippingThresholds.zone_rm_cost
    if (zoneId === "zone2") return shippingThresholds.zone_other_cost
    if (zoneId === "zone3") return shippingThresholds.zone_extreme_cost
    return shippingThresholds.zone_other_cost
  }

  const baseShippingCost = method === "pickup" 
    ? 0 
    : (cartTotal >= shippingThresholds.free_shipping_threshold 
        ? 0 
        : getZoneCost(zone))
  const shippingCost = getFinalShippingCost(baseShippingCost, cartTotal)
  const freeShipping = shippingCost === 0 || cartTotal >= shippingThresholds.free_shipping_threshold

  // Función para obtener datos actuales (llamada desde padre al checkout)
  const getShippingData = (): ShippingData => {
    return {
      method,
      zone: method === "shipping" ? zone : undefined,
      address: method === "shipping" ? address : undefined,
      phone: phone || undefined,
      rut: rut || undefined,
      cost: shippingCost,
      saveAddress: isAuthenticated && !selectedAddressId && saveAddress,
      savePhone: isAuthenticated && !selectedPhoneId && savePhone && phone,
    }
  }

  // Actualizar datos de envío cuando cambien (incluyendo dirección y teléfono)
  useEffect(() => {
    onShippingChange(getShippingData())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, zone, shippingCost, address, phone, rut])

  // Función para seleccionar una dirección guardada
  const handleSelectAddress = (savedAddress: SavedAddress) => {
    setSelectedAddressId(savedAddress.id)
    setAddress({
      street: savedAddress.street,
      number: savedAddress.number,
      commune: savedAddress.commune,
      city: savedAddress.city,
      region: savedAddress.region,
      postalCode: savedAddress.postal_code || "",
      notes: savedAddress.additional_info || "",
    })
    // Determinar zona basada en la región
    const regionZone = SHIPPING_ZONES.find(z => 
      z.regions.some(r => r.toLowerCase().includes(savedAddress.region.toLowerCase()))
    )
    if (regionZone) {
      setZone(regionZone.id)
    }
  }

  // Función para seleccionar un teléfono guardado
  const handleSelectPhone = (savedPhone: SavedPhone) => {
    setSelectedPhoneId(savedPhone.id)
    setPhone(savedPhone.phone_number)
  }

  const handleMethodChange = (newMethod: "pickup" | "shipping") => {
    setMethod(newMethod)
  }

  const handleZoneChange = (newZone: string) => {
    setZone(newZone)
    
    // Auto-fill region based on zone
    const selectedZone = SHIPPING_ZONES.find((z) => z.id === newZone)
    if (selectedZone) {
      setAddress({ ...address, region: selectedZone.regions[0] })
    }
  }

  const handleAddressChange = (field: string, value: string) => {
    setAddress({ ...address, [field]: value })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          {t("shippingMethod")}
        </CardTitle>
        <CardDescription>
          {freeShipping && (
            <Badge className="bg-green-500">
              🎉 {t("freeShipping")}
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Método de Envío */}
        <RadioGroup value={method} onValueChange={handleMethodChange}>
          {/* TODO: Re-habilitar retiro en persona si es necesario */}
          {/* Retiro en Metro - OCULTO */}
          {/* <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="pickup" id="pickup" />
            <div className="flex-1">
              <Label htmlFor="pickup" className="font-medium cursor-pointer flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {language === "es" 
                  ? SHIPPING_METHODS[0].nameES 
                  : SHIPPING_METHODS[0].name}
                <Badge variant="secondary">GRATIS</Badge>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                📍 {SHIPPING_CONFIG.pickupLocation.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "es" 
                  ? SHIPPING_CONFIG.pickupLocation.scheduleES
                  : SHIPPING_CONFIG.pickupLocation.scheduleEN}
              </p>
            </div>
          </div> */}

          {/* Envío a Domicilio */}
          <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="shipping" id="shipping" />
            <div className="flex-1">
              <Label htmlFor="shipping" className="font-medium cursor-pointer flex items-center gap-2">
                <Package className="h-4 w-4" />
                {language === "es" 
                  ? SHIPPING_METHODS[1].nameES 
                  : SHIPPING_METHODS[1].name}
                {!freeShipping && (
                  <Badge variant="outline">
                    ${shippingCost.toLocaleString()}
                  </Badge>
                )}
                {freeShipping && (
                  <Badge className="bg-green-500">GRATIS</Badge>
                )}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {language === "es" 
                  ? SHIPPING_METHODS[1].descriptionES 
                  : SHIPPING_METHODS[1].description}
              </p>
            </div>
          </div>
        </RadioGroup>

        {/* Formulario de Envío (solo si método = shipping) */}
        {method === "shipping" && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">{t("shippingAddress")}</h4>

            {/* Selector de direcciones guardadas (solo si está autenticado) */}
            {isAuthenticated && savedAddresses.length > 0 && (
              <div className="space-y-2">
                <Label>Usar dirección guardada</Label>
                <Select
                  value={selectedAddressId || "new"}
                  onValueChange={(value) => {
                    if (value === "new") {
                      setSelectedAddressId(null)
                      setAddress({
                        street: "",
                        number: "",
                        commune: "",
                        city: "",
                        region: "RM",
                        postalCode: "",
                        notes: "",
                      })
                    } else {
                      const selected = savedAddresses.find(a => a.id === value)
                      if (selected) {
                        handleSelectAddress(selected)
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Nueva dirección
                      </div>
                    </SelectItem>
                    {savedAddresses.map((addr) => (
                      <SelectItem key={addr.id} value={addr.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {addr.alias}
                          {addr.is_default && (
                            <Badge variant="default" className="text-xs ml-2">
                              Predeterminada
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Zona de Envío */}
            <div>
              <Label>{t("shippingZone")}</Label>
              <Select value={zone} onValueChange={handleZoneChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIPPING_ZONES.map((z) => {
                    const zoneCost = z.id === "rm" 
                      ? shippingThresholds.zone_rm_cost 
                      : z.id === "zone2"
                      ? shippingThresholds.zone_other_cost
                      : shippingThresholds.zone_extreme_cost
                    return (
                      <SelectItem key={z.id} value={z.id}>
                        {language === "es" ? z.nameES : z.name} - ${zoneCost.toLocaleString()}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {t("estimatedDelivery")}: {SHIPPING_ZONES.find((z) => z.id === zone)?.estimatedDays} {t("businessDays")}
              </p>
            </div>

            {/* Calle */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="text-sm font-medium">
                  {t("street")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Av. Providencia"
                  value={address.street}
                  onChange={(e) => handleAddressChange("street", e.target.value)}
                  required
                  className={!address.street ? "border-red-500/50" : ""}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">
                  {t("number")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="1234"
                  value={address.number}
                  onChange={(e) => handleAddressChange("number", e.target.value)}
                  required
                  className={!address.number ? "border-red-500/50" : ""}
                />
              </div>
            </div>

            {/* Comuna y Ciudad */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-medium">
                  {t("commune")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Las Condes"
                  value={address.commune}
                  onChange={(e) => handleAddressChange("commune", e.target.value)}
                  required
                  className={!address.commune ? "border-red-500/50" : ""}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">
                  {t("city")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Santiago"
                  value={address.city}
                  onChange={(e) => handleAddressChange("city", e.target.value)}
                  required
                  className={!address.city ? "border-red-500/50" : ""}
                />
              </div>
            </div>

            {/* Región */}
            <div>
              <Label className="text-sm font-medium">
                {t("region")} <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Región Metropolitana"
                value={address.region}
                onChange={(e) => handleAddressChange("region", e.target.value)}
                required
                className={!address.region ? "border-red-500/50" : ""}
              />
            </div>

            {/* Código Postal (opcional) */}
            <div>
              <Label>{t("postalCode")} ({t("optional")})</Label>
              <Input
                placeholder="7500000"
                value={address.postalCode}
                onChange={(e) => handleAddressChange("postalCode", e.target.value)}
              />
            </div>

            {/* Notas (opcional) */}
            <div>
              <Label>{t("deliveryNotes")} ({t("optional")})</Label>
              <Input
                placeholder={language === "es" 
                  ? "Ej: Dejar con portero, Timbre 302" 
                  : "e.g., Leave with doorman, Apartment 302"}
                value={address.notes}
                onChange={(e) => handleAddressChange("notes", e.target.value)}
              />
            </div>

            {/* Checkbox para guardar dirección (solo si está autenticado y no es una dirección guardada) */}
            {isAuthenticated && !selectedAddressId && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="save-address"
                  checked={saveAddress}
                  onCheckedChange={(checked) => setSaveAddress(checked === true)}
                />
                <Label htmlFor="save-address" className="text-sm cursor-pointer">
                  Guardar esta dirección para próximas compras
                </Label>
              </div>
            )}

            {/* Teléfono de contacto */}
            <div className="space-y-2 pt-4 border-t">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Teléfono de contacto <span className="text-red-500">*</span>
              </Label>
              
              {/* Selector de teléfonos guardados (solo si está autenticado) */}
              {isAuthenticated && savedPhones.length > 0 && (
                <Select
                  value={selectedPhoneId || "new"}
                  onValueChange={(value) => {
                    if (value === "new") {
                      setSelectedPhoneId(null)
                      setPhone("")
                    } else {
                      const selected = savedPhones.find(p => p.id === value)
                      if (selected) {
                        handleSelectPhone(selected)
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Nuevo teléfono
                      </div>
                    </SelectItem>
                    {savedPhones.map((ph) => (
                      <SelectItem key={ph.id} value={ph.id}>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {ph.phone_number}
                          {ph.is_default && (
                            <Badge variant="default" className="text-xs ml-2">
                              Predeterminado
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Input de teléfono (si no hay teléfonos guardados o seleccionó "nuevo") */}
              {(!isAuthenticated || !selectedPhoneId || savedPhones.length === 0) && (
                <Input
                  placeholder="+56 9 1234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className={!phone ? "border-red-500/50" : ""}
                />
              )}

              {/* Checkbox para guardar teléfono (solo si está autenticado y no es un teléfono guardado) */}
              {isAuthenticated && !selectedPhoneId && phone && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="save-phone"
                    checked={savePhone}
                    onCheckedChange={(checked) => setSavePhone(checked === true)}
                  />
                  <Label htmlFor="save-phone" className="text-sm cursor-pointer">
                    Guardar este teléfono para próximas compras
                  </Label>
                </div>
              )}
            </div>

            {/* RUT para envío */}
            <div className="space-y-2 pt-4 border-t">
              <Label className="flex items-center gap-2">
                RUT <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="12.345.678-9"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                required
                className={!rut ? "border-red-500/50" : ""}
              />
              <p className="text-xs text-muted-foreground">
                Lo usamos solo para el despacho/boleta. (Formato: 12.345.678-9)
              </p>
            </div>
          </div>
        )}

        {/* Resumen de Envío */}
        <div className="pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("shippingCost")}:</span>
            <span className="font-semibold">
              {freeShipping ? (
                <span className="text-green-500">{t("free")}</span>
              ) : (
                `$${shippingCost.toLocaleString()} CLP`
              )}
            </span>
          </div>
          {!freeShipping && cartTotal > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {t("freeShippingInfo")}: ${(shippingThresholds.free_shipping_threshold - cartTotal).toLocaleString()} CLP
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

