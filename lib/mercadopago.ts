/**
 * Mercado Pago Integration
 * 
 * Helper para manejar pagos con Mercado Pago
 */

import { MercadoPagoConfig, Preference } from 'mercadopago'

// Configurar cliente de Mercado Pago (solo en servidor)
let client: MercadoPagoConfig | null = null
let preferenceClient: Preference | null = null

function getClient() {
  if (!client && process.env.MERCADOPAGO_ACCESS_TOKEN) {
    const config: any = {
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      options: {
        timeout: 5000,
      }
    }
    
    // Agregar integrator_id a nivel de cliente si existe
    if (process.env.MERCADOPAGO_INTEGRATOR_ID) {
      config.options.integratorId = process.env.MERCADOPAGO_INTEGRATOR_ID
      config.options.platformId = process.env.MERCADOPAGO_INTEGRATOR_ID
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
  customerEmail?: string
  origin?: string // Dominio desde el cual se originó la compra
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
    const preferenceBody: any = {
      items: params.items.map(item => ({
        id: item.id,
        title: `${item.name} (${item.version === 'foil' ? 'Foil' : 'Normal'})`,
        description: `Carta Lorcana: ${item.name}`,
        picture_url: item.image.startsWith('http') ? item.image : `${baseUrl}${item.image}`,
        category_id: 'trading_cards',
        quantity: item.quantity,
        // En CLP los precios deben ser enteros (sin decimales)
        unit_price: Math.round(item.price),
        currency_id: 'CLP',
      })),
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

    // Integrator ID solo en desarrollo (para testing de certificación)
    // NO se envía en producción porque el ID "dev_" causa restricciones
    if (isDev && process.env.MERCADOPAGO_INTEGRATOR_ID) {
      const intId = process.env.MERCADOPAGO_INTEGRATOR_ID
      preferenceBody.integrator_id = intId
      preferenceBody.metadata = {
        integrator_id: intId
      }
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
 * Obtener Public Key para el frontend
 */
export function getPublicKey() {
  return process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || ''
}

