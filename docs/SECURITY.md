# 🔒 Guía de Seguridad - Lorcana Store

## Estado Actual: ✅ SEGURO PARA PRODUCCIÓN

---

## 📊 Resumen de Seguridad Implementada

| Característica | Estado | Descripción |
|----------------|--------|-------------|
| **Google OAuth** | ✅ Implementado | Autenticación de usuarios con Supabase |
| **Admin Authentication** | ✅ Implementado | Email/password con Supabase Auth |
| **User Roles** | ✅ Implementado | Tabla `user_roles` con RLS |
| **RLS Policies** | ✅ Configuradas | Protección a nivel de base de datos |
| **Service Role** | ✅ Configurado | Para operaciones backend seguras |
| **Rate Limiting** | ✅ Implementado | Previene abuso de API |
| **HTTPS** | ✅ Automático | Vercel proporciona SSL |
| **Proxy Security** | ✅ Implementado | Protege rutas admin |

---

## 🔐 Arquitectura de Seguridad

```
┌─────────────────────────────────────────────┐
│  1. HTTPS (Vercel SSL)                      │ ← Encriptación
├─────────────────────────────────────────────┤
│  2. proxy.ts                                │ ← Protección de rutas
│     - Redirige vercel.app → gacompany.cl   │
│     - Bloquea admin sin token               │
│     - Protege APIs de escritura             │
├─────────────────────────────────────────────┤
│  3. AuthGuard (Client)                      │ ← Verificación UI
│     - Valida token admin                    │
│     - Redirige a login si inválido          │
├─────────────────────────────────────────────┤
│  4. API Route Protection                    │ ← Validación backend
│     - Rate limiting                         │
│     - Token verification                    │
│     - User role checks                      │
├─────────────────────────────────────────────┤
│  5. Supabase Auth                           │ ← Autenticación
│     - Google OAuth (usuarios)               │
│     - Email/Password (admin)                │
│     - JWT tokens                            │
├─────────────────────────────────────────────┤
│  6. RLS Policies (Supabase)                 │ ← Autorización DB
│     - Usuarios ven solo sus datos          │
│     - Admins gestionan todo                 │
│     - Anónimos solo lectura pública         │
├─────────────────────────────────────────────┤
│  7. Service Role (Backend)                  │ ← Operaciones admin
│     - Bypasea RLS en API routes            │
│     - Solo disponible en servidor          │
└─────────────────────────────────────────────┘
```

---

## 🗄️ Row Level Security (RLS)

### Tablas Protegidas:

#### **1. `cards` (Inventario)**
- **Lectura pública**: Todos pueden ver cartas aprobadas
- **Escritura admin**: Solo `supabaseAdmin` puede modificar
- **RLS**: Protege contra modificación no autorizada

#### **2. `user_collections` (Colecciones Personales)**
- **Lectura**: Solo el dueño ve su colección
- **Escritura**: Solo el dueño modifica su colección
- **RLS**: `auth.uid() = user_id`

#### **3. `orders` (Órdenes de Compra)**
- **Lectura admin**: Solo admins ven todas las órdenes
- **Escritura backend**: Solo webhooks crean órdenes
- **RLS**: Protege datos de compra

#### **4. `submissions` (Envíos de Cartas)**
- **Lectura**: Usuario ve sus envíos, admin ve todos
- **Escritura**: Usuario crea, admin modifica/aprueba
- **RLS**: `auth.uid() = user_id` OR `is_admin()`

#### **5. `user_roles` (Roles de Usuario)**
- **Lectura**: Cualquier autenticado
- **Escritura**: Solo admins
- **RLS**: Protege asignación de roles

---

## 🔑 Variables de Entorno Requeridas

### **Archivo: `.env.local`**

```bash
# ═══════════════════════════════════════════
# SUPABASE
# ═══════════════════════════════════════════
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ═══════════════════════════════════════════
# MERCADO PAGO (Dual Credentials)
# ═══════════════════════════════════════════
MERCADOPAGO_MODE=test  # "test" o "production"

# Test Credentials
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_TEST=TEST-xxx
MERCADOPAGO_ACCESS_TOKEN_TEST=TEST-xxx

# Production Credentials
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_PROD=APP_USR-xxx
MERCADOPAGO_ACCESS_TOKEN_PROD=APP_USR-xxx

# ═══════════════════════════════════════════
# ADMIN AUTH (Legacy - no cambiar)
# ═══════════════════════════════════════════
JWT_SECRET=tu_jwt_secret_seguro
```

---

## 👥 Roles de Usuario

### **Roles Disponibles:**

1. **Usuario Regular** (Default)
   - Ver catálogo público
   - Comprar cartas
   - Enviar cartas para venta
   - Gestionar colección personal
   - Ver sus propios envíos

2. **Admin**
   - Todo lo anterior +
   - Gestionar inventario
   - Ver todas las órdenes
   - Aprobar/rechazar envíos
   - Gestionar roles de usuarios
   - Ver logs de actividad
   - Herramientas de pago manual

### **Asignar Role Admin:**

```sql
-- Ejecutar en Supabase SQL Editor
-- scripts/setup/link-google-user-to-admin.sql

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'tu-email@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.users.id AND role = 'admin'
);
```

---

## 🛡️ Mejores Prácticas Implementadas

### ✅ **Separación de Clientes Supabase:**
```typescript
// lib/db.ts

// Cliente público (frontend)
export const supabase = createClient(url, anonKey)

// Cliente admin (backend API routes only)
export const supabaseAdmin = createClient(url, serviceRoleKey)
```

### ✅ **Validación de Tokens:**
```typescript
// hooks/use-auth.ts
// Cliente decodifica JWT localmente (no valida firma)

// app/api/auth/verify/route.ts
// Servidor valida firma con Supabase (seguro)
```

### ✅ **Rate Limiting:**
```typescript
// lib/rate-limit.ts
// Lazy cleanup (serverless-friendly)
// Memory overflow protection
// Configurable por endpoint
```

### ✅ **Proxy Protection:**
```typescript
// proxy.ts
// Admin routes require token
// Public APIs (GET only) sin auth
// User-specific APIs verifican userId
```

---

## 🚀 Setup para Nuevos Desarrolladores

### **Paso 1: Clonar y Configurar**
```bash
git clone https://github.com/acgv/lorcana-store-ga.git
cd lorcana-store-ga
pnpm install
```

### **Paso 2: Variables de Entorno**
1. Copia `.env.example` → `.env.local`
2. Ve a [Supabase Dashboard](https://app.supabase.com)
3. Copia tus keys reales
4. Pega en `.env.local`

### **Paso 3: Setup Base de Datos**
Ejecuta en orden en Supabase SQL Editor:
```sql
1. scripts/setup/supabase-schema.sql           -- Crear tablas
2. scripts/setup/secure-rls-policies.sql       -- Aplicar RLS
3. scripts/setup/create-orders-table.sql       -- Tabla orders
4. scripts/setup/create-user-collections-table.sql  -- Colecciones
5. scripts/setup/setup-user-roles.sql          -- Roles
```

### **Paso 4: Crear Admin**
```sql
-- scripts/setup/link-google-user-to-admin.sql
-- Reemplaza con tu email
```

### **Paso 5: Iniciar**
```bash
pnpm dev
```

---

## 🔍 Verificación de Seguridad

### **Test 1: Anónimo NO puede modificar**
```javascript
// En consola del navegador (sin login)
fetch('/api/inventory', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({cardId: 'tfc-1', price: 1})
})

// Esperado: Error 401 Unauthorized ✅
```

### **Test 2: Usuario NO puede ver colecciones ajenas**
```javascript
// Como usuario normal
fetch('/api/my-collection?userId=otro-usuario-id')

// Esperado: Solo ve su propia colección ✅
```

### **Test 3: Admin puede gestionar**
```javascript
// Como admin
fetch('/api/admin/users')

// Esperado: Lista de todos los usuarios ✅
```

---

## 🚨 Incidentes de Seguridad

Si detectas un problema de seguridad:

1. **NO** lo publiques en GitHub Issues
2. **Contacta directamente:**
   - 📧 ga.company.contact@gmail.com
   - 📱 WhatsApp: +56 9 5183 0357
3. Describe el problema en detalle
4. Proporciona pasos para reproducir

---

## 📚 Documentos de Referencia

- `scripts/setup/` - Scripts de configuración inicial
- `scripts/migrations/` - Migraciones de base de datos
- `docs/setup/ENV_EXAMPLE.md` - Variables de entorno
- `docs/setup/MERCADOPAGO_SETUP.md` - Configuración de pagos

---

## ✅ Checklist de Producción

Antes de desplegar a producción:

- [x] Service Role Key en variables de entorno de Vercel
- [x] Google OAuth configurado con dominio real
- [x] Mercado Pago en modo producción
- [x] RLS Policies aplicadas
- [x] Admin user creado
- [x] HTTPS habilitado (automático en Vercel)
- [x] Dominio personalizado configurado (gacompany.cl)
- [x] Rate limiting activado
- [ ] Backups automáticos de Supabase (recomendado)
- [ ] Monitoring y alertas (opcional)

---

**Última actualización:** Noviembre 2025  
**Estado:** Producción ✅

