# 🔐 Variables de Entorno - Configuración

## 📋 Quick Setup

```bash
# 1. Copia el archivo de ejemplo
cp docs/setup/env.example.txt .env.local

# 2. Genera API keys seguros
openssl rand -base64 32

# 3. Edita .env.local con tus valores
```

---

## 🔑 API Keys (Requeridas para Development)

### MOBILE_API_KEY
**Uso:** Autenticación de la app móvil para enviar cartas

```env
MOBILE_API_KEY=tu_clave_mobile_aqui
```

**Cómo generarla:**
```bash
openssl rand -base64 32
```

### ADMIN_API_KEY
**Uso:** Autenticación para operaciones de admin (bulk updates)

```env
ADMIN_API_KEY=tu_clave_admin_aqui
```

**Cómo generarla:**
```bash
openssl rand -base64 32
```

---

## 🗄️ Database (Opcional - Usa mock DB por defecto)

### Opción 1: Supabase

```env
DATABASE_URL=https://tu-proyecto.supabase.co
DATABASE_KEY=tu_supabase_anon_key
DATABASE_SECRET=tu_supabase_service_role_key
```

**Setup:**
1. Crea cuenta en [Supabase](https://supabase.com)
2. Crea nuevo proyecto
3. Ve a Settings → API
4. Copia URL y keys

### Opción 2: Firebase

```env
FIREBASE_API_KEY=tu_firebase_api_key
FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef
```

**Setup:**
1. Crea proyecto en [Firebase Console](https://console.firebase.google.com)
2. Ve a Project Settings
3. Copia los valores de "Your apps"

---

## 🔐 Authentication (Opcional)

### JWT Secrets

```env
JWT_SECRET=tu_jwt_secret_super_seguro
SESSION_SECRET=tu_session_secret_super_seguro
```

**Cómo generarlas:**
```bash
# JWT Secret
openssl rand -base64 64

# Session Secret
openssl rand -base64 64
```

---

## 🌐 External APIs

### Lorcana API

```env
LORCANA_API_URL=https://api.lorcana-api.com/cards/all
```

**Uso:** Script `import-lorcana-data.js` para importar las 1,837 cartas

**No requiere key** - API pública

---

## 📧 Email & Notifications (Opcional)

### SendGrid

```env
EMAIL_API_KEY=tu_sendgrid_api_key
EMAIL_FROM=noreply@lorcana-store.com
```

**Setup:**
1. Crea cuenta en [SendGrid](https://sendgrid.com)
2. Ve a Settings → API Keys
3. Create API Key

### Mailgun

```env
MAILGUN_API_KEY=tu_mailgun_api_key
MAILGUN_DOMAIN=mg.lorcana-store.com
```

---

## 💳 Payment Gateway (Opcional)

### Stripe

```env
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Setup:**
1. Crea cuenta en [Stripe](https://stripe.com)
2. Ve a Developers → API keys
3. Copia las keys de test

**Para webhooks:**
```bash
stripe listen --forward-to localhost:3002/api/webhooks/stripe
```

---

## 🖼️ Image Storage (Opcional)

### Cloudinary

```env
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

**Setup:**
1. Crea cuenta en [Cloudinary](https://cloudinary.com)
2. Ve a Dashboard
3. Copia los valores

### AWS S3

```env
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=lorcana-cards
```

**Setup:**
1. Crea cuenta en [AWS](https://aws.amazon.com)
2. Ve a IAM → Users → Create User
3. Attach policy: AmazonS3FullAccess
4. Create access keys

---

## 📊 Analytics (Opcional)

### Google Analytics

```env
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

**Setup:**
1. Crea cuenta en [Google Analytics](https://analytics.google.com)
2. Crea propiedad
3. Copia Measurement ID

### Vercel Analytics

```env
# Auto-configurado cuando deploys en Vercel
VERCEL_ANALYTICS_ID=auto
```

---

## 🚩 Feature Flags (Opcional)

Control de features:

```env
# Habilitar/deshabilitar features
ENABLE_CHECKOUT=true
ENABLE_MOBILE_API=true
ENABLE_ADMIN_DASHBOARD=true
ENABLE_ANALYTICS=false
```

---

## 🛠️ Development Only

### Debug Mode

```env
DEBUG=true
LOG_LEVEL=debug
NODE_ENV=development
```

---

## 📝 Archivo Completo de Ejemplo

Crea `.env.local` con:

```env
# ==========================================
# API Keys (REQUERIDAS)
# ==========================================
MOBILE_API_KEY=genera_con_openssl_rand_base64_32
ADMIN_API_KEY=genera_con_openssl_rand_base64_32

# ==========================================
# Database (OPCIONAL - usa mock por defecto)
# ==========================================
# DATABASE_URL=https://tu-proyecto.supabase.co
# DATABASE_KEY=tu_supabase_anon_key

# ==========================================
# Authentication (OPCIONAL)
# ==========================================
# JWT_SECRET=genera_con_openssl_rand_base64_64
# SESSION_SECRET=genera_con_openssl_rand_base64_64

# ==========================================
# External APIs (AUTO-CONFIGURADO)
# ==========================================
LORCANA_API_URL=https://api.lorcana-api.com/cards/all

# ==========================================
# Feature Flags (OPCIONAL)
# ==========================================
ENABLE_CHECKOUT=false
ENABLE_MOBILE_API=true
ENABLE_ADMIN_DASHBOARD=true
```

---

## 🔒 Seguridad

### ⚠️ NUNCA hagas esto:

```bash
❌ git add .env.local
❌ git add .env
❌ Compartir keys en Slack/Discord/Email
❌ Hardcodear keys en el código
❌ Usar mismas keys en dev y prod
```

### ✅ Mejores Prácticas:

```bash
✅ Usa .env.local (está en .gitignore)
✅ Genera keys diferentes para cada entorno
✅ Rota keys regularmente
✅ Usa variables de entorno en hosting (Vercel, Railway)
✅ Usa servicios como Doppler o Vault para secrets
```

---

## 🎯 Setup por Caso de Uso

### Caso 1: Solo Web Store (Development Local)

**Mínimo requerido:**
```env
# Ninguna variable requerida
# Usa mock data por defecto
```

**Recomendado:**
```env
MOBILE_API_KEY=test_mobile_key
ADMIN_API_KEY=test_admin_key
```

---

### Caso 2: Web Store + Mobile App

**Requerido:**
```env
MOBILE_API_KEY=tu_clave_mobile
ADMIN_API_KEY=tu_clave_admin
```

**Recomendado:**
```env
MOBILE_API_KEY=tu_clave_mobile
ADMIN_API_KEY=tu_clave_admin
DATABASE_URL=tu_supabase_url
DATABASE_KEY=tu_supabase_key
```

---

### Caso 3: Producción Completa

**Requerido:**
```env
# API Keys
MOBILE_API_KEY=clave_mobile_produccion
ADMIN_API_KEY=clave_admin_produccion

# Database
DATABASE_URL=tu_database_url
DATABASE_KEY=tu_database_key

# Auth
JWT_SECRET=secret_jwt_produccion
SESSION_SECRET=secret_session_produccion
```

**Recomendado todo lo anterior más:**
```env
# Email
EMAIL_API_KEY=tu_sendgrid_key

# Payment
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# Storage
CLOUDINARY_CLOUD_NAME=tu_cloud
CLOUDINARY_API_KEY=tu_key

# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

---

## 🚀 Configuración en Hosting

### Vercel

1. Ve a Project Settings → Environment Variables
2. Agrega cada variable
3. Selecciona entornos (Production, Preview, Development)
4. Save

### Railway

1. Ve a Variables tab
2. Add Variable
3. Format: `KEY=value`
4. Deploy

### Heroku

```bash
heroku config:set MOBILE_API_KEY=tu_clave
heroku config:set ADMIN_API_KEY=tu_clave
```

---

## 🆘 Troubleshooting

### Error: API returns 401

**Problema:** API key incorrecta o faltante

**Solución:**
1. Verifica `.env.local` existe
2. Reinicia el servidor: `npm run dev`
3. Verifica el header: `x-api-key: tu_clave`

### Error: Cannot connect to database

**Problema:** Variables de database incorrectas

**Solución:**
1. Verifica `DATABASE_URL` es correcto
2. Verifica `DATABASE_KEY` es válido
3. Para dev, comenta database vars (usa mock)

### Error: Module not found

**Problema:** Variables con prefijo incorrecto

**Solución:**
- Variables públicas (frontend): `NEXT_PUBLIC_*`
- Variables privadas (backend): Sin prefijo

---

## 📚 Referencias

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase Setup](https://supabase.com/docs/guides/getting-started)
- [Firebase Setup](https://firebase.google.com/docs/web/setup)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

## 🎉 Setup Exitoso

Si puedes ejecutar:
```bash
npm run dev
```

Y ver la app en http://localhost:3002 **¡Felicitaciones! ✨**

---

<div align="center">

**🔐 Mantén tus secrets seguros 🔐**

[⬆ Volver arriba](#-variables-de-entorno---configuración)

</div>

