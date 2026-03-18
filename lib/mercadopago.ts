/**
 * Mercado Pago Integration
 * 
 * Sistema de credenciales duales para fácil cambio entre test y producción
 * 
 * Variables de entorno:
 * - MERCADOPAGO_MODE: "test" | "production" (default: "production")
 * - MERCADOPAGO_ACCESS_TOKEN_TEST (credenciales de prueba)
 * - MERCADOPAGO_ACCESS_TOKEN_PROD (credenciales de producción)
 * - NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_TEST
 * - NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_PROD
 * - MERCADOPAGO_INTEGRATOR_ID (solo se usa en desarrollo local)
 */

import { MercadoPagoConfig, Preference } from 'mercadopago'

// Configurar cliente de Mercado Pago (solo en servidor)
let client: MercadoPagoConfig | null = null
let preferenceClient: Preference | null = null

/**
 * Obtener credenciales según el modo configurado
 */
function getCredentials() {
  const mode = process.env.MERCADOPAGO_MODE || 'production'
  const isTestMode = mode === 'test'
  
  const accessToken = isTestMode 
    ? process.env.MERCADOPAGO_ACCESS_TOKEN_TEST 
    : process.env.MERCADOPAGO_ACCESS_TOKEN_PROD
  
  const publicKey = isTestMode
    ? process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_TEST
    : process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_PROD
  
  console.log(`🔧 Mercado Pago Mode: ${mode.toUpperCase()}`)
  if (accessToken) {
    console.log(`✅ Using ${mode.toUpperCase()} credentials`)
    console.log(`   Public Key: ${publicKey?.substring(0, 25)}...`)
  } else {
    console.warn(`⚠️ No ${mode.toUpperCase()} credentials configured`)
  }
  
  return { accessToken, publicKey, mode, isTestMode }
}

export function getClient() {
  if (!client) {
    const { accessToken } = getCredentials()
    
    if (!accessToken) {
      console.error('❌ No Mercado Pago access token found')
      return null
    }
    
    const config: any = {
      accessToken,
      options: {
        timeout: 5000,
      }
    }
    
    // Agregar integrator_id solo en desarrollo local (no en test ni prod)
    const isDev = process.env.NODE_ENV === 'development'
    if (isDev && process.env.MERCADOPAGO_INTEGRATOR_ID) {
      config.options.integratorId = process.env.MERCADOPAGO_INTEGRATOR_ID
      config.options.platformId = process.env.MERCADOPAGO_INTEGRATOR_ID
      console.log('🔑 Using Integrator ID in DEV mode')
    }
    
    client = new MercadoPagoConfig(config)
  }
  return client
}

function getPreferenceClient() {
  if (!preferenceClient) {
    const mpClient = getClient()
    if (mpClient) {
      preferenceClient = new Preference(mpClient)
    }
  }
  return preferenceClient
}

export interface CardItem {
  id: string
  name: string
  image: string
  price: number
  quantity: number
  version: 'normal' | 'foil'
}

export interface CreatePreferenceParams {
  items: CardItem[]
  shipping?: any // Datos de envío
  customerEmail?: string
  userId?: string // user_id autenticado en tu plataforma (para match interno)
  origin?: string // Dominio desde el cual se originó la compra
  saveAddress?: boolean // Guardar dirección después de compra
  savePhone?: boolean // Guardar teléfono después de compra
  phone?: string // Teléfono del cliente
  documentNumber?: string // RUT u otro documento
  documentType?: string // "RUT" por defecto
}

/**
 * Crear preferencia de pago en Mercado Pago
 */
export async function createPaymentPreference(params: CreatePreferenceParams) {
  const preferenceApi = getPreferenceClient()
  
  if (!preferenceApi) {
    throw new Error('Mercado Pago no está configurado. Verifica MERCADOPAGO_ACCESS_TOKEN')
  }

  // Usar el dominio de origen si está disponible, sino fallback a defaults
  const isDev = process.env.NODE_ENV === 'development'
  const defaultUrl = isDev ? 'http://localhost:3002' : (process.env.NEXT_PUBLIC_APP_URL || 'https://lorcana-store-ga.vercel.app')
  const baseUrl = params.origin || defaultUrl
  
  console.log('🌐 Using base URL for redirects:', baseUrl)

  try {
    // Construir items (cartas)
    const mpItems = params.items.map(item => ({
      id: item.id,
      title: `${item.name} (${item.version === 'foil' ? 'Foil' : 'Normal'})`,
      description: `Carta Lorcana: ${item.name}`,
      picture_url: item.image.startsWith('http') ? item.image : `${baseUrl}${item.image}`,
      category_id: 'trading_cards',
      quantity: item.quantity,
      // En CLP los precios deben ser enteros (sin decimales)
      unit_price: Math.round(item.price),
      currency_id: 'CLP',
    }))

    // Agregar envío como item adicional si tiene costo
    if (params.shipping && params.shipping.cost > 0) {
      mpItems.push({
        id: 'shipping',
        title: params.shipping.method === 'pickup' 
          ? 'Retiro en Metro Militares' 
          : `Envío a Domicilio - ${params.shipping.zone?.toUpperCase()}`,
        description: params.shipping.method === 'pickup'
          ? 'Retiro en estación Metro Militares'
          : `Envío a ${params.shipping.address?.commune || 'domicilio'}`,
        picture_url: `${baseUrl}/placeholder.svg`,
        category_id: 'shipping',
        quantity: 1,
        unit_price: Math.round(params.shipping.cost),
        currency_id: 'CLP',
      })
    }

    const preferenceBody: any = {
      items: mpItems,
      // URLs de retorno
      back_urls: {
        success: `${baseUrl}/payment/success`,
        failure: `${baseUrl}/payment/failure`,
        pending: `${baseUrl}/payment/pending`,
      },
      // auto_return solo funciona con URLs públicas (no localhost)
      // En producción: 'approved', en desarrollo: undefined
      ...(isDev ? {} : { auto_return: 'approved' as const }),
      // Configuración de métodos de pago (producción)
      // ✅ Certificación completada - ahora permitimos todos los métodos de pago
      payment_methods: {
        installments: 12, // Hasta 12 cuotas para mejor experiencia
        // Sin exclusiones - permitir VISA, Mastercard, y todos los métodos
      },
      statement_descriptor: 'GA Company',
      external_reference: `order-${Date.now()}`,
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
    }

    // Agregar payer si existe
    if (params.customerEmail) {
      preferenceBody.payer = {
        email: params.customerEmail,
      }
    }

    // Agregar metadata de envío y datos de usuario
    preferenceBody.metadata = {}

    // Guardar user_id para poder hacer match interno en el webhook
    if (params.userId) {
      preferenceBody.metadata.user_id = params.userId
    }
    
    if (params.shipping) {
      preferenceBody.metadata.shipping_method = params.shipping.method
      preferenceBody.metadata.shipping_cost = params.shipping.cost
      preferenceBody.metadata.shipping_zone = params.shipping.zone || 'pickup'
      
      if (params.shipping.address) {
        preferenceBody.metadata.shipping_address = JSON.stringify(params.shipping.address)
      }
      
      console.log('📦 Shipping info added to metadata')
    }

    // Documento (RUT) - solo si viene
    if (params.documentNumber) {
      preferenceBody.metadata.document_type = params.documentType || "RUT"
      preferenceBody.metadata.document_number = String(params.documentNumber)
    }
    
    // Agregar flags de guardado y teléfono
    if (params.saveAddress !== undefined) {
      preferenceBody.metadata.save_address = String(params.saveAddress)
    }
    if (params.savePhone !== undefined) {
      preferenceBody.metadata.save_phone = String(params.savePhone)
    }
    if (params.phone) {
      preferenceBody.metadata.phone = params.phone
    }

    // Integrator ID solo en desarrollo (para testing de certificación)
    // NO se envía en producción porque el ID "dev_" causa restricciones
    if (isDev && process.env.MERCADOPAGO_INTEGRATOR_ID) {
      const intId = process.env.MERCADOPAGO_INTEGRATOR_ID
      preferenceBody.integrator_id = intId
      preferenceBody.metadata.integrator_id = intId
      console.log('🔑 Using Integrator ID in DEV mode:', intId)
    } else if (!isDev) {
      console.log('✅ Production mode: Integrator ID omitted (prevents restrictions)')
    }

    console.log('🔍 Preference Body being sent to Mercado Pago:')
    console.log(JSON.stringify(preferenceBody, null, 2))

    const preference = await preferenceApi.create({
      body: preferenceBody
    })

    return {
      success: true,
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
    }
  } catch (error) {
    console.error('Error creating Mercado Pago preference:', error)
    throw error
  }
}

/**
 * Obtener Public Key para el frontend según el modo configurado
 */
export function getPublicKey() {
  const { publicKey } = getCredentials()
  return publicKey || ''
}

