"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/components/language-provider"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { MapPin, Package, Truck } from "lucide-react"
import { 
  SHIPPING_METHODS, 
  SHIPPING_ZONES, 
  SHIPPING_CONFIG,
  calculateShippingCost,
  isFreeShipping 
} from "@/lib/shipping-config"

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
  cost: number
}

interface ShippingSelectorProps {
  cartTotal: number
  onShippingChange: (data: ShippingData) => void
}

export function ShippingSelector({ cartTotal, onShippingChange }: ShippingSelectorProps) {
  const { t, language } = useLanguage()
  
  const [method, setMethod] = useState<"pickup" | "shipping">("pickup")
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

  const shippingCost = calculateShippingCost(method, zone, cartTotal)
  const freeShipping = isFreeShipping(cartTotal)

  // Effect to update parent whenever shipping data changes
  useEffect(() => {
    const data: ShippingData = {
      method,
      zone: method === "shipping" ? zone : undefined,
      address: method === "shipping" ? address : undefined,
      cost: shippingCost,
    }
    console.log('📦 ShippingSelector updating parent:', data)
    onShippingChange(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, zone, shippingCost, cartTotal, address.street, address.number, address.commune, address.city])

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
          {/* Retiro en Metro */}
          <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent/50 transition-colors">
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
          </div>

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

            {/* Zona de Envío */}
            <div>
              <Label>{t("shippingZone")}</Label>
              <Select value={zone} onValueChange={handleZoneChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIPPING_ZONES.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {language === "es" ? z.nameES : z.name} - ${z.cost.toLocaleString()}
                    </SelectItem>
                  ))}
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
              {t("freeShippingInfo")}: ${(SHIPPING_CONFIG.freeShippingThreshold - cartTotal).toLocaleString()} CLP
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

