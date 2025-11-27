/**
 * Email Service
 * 
 * Envía correos electrónicos usando nodemailer
 * 
 * Variables de entorno requeridas:
 * - SMTP_HOST: Servidor SMTP (ej: smtp.gmail.com)
 * - SMTP_PORT: Puerto SMTP (ej: 587)
 * - SMTP_USER: Usuario SMTP (ej: ga.multiverse.store@gmail.com)
 * - SMTP_PASS: Contraseña SMTP o App Password
 * - SMTP_FROM: Email remitente (ej: ga.multiverse.store@gmail.com)
 */

// Importar nodemailer de forma opcional para no bloquear si no está instalado
let nodemailer: any = null
try {
  nodemailer = require('nodemailer')
} catch (e) {
  console.warn('⚠️ nodemailer not installed. Email functionality will be disabled.')
}

// Crear transporter reutilizable
let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!nodemailer) {
    console.warn('⚠️ nodemailer not available. Email sending will be disabled.')
    return null
  }

  if (!transporter) {
    const host = process.env.SMTP_HOST
    const port = Number(process.env.SMTP_PORT) || 587
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    const from = process.env.SMTP_FROM || user

    if (!host || !user || !pass) {
      console.warn('⚠️ SMTP not configured. Email sending will be disabled.')
      return null
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true para 465, false para otros puertos
      auth: {
        user,
        pass,
      },
    })

    console.log('✅ Email transporter configured')
  }

  return transporter
}

export interface OrderEmailData {
  orderId: string
  paymentId: string
  customerEmail: string
  items: Array<{
    name: string
    quantity: number
    version: 'normal' | 'foil'
    price: number
  }>
  totalAmount: number
  shippingMethod?: string
  shippingAddress?: any
  shippingCost?: number
}

/**
 * Enviar correo de confirmación de compra al cliente
 */
export async function sendOrderConfirmationEmail(data: OrderEmailData) {
  const emailTransporter = getTransporter()
  
  if (!emailTransporter) {
    console.warn('⚠️ Email transporter not available, skipping email send')
    return { success: false, error: 'Email not configured' }
  }

  try {
    const itemsList = data.items
      .map(item => {
        const version = item.version === 'foil' ? 'Foil' : 'Normal'
        return `  • ${item.name} (${version}) x${item.quantity} - $${item.price.toLocaleString()} CLP`
      })
      .join('\n')

    const shippingInfo = data.shippingMethod === 'shipping' && data.shippingAddress
      ? `
📦 Envío a Domicilio
   Dirección: ${data.shippingAddress.street} ${data.shippingAddress.number}
   Comuna: ${data.shippingAddress.commune}
   Ciudad: ${data.shippingAddress.city}
   Región: ${data.shippingAddress.region}
   Costo de envío: $${(data.shippingCost || 0).toLocaleString()} CLP
`
      : data.shippingMethod === 'pickup'
      ? `
📦 Retiro en Persona
   Estación Metro Militares
`
      : ''

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .item { padding: 10px 0; border-bottom: 1px solid #eee; }
    .total { font-size: 20px; font-weight: bold; color: #667eea; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>¡Compra Confirmada! 🎉</h1>
    </div>
    <div class="content">
      <p>Hola,</p>
      <p>Tu compra ha sido procesada exitosamente. Aquí están los detalles:</p>
      
      <div class="order-details">
        <h2>Detalles de la Orden</h2>
        <p><strong>Número de Orden:</strong> ${data.orderId}</p>
        <p><strong>Payment ID:</strong> ${data.paymentId}</p>
        
        <h3>Productos:</h3>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${itemsList}</pre>
        
        ${shippingInfo}
        
        <div class="total">
          <p>Total: $${data.totalAmount.toLocaleString()} CLP</p>
        </div>
      </div>
      
      <p>Nos pondremos en contacto contigo pronto para coordinar la entrega.</p>
      
      <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
      
      <p>¡Gracias por tu compra!</p>
    </div>
    <div class="footer">
      <p>G&A Company SpA - Multiverse Store</p>
      <p>Email: ga.multiverse.store@gmail.com</p>
    </div>
  </div>
</body>
</html>
    `

    const textContent = `
¡Compra Confirmada! 🎉

Hola,

Tu compra ha sido procesada exitosamente. Aquí están los detalles:

Número de Orden: ${data.orderId}
Payment ID: ${data.paymentId}

Productos:
${itemsList}
${shippingInfo}
Total: $${data.totalAmount.toLocaleString()} CLP

Nos pondremos en contacto contigo pronto para coordinar la entrega.

Si tienes alguna pregunta, no dudes en contactarnos.

¡Gracias por tu compra!

G&A Company SpA - Multiverse Store
Email: ga.multiverse.store@gmail.com
    `

    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'ga.multiverse.store@gmail.com'

    await emailTransporter.sendMail({
      from: `"Multiverse Store" <${fromEmail}>`,
      to: data.customerEmail,
      subject: `Confirmación de Compra - Orden ${data.orderId}`,
      text: textContent,
      html: htmlContent,
    })

    console.log(`✅ Order confirmation email sent to ${data.customerEmail}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending order confirmation email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Enviar notificación de nueva compra al administrador
 */
export async function sendAdminNotificationEmail(data: OrderEmailData) {
  const emailTransporter = getTransporter()
  
  if (!emailTransporter) {
    console.warn('⚠️ Email transporter not available, skipping admin notification')
    return { success: false, error: 'Email not configured' }
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'ga.multiverse.store@gmail.com'

  try {
    const itemsList = data.items
      .map(item => {
        const version = item.version === 'foil' ? 'Foil' : 'Normal'
        return `  • ${item.name} (${version}) x${item.quantity} - $${item.price.toLocaleString()} CLP`
      })
      .join('\n')

    const shippingInfo = data.shippingMethod === 'shipping' && data.shippingAddress
      ? `
📦 Envío a Domicilio
   Dirección: ${data.shippingAddress.street} ${data.shippingAddress.number}
   Comuna: ${data.shippingAddress.commune}
   Ciudad: ${data.shippingAddress.city}
   Región: ${data.shippingAddress.region}
   Costo de envío: $${(data.shippingCost || 0).toLocaleString()} CLP
`
      : data.shippingMethod === 'pickup'
      ? `
📦 Retiro en Persona
   Estación Metro Militares
`
      : ''

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .item { padding: 10px 0; border-bottom: 1px solid #eee; }
    .total { font-size: 20px; font-weight: bold; color: #f5576c; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nueva Compra Recibida 🛒</h1>
    </div>
    <div class="content">
      <p>Se ha recibido una nueva compra:</p>
      
      <div class="order-details">
        <h2>Detalles de la Orden</h2>
        <p><strong>Número de Orden:</strong> ${data.orderId}</p>
        <p><strong>Payment ID:</strong> ${data.paymentId}</p>
        <p><strong>Cliente:</strong> ${data.customerEmail}</p>
        
        <h3>Productos:</h3>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${itemsList}</pre>
        
        ${shippingInfo}
        
        <div class="total">
          <p>Total: $${data.totalAmount.toLocaleString()} CLP</p>
        </div>
      </div>
      
      <p>Por favor, procesa esta orden y contacta al cliente para coordinar la entrega.</p>
    </div>
  </div>
</body>
</html>
    `

    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'ga.multiverse.store@gmail.com'

    await emailTransporter.sendMail({
      from: `"Multiverse Store" <${fromEmail}>`,
      to: adminEmail,
      subject: `Nueva Compra - Orden ${data.orderId}`,
      html: htmlContent,
    })

    console.log(`✅ Admin notification email sent to ${adminEmail}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending admin notification email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Enviar correo de prueba a cualquier dirección
 */
export async function sendTestEmail(to: string, subject?: string, message?: string) {
  const emailTransporter = getTransporter()
  
  if (!emailTransporter) {
    console.warn('⚠️ Email transporter not available, skipping test email')
    return { success: false, error: 'Email not configured' }
  }

  const defaultSubject = 'Correo de Prueba - Multiverse Store'
  const defaultMessage = `Este es un correo de prueba desde el panel de administración de Multiverse Store.

Si recibes este correo, significa que la configuración de email está funcionando correctamente y los correos de compra se enviarán sin problemas.`

  const testDate = new Date().toLocaleString('es-CL', { 
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .test-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .message-box { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; white-space: pre-wrap; border-left: 4px solid #667eea; }
    .info-item { padding: 8px 0; border-bottom: 1px solid #eee; }
    .info-item:last-child { border-bottom: none; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📧 Correo de Prueba</h1>
    </div>
    <div class="content">
      <p>Hola,</p>
      <p>Este es un correo de prueba desde el panel de administración de Multiverse Store.</p>
      
      <div class="test-details">
        <h2>Información de Prueba</h2>
        
        <div class="info-item">
          <p><strong>Estado del Sistema:</strong> ✅ Funcionando Correctamente</p>
        </div>
        <div class="info-item">
          <p><strong>Fecha y Hora:</strong> ${testDate}</p>
        </div>
        <div class="info-item">
          <p><strong>Servidor SMTP:</strong> ${process.env.SMTP_HOST || 'Configurado'}</p>
        </div>
        
        ${message ? `
        <h3 style="margin-top: 20px;">Mensaje Personalizado:</h3>
        <div class="message-box">
${message}
        </div>
        ` : `
        <div class="message-box" style="margin-top: 15px;">
${defaultMessage}
        </div>
        `}
      </div>
      
      <p>Si recibes este correo, significa que:</p>
      <ul style="margin-left: 20px;">
        <li>La configuración de email está funcionando correctamente</li>
        <li>Los correos de confirmación de compra se enviarán sin problemas</li>
        <li>Las notificaciones al administrador funcionarán correctamente</li>
      </ul>
      
      <p>Si tienes alguna pregunta sobre la configuración, no dudes en contactarnos.</p>
    </div>
    <div class="footer">
      <p>G&A Company SpA - Multiverse Store</p>
      <p>Email: ga.multiverse.store@gmail.com</p>
    </div>
  </div>
</body>
</html>
  `

  const textContent = `
Correo de Prueba - Multiverse Store

Hola,

Este es un correo de prueba desde el panel de administración de Multiverse Store.

Información de Prueba:
- Estado del Sistema: ✅ Funcionando Correctamente
- Fecha y Hora: ${testDate}
- Servidor SMTP: ${process.env.SMTP_HOST || 'Configurado'}

${message || defaultMessage}

Si recibes este correo, significa que:
- La configuración de email está funcionando correctamente
- Los correos de confirmación de compra se enviarán sin problemas
- Las notificaciones al administrador funcionarán correctamente

Si tienes alguna pregunta sobre la configuración, no dudes en contactarnos.

G&A Company SpA - Multiverse Store
Email: ga.multiverse.store@gmail.com
  `

  try {
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'ga.multiverse.store@gmail.com'

    await emailTransporter.sendMail({
      from: `"Multiverse Store - Admin" <${fromEmail}>`,
      to: to,
      subject: subject || defaultSubject,
      text: textContent,
      html: htmlContent,
    })

    console.log(`✅ Test email sent to ${to}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending test email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

