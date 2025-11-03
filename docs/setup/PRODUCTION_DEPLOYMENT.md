# 🚀 Deployment a Producción - Guía Completa

## Desplegar Lorcana Store de forma segura

---

## ✅ Pre-Deployment Checklist

Antes de desplegar, verifica:

- [ ] ✅ Service Role Key configurado
- [ ] ✅ Usuario admin creado en Supabase
- [ ] ✅ Políticas RLS aplicadas (`scripts/secure-rls-policies.sql`)
- [ ] ✅ Roles de usuario configurados (`scripts/setup-user-roles.sql`)
- [ ] ✅ Rate limiting implementado
- [ ] ✅ CORS configurado
- [ ] ✅ Sin datos sensibles en código
- [ ] ✅ `.env.local` NO está en git
- [ ] ✅ Build funciona: `pnpm build`
- [ ] ✅ Todas las pruebas pasan

---

## 🔒 1. HTTPS (Automático en Vercel)

### **Vercel** ⭐ Recomendado

Vercel configura HTTPS automáticamente:

✅ **Incluido gratis:**
- SSL/TLS certificate (Let's Encrypt)
- Auto-renewal de certificados
- HTTP → HTTPS redirect automático
- HTTP/2 y HTTP/3
- Edge Network global

**No necesitas hacer nada.** HTTPS funciona out-of-the-box.

### **Railway/Render**

También incluyen HTTPS automático:
- SSL certificate incluido
- Auto-renewal
- Redirect HTTP → HTTPS

### **Custom Domain**

Si usas dominio custom:
1. Agrega tu dominio en Vercel Dashboard
2. Configura DNS (A record o CNAME)
3. Vercel emite SSL certificate automáticamente
4. Listo en ~5 minutos

---

## 🌐 2. Deploy a Vercel

### **Paso 1: Preparar Variables de Entorno**

En Vercel Dashboard → Project Settings → Environment Variables:

```bash
# Supabase (REQUERIDO)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # ⚠️ Marcar como "Sensitive"

# App URL (Producción)
NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app
```

**IMPORTANTE:**
- Marca `SUPABASE_SERVICE_ROLE_KEY` como **Encrypted/Sensitive**
- NO marques como "Exposed to Browser"

### **Paso 2: Deploy desde Git**

```bash
# Opción A: Desde CLI
npx vercel --prod

# Opción B: Desde Dashboard
# 1. Ve a vercel.com/new
# 2. Import tu repositorio
# 3. Configura variables de entorno
# 4. Deploy
```

### **Paso 3: Configurar Dominio (Opcional)**

1. Vercel Dashboard → Project → Settings → Domains
2. Agrega tu dominio custom
3. Configura DNS según instrucciones
4. SSL se configura automáticamente

---

## 🔒 3. CORS en Producción

### **Actualizar next.config.mjs:**

Reemplaza `*` con tu dominio real:

```javascript
{
  key: 'Access-Control-Allow-Origin',
  value: 'https://tu-dominio-real.com', // ← Cambiar en producción
}
```

### **Para múltiples dominios:**

```javascript
// En app/api/*/route.ts
const origin = request.headers.get('origin')
const allowedOrigins = [
  'https://tu-dominio.com',
  'https://www.tu-dominio.com',
  'https://app.tu-dominio.com',
]

if (allowedOrigins.includes(origin)) {
  headers.set('Access-Control-Allow-Origin', origin)
}
```

---

## 🛡️ 4. Headers de Seguridad

Ya configurados en `next.config.mjs`:

| Header | Valor | Protección |
|--------|-------|------------|
| `X-Frame-Options` | DENY | Clickjacking |
| `X-Content-Type-Options` | nosniff | MIME sniffing |
| `Referrer-Policy` | strict-origin | Leaks de URL |
| `Permissions-Policy` | restrictive | APIs del navegador |

### **Content Security Policy (CSP)** (Opcional)

Para máxima seguridad, agrega CSP:

```javascript
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://api.lorcana.ravensburger.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  ].join('; ')
}
```

---

## 📊 5. Rate Limiting en Producción

### **Opción A: In-Memory (Actual)** ✅

**Ventajas:**
- ✅ Sin dependencias
- ✅ Funciona inmediatamente
- ✅ Gratis

**Desventajas:**
- ⚠️ Se resetea con cada deploy
- ⚠️ No funciona en múltiples instancias (serverless)

**Uso:** OK para proyectos pequeños

### **Opción B: Upstash Redis** ⭐ Recomendado

Para proyectos en producción con tráfico real:

```bash
# Instalar
pnpm add @upstash/ratelimit @upstash/redis
```

```typescript
// lib/rate-limit-redis.ts
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
})
```

**Ventajas:**
- ✅ Persistente entre deploys
- ✅ Funciona en serverless
- ✅ Plan gratuito: 10,000 requests/día
- ✅ Analytics incluidos

**Setup:**
1. Crea cuenta en [Upstash](https://upstash.com)
2. Crea database Redis
3. Copia URL y Token a `.env.local`
4. Reemplaza `lib/rate-limit.ts` con implementación Redis

---

## 🗄️ 6. Supabase en Producción

### **Verificar Configuración:**

- [ ] Project no está en "Paused" mode
- [ ] SSL mode habilitado
- [ ] Row Level Security habilitado en todas las tablas
- [ ] Backups automáticos configurados
- [ ] Monitoring activo

### **Backups:**

Supabase Free tier:
- ✅ Daily backups (7 días)
- ✅ Point-in-time recovery

Supabase Pro:
- ✅ Daily backups (30 días)
- ✅ Point-in-time recovery (7 días)

### **Monitoreo:**

En Supabase Dashboard → Reports:
- API requests
- Database size
- Active connections
- Query performance

---

## 🔐 7. Variables de Entorno en Vercel

### **Configurar:**

Vercel Dashboard → Project → Settings → Environment Variables

| Variable | Valor | Encrypted | Expo to Browser |
|----------|-------|-----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | https://xxx.supabase.co | ❌ No | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | eyJhbGc... | ❌ No | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | eyJhbGc... | ✅ **YES** | ❌ **NO** |
| `NEXT_PUBLIC_APP_URL` | https://tu-app.vercel.app | ❌ No | ✅ Yes |

**CRÍTICO:**
- ✅ `SUPABASE_SERVICE_ROLE_KEY` debe estar marcada como **Sensitive/Encrypted**
- ❌ `SUPABASE_SERVICE_ROLE_KEY` NO debe estar expuesta al browser

---

## 🧪 8. Testing en Producción

### **Después del deploy:**

#### **Test 1: HTTPS Funciona**
```bash
curl -I https://tu-app.vercel.app
# Debe retornar: 200 OK
# Headers deben incluir: Strict-Transport-Security
```

#### **Test 2: Seguridad (Anon no puede modificar)**
```bash
curl -X POST https://tu-app.vercel.app/api/inventory \
  -H "Content-Type: application/json" \
  -d '{"cardId":"fab-0","price":0.01}'

# Debe retornar: {"success": false, "error": "Unauthorized"}
```

#### **Test 3: Login Funciona**
- Ve a: https://tu-app.vercel.app/admin/login
- Login con credenciales
- Debe entrar al dashboard

#### **Test 4: Rate Limiting**
```bash
# Intenta login 6 veces seguidas
for i in {1..6}; do
  curl -X POST https://tu-app.vercel.app/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"fake@test.com","password":"wrong"}'
done

# La 6ta debe retornar: 429 Too Many Requests
```

---

## 📈 9. Monitoreo Post-Deploy

### **Vercel Analytics**

Ya está incluido (`@vercel/analytics`):
- Pageviews
- Web Vitals
- User sessions

Ver en: Vercel Dashboard → Analytics

### **Supabase Logs**

Dashboard → Logs:
- API requests
- Postgres logs
- Auth events
- Errors

### **Alertas Recomendadas**

Configurar en Supabase:
- Database >80% capacity
- API errors >5% rate
- Auth failures spike
- Slow queries

---

## 🔄 10. CI/CD Automático

Con Vercel + GitHub:

```
1. Push a GitHub → Vercel detecta
2. Vercel hace build automático
3. Tests pasan → Deploy a preview
4. Merge a main → Deploy a production
```

**Automatic:**
- ✅ Build on push
- ✅ Preview deployments
- ✅ Rollback fácil
- ✅ Environment variables por branch

---

## 🚨 11. Troubleshooting Producción

### **Build falla en Vercel**

```bash
# Probar build local:
pnpm build

# Ver errores
# Arreglar TypeScript errors
# Reintentar deploy
```

### **Variables de entorno no funcionan**

- Verifica que estén configuradas en Vercel
- Verifica nombres exactos (case-sensitive)
- Verifica "Exposed to Browser" según corresponda
- Redeploy después de cambiar variables

### **CORS errors**

- Actualiza `Access-Control-Allow-Origin` en `next.config.mjs`
- Especifica tu dominio real (no `*`)
- Redeploy

### **Rate limit demasiado restrictivo**

Ajusta en `lib/rate-limit.ts`:
```typescript
export const RateLimitPresets = {
  login: {
    limit: 10,  // ← Aumentar si necesario
    windowSeconds: 60,
  },
}
```

---

## ✅ Checklist Final Pre-Deploy

- [ ] Build local exitoso (`pnpm build`)
- [ ] Variables de entorno configuradas en Vercel
- [ ] Service Role Key marcada como sensitive
- [ ] CORS configurado con dominio real
- [ ] RLS policies aplicadas en Supabase
- [ ] Usuario admin creado y probado
- [ ] Rate limiting probado
- [ ] Sin datos sensibles en código
- [ ] `.env.local` en `.gitignore`
- [ ] README actualizado con URL de producción

---

## 🎉 Post-Deploy

Una vez desplegado:

1. **Verifica HTTPS:**
   - https://tu-app.vercel.app debe tener candado 🔒

2. **Prueba login:**
   - Ve a `/admin/login`
   - Login debe funcionar

3. **Verifica seguridad:**
   - Usuarios anón no pueden modificar datos
   - Rate limiting funciona

4. **Monitorea:**
   - Vercel Analytics
   - Supabase Logs
   - Errores en consola

---

## 📞 Soporte

¿Problemas con el deployment?

- 📖 [Vercel Docs](https://vercel.com/docs)
- 📖 [Supabase Docs](https://supabase.com/docs)
- 📧 ga.company.contact@gmail.com

---

**Tu proyecto está production-ready.** 🎉

