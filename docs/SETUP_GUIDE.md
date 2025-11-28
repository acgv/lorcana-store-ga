# 🚀 Guía de Setup Completa - Lorcana Store

## Para Nuevos Desarrolladores

---

## 📋 Requisitos Previos

- Node.js 18+ instalado
- pnpm instalado (`npm install -g pnpm`)
- Cuenta en [Supabase](https://supabase.com) (gratis)
- Cuenta en [Mercado Pago](https://www.mercadopago.cl) (opcional, para pagos)
- Editor de código (VS Code recomendado)

---

## 🎯 Setup en 5 Pasos

### **Paso 1: Clonar el Repositorio**

```bash
git clone https://github.com/acgv/lorcana-store-ga.git
cd lorcana-store-ga
pnpm install
```

---

### **Paso 2: Configurar Supabase**

#### **2.1 Crear Proyecto en Supabase**
1. Ve a [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Elige nombre y contraseña
4. Espera ~2 minutos a que se cree

#### **2.2 Obtener Credenciales**
1. En tu proyecto → **Settings** → **API**
2. Copia:
   - `Project URL` (ej: `https://abc123.supabase.co`)
   - `anon public` key
   - `service_role` key (¡secreta!)

#### **2.3 Configurar Base de Datos**

Ejecuta estos scripts **EN ORDEN** en Supabase SQL Editor:

```sql
1. scripts/setup/supabase-schema.sql                    -- Tabla cards
2. scripts/setup/create-orders-table.sql                 -- Tabla orders  
3. scripts/setup/create-user-collections-table.sql       -- Colecciones personales
4. scripts/setup/create-user-profile-tables.sql         -- Perfiles, direcciones, teléfonos
5. scripts/setup/create-shipping-thresholds-table.sql    -- Umbrales de envío
6. scripts/setup/setup-products-table.sql                -- Tabla de productos (consolidado)
7. scripts/setup/setup-promotions-table.sql              -- Tabla de promociones (consolidado)
8. scripts/setup/setup-user-roles.sql                   -- Roles de usuario
9. scripts/setup/secure-rls-policies.sql                 -- Políticas de seguridad
10. scripts/setup/fix-all-updated-at-triggers.sql        -- Triggers de updated_at
```

**Ver guía completa:** [scripts/setup/README.md](../scripts/setup/README.md)

---

### **Paso 3: Variables de Entorno**

Crea archivo `.env.local` en la raíz:

```bash
# ═══════════════════════════════════════════
# SUPABASE
# ═══════════════════════════════════════════
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# ═══════════════════════════════════════════
# MERCADO PAGO (Opcional)
# ═══════════════════════════════════════════
MERCADOPAGO_MODE=test

NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_TEST=TEST-xxx
MERCADOPAGO_ACCESS_TOKEN_TEST=TEST-xxx

NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_PROD=APP_USR-xxx
MERCADOPAGO_ACCESS_TOKEN_PROD=APP_USR-xxx

# ═══════════════════════════════════════════
# ADMIN AUTH
# ═══════════════════════════════════════════
JWT_SECRET=un_string_aleatorio_muy_largo_y_seguro_123
```

**Ver ejemplo completo:** [docs/setup/ENV_EXAMPLE.md](./setup/ENV_EXAMPLE.md)

---

### **Paso 4: Importar Cartas de Lorcana**

```bash
# Opción A: Import desde API (recomendado)
pnpm import:cards

# Opción B: Desde archivo local
pnpm db:seed
```

Esto importa **1,837 cartas reales** de Disney Lorcana.

---

### **Paso 5: Crear Tu Usuario Admin**

#### **5.1 Configurar Google OAuth (Recomendado)**

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea proyecto nuevo
3. **APIs & Services** → **Credentials**
4. **Create OAuth Client ID** → Web Application
5. Authorized redirect URIs:
   ```
   http://localhost:3002/auth/callback
   https://www.gacompany.cl/auth/callback
   ```
6. Copia Client ID y Client Secret

7. En Supabase Dashboard:
   - **Authentication** → **Providers**
   - Habilita **Google**
   - Pega Client ID y Client Secret
   - Save

8. Login con Google en la app
9. Ejecuta en Supabase SQL Editor:
   ```sql
   -- scripts/setup/link-google-user-to-admin.sql
   -- Reemplaza con TU email
   INSERT INTO public.user_roles (user_id, role)
   SELECT id, 'admin'
   FROM auth.users
   WHERE email = 'tu-email@gmail.com'
   AND NOT EXISTS (
     SELECT 1 FROM public.user_roles 
     WHERE user_id = auth.users.id AND role = 'admin'
   );
   ```

#### **5.2 O Email/Password (Alternativa)**

```sql
-- scripts/setup/create-admin-user.sql
-- Reemplaza email y password antes de ejecutar
```

---

## ✅ Verificación

### **Test 1: Web Store**
```
http://localhost:3002
```
Deberías ver:
- ✅ Home con featured cards
- ✅ Catálogo con 1,837 cartas
- ✅ Filtros funcionando
- ✅ Multi-idioma (selector arriba derecha)

### **Test 2: Login**
```
http://localhost:3002/login
```
- ✅ Botón "Continue with Google"
- ✅ Login exitoso
- ✅ Nombre aparece en header

### **Test 3: Colección Personal**
```
http://localhost:3002/my-collection
```
- ✅ 3 tabs visibles
- ✅ Todas las cartas cargadas
- ✅ Puedes agregar cartas
- ✅ Estadísticas se actualizan

### **Test 4: Admin Panel**
```
http://localhost:3002/admin
```
- ✅ Login admin funciona
- ✅ Acceso a 5 tabs: Inventario, Órdenes, Submissions, Users, Logs
- ✅ Puedes editar stock/precios

---

## 🎨 Estructura del Proyecto

```
lorcana-store-ga/
├── app/                    # Next.js 16 App Router
│   ├── page.tsx           # Home
│   ├── catalog/           # Catálogo público
│   ├── my-collection/     # Colección personal 🆕
│   ├── login/             # Google OAuth login 🆕
│   ├── admin/             # Admin dashboard
│   │   ├── inventory/     # Gestión de inventario
│   │   ├── orders/        # Gestión de órdenes
│   │   ├── submissions/   # Revisar envíos
│   │   ├── users/         # Gestión de usuarios 🆕
│   │   └── logs/          # Logs de actividad
│   └── api/               # API Routes
│       ├── inventory/     # CRUD inventario
│       ├── orders/        # Consultar órdenes
│       ├── my-collection/ # Colección personal 🆕
│       ├── admin/         # Admin tools
│       └── webhooks/      # Mercado Pago webhooks
│
├── components/            # Componentes React reutilizables
│   ├── header.tsx         # Header con auth menu 🆕
│   ├── footer.tsx         # Footer con legal info
│   ├── theme-provider.tsx # Dark/Light mode 🆕
│   ├── language-provider.tsx # i18n provider (300+ keys)
│   └── ui/                # Shadcn UI components
│
├── hooks/                 # Custom React Hooks
│   ├── use-auth.ts        # Admin authentication
│   ├── use-user.ts        # Google OAuth user 🆕
│   ├── use-collection.ts  # Collection management 🆕
│   └── use-toast.ts       # Toast notifications
│
├── lib/                   # Utilidades y helpers
│   ├── db.ts              # Supabase clients
│   ├── mercadopago.ts     # Mercado Pago integration
│   ├── payment-processor.ts # Payment logic
│   ├── rate-limit.ts      # API rate limiting
│   └── types.ts           # TypeScript types
│
├── scripts/               # Scripts de DB y utilities
│   ├── setup/             # Setup inicial (ejecutar una vez)
│   ├── migrations/        # Migraciones de DB
│   ├── import-lorcana-data.js # Importar desde API
│   └── seed-supabase.mjs  # Seed desde archivo local
│
└── docs/                  # Documentación
    ├── SECURITY.md        # Guía de seguridad consolidada 🆕
    ├── setup/             # Guías de configuración
    ├── guides/            # Guías de uso
    └── features/          # Documentación de features
```

---

## 🔧 Scripts Disponibles

```bash
# Desarrollo
pnpm dev                # Servidor desarrollo (localhost:3002)
pnpm build              # Build para producción
pnpm start              # Servidor producción

# Base de Datos
pnpm import:cards       # Importar cartas desde API
pnpm db:seed            # Sembrar desde archivo local

# Utilidades
pnpm lint               # Linter ESLint
pnpm type-check         # TypeScript check
```

---

## 🗄️ Tablas de Supabase

| Tabla | Descripción | RLS |
|-------|-------------|-----|
| `cards` | Inventario de cartas | ✅ Lectura pública |
| `orders` | Órdenes de compra | ✅ Admin only |
| `submissions` | Envíos de usuarios | ✅ Por usuario |
| `user_collections` | Colecciones personales | ✅ Por usuario |
| `user_roles` | Roles de admin | ✅ Lectura pública |
| `activity_logs` | Logs de actividad | ✅ Admin only |

---

## 🌍 Multi-idioma

**Idiomas soportados:**
- 🇬🇧 English (EN)
- 🇪🇸 Español (ES) - Default
- 🇫🇷 Français (FR)
- 🇩🇪 Deutsch (DE)

**300+ keys traducidas** en `components/language-provider.tsx`

---

## 💳 Pagos con Mercado Pago

**Features:**
- ✅ Test mode y Production mode
- ✅ Webhooks automáticos
- ✅ Actualización de stock automática
- ✅ Creación de órdenes
- ✅ Extracción de fees reales
- ✅ Páginas de confirmación (success/failure/pending)

**Docs:** [docs/setup/MERCADOPAGO_SETUP.md](./setup/MERCADOPAGO_SETUP.md)

---

## 🐛 Troubleshooting

### **Error: "Supabase not configured"**
- Verifica que `.env.local` exista
- Verifica las 3 variables de Supabase
- Reinicia el servidor

### **Error: "No cards found"**
- Ejecuta `pnpm import:cards`
- O ejecuta `pnpm db:seed`
- Verifica en Supabase que la tabla `cards` tenga datos

### **Error: "Unauthorized" en admin**
- Login con Google primero
- Ejecuta script `link-google-user-to-admin.sql`
- Verifica en tabla `user_roles` que tengas role 'admin'

### **Error: "Failed to fetch" en colección**
- Ejecuta `scripts/migrations/add-version-to-collections.sql`
- Reinicia el servidor

---

## 📞 Soporte

**GA Company**
- 📧 Email: ga.multiverse.store@gmail.com
- 📱 WhatsApp: +56 9 5183 0357
- 🌐 Web: [www.gacompany.cl](https://www.gacompany.cl)
- 📍 Santiago, Chile

---

## 📄 Licencia

Ver [LICENSE](./LICENSE)

---

## 🙏 Créditos

- **Card Data:** [Lorcana API](https://api.lorcana-api.com)
- **Design System:** Inspirado en [disneylorcana.com](https://disneylorcana.com)
- **UI Components:** [Shadcn UI](https://ui.shadcn.com)
- **Icons:** [Lucide React](https://lucide.dev)
- **Payments:** [Mercado Pago](https://www.mercadopago.cl)

---

**Última actualización:** Noviembre 2025  
**Versión:** 2.0.0 🆕

