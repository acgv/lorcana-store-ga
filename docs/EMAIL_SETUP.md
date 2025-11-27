# Configuración de Email

Este documento explica cómo configurar el servicio de correo electrónico para recibir notificaciones cuando se completa una compra.

## Variables de Entorno Requeridas

Agrega las siguientes variables de entorno en tu archivo `.env.local` o en la configuración de tu plataforma de hosting (Vercel, etc.):

```env
# Configuración SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ga.multiverse.store@gmail.com
SMTP_PASS=tu_app_password_de_gmail
SMTP_FROM=ga.multiverse.store@gmail.com

# Email del administrador (opcional, por defecto usa SMTP_USER)
ADMIN_EMAIL=ga.multiverse.store@gmail.com
```

## Configuración para Gmail

### 1. Habilitar Autenticación de 2 Factores

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. Ve a "Seguridad"
3. Habilita "Verificación en dos pasos"

### 2. Generar App Password

1. Ve a: https://myaccount.google.com/apppasswords
2. Selecciona "Aplicación": "Correo"
3. Selecciona "Dispositivo": "Otro (nombre personalizado)"
4. Ingresa "Multiverse Store"
5. Haz clic en "Generar"
6. Copia la contraseña generada (16 caracteres sin espacios)
7. Usa esta contraseña como `SMTP_PASS`

### 3. Configurar Variables de Entorno

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ga.multiverse.store@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # La contraseña de 16 caracteres generada
SMTP_FROM=ga.multiverse.store@gmail.com
ADMIN_EMAIL=ga.multiverse.store@gmail.com
```

## Otros Proveedores SMTP

### SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=tu_api_key_de_sendgrid
SMTP_FROM=ga.multiverse.store@gmail.com
```

### Mailgun

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=tu_usuario_mailgun
SMTP_PASS=tu_contraseña_mailgun
SMTP_FROM=ga.multiverse.store@gmail.com
```

## Funcionalidad

Cuando se completa una compra exitosamente:

1. **Correo al Cliente**: Se envía un correo de confirmación con:
   - Número de orden
   - Payment ID
   - Lista de productos comprados
   - Información de envío (si aplica)
   - Total pagado

2. **Correo al Administrador**: Se envía una notificación con:
   - Detalles de la nueva compra
   - Información del cliente
   - Lista de productos
   - Información de envío

## Pruebas

Para probar el envío de correos, puedes:

1. Realizar una compra de prueba
2. Verificar los logs en la consola del servidor
3. Revisar la bandeja de entrada del cliente y administrador

## Troubleshooting

### Error: "Email transporter not available"

- Verifica que todas las variables de entorno estén configuradas
- Verifica que las credenciales sean correctas
- Revisa los logs del servidor para más detalles

### Error: "Authentication failed"

- Para Gmail, asegúrate de usar un App Password, no tu contraseña normal
- Verifica que la autenticación de 2 factores esté habilitada
- Verifica que el usuario SMTP sea correcto

### Los correos no llegan

- Revisa la carpeta de spam
- Verifica que el correo del cliente sea válido
- Revisa los logs del servidor para errores
- Verifica que el firewall no esté bloqueando el puerto SMTP

