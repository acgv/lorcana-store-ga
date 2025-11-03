# 🎴 Lorcana TCG Singles Store - GA Company

<div align="center">

**Tienda online completa para singles de Disney Lorcana TCG**

[🚀 Quick Start](#-quick-start) • [📚 Documentación](#-documentación) • [🎨 Features](#-features) • [📧 Contacto](#-contacto)

</div>

---

## 🌟 Componentes

| Componente | Descripción | Stack |
|------------|-------------|-------|
| 🌐 **Web Store** | Tienda online con catálogo de cartas | Next.js 16 + React 19 |
| 📱 **Mobile App** | App para capturar y enviar cartas | React Native + Expo |
| 🎛️ **Admin Dashboard** | Panel para revisar y aprobar cartas | Next.js 16 |

> Todos los componentes comparten un sistema de diseño unificado inspirado en [disneylorcana.com](https://disneylorcana.com)

---

## 🚀 Quick Start

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus credenciales de Supabase

# 3. Configurar base de datos (Supabase)
# Ejecuta scripts/supabase-schema.sql en Supabase SQL Editor
# Ejecuta scripts/fix-inventory-update-permissions.sql en Supabase SQL Editor

# 4. Importar datos reales de Lorcana (1,837 cartas)
pnpm run import:cards

# 5. Sembrar base de datos (opcional)
pnpm run db:seed

# 6. Iniciar servidor de desarrollo
pnpm run dev
# Abre http://localhost:3002
```

**Acceso rápido:**
- 🏠 Home: http://localhost:3002
- 🎴 Catálogo: http://localhost:3002/catalog
- 🎛️ Admin Dashboard: http://localhost:3002/admin
- 📖 Aprende a Jugar: http://localhost:3002/about
- 📰 Noticias: http://localhost:3002/news
- 📧 Contacto: http://localhost:3002/contact
- 🔒 Privacidad: http://localhost:3002/privacy

---

## 🎨 Features

### Web Store
✅ Catálogo con **1,837 cartas reales** de Lorcana  
✅ Filtros avanzados: Tipo, Set, Rareza, Precio, **Normal/Foil**  
✅ Multi-idioma (EN, FR, DE, ES)  
✅ Carrito de compras  
✅ Tema oscuro mágico con efectos foil  
✅ Diseño responsive mobile-first  
✅ **Página educativa** completa sobre cómo jugar Lorcana  
✅ **Noticias** con feeds de Instagram (@disneylorcana, @ravensburgerna)  
✅ **Contacto** con enlaces a redes sociales y WhatsApp  
✅ **Política de Privacidad** completa y legal  
✅ Precios ocultos para cartas sin stock  
✅ Ordenamiento por número de carta por defecto  

### Mobile App
✅ Escaneo con cámara + OCR  
✅ Importar screenshots de galería  
✅ Entrada manual de cartas  
✅ Modo offline con cola de sincronización  
✅ Notificaciones push de estado de revisión  

### Admin Dashboard
✅ Revisar envíos pendientes desde mobile  
✅ Editar y aprobar/rechazar datos  
✅ Gestionar inventario de cartas (stock **Y precios**)  
✅ Filtros avanzados: Set, Tipo, Rareza, Estado de Stock, **Normal/Foil**  
✅ Edición en masa con "Save All Changes"  
✅ **Spinners visuales** durante guardado  
✅ **Validación de errores** de Supabase en tiempo real  
✅ Log de actividad con timestamps  
✅ Autenticación segura  
✅ Dashboard de estadísticas en tiempo real  
✅ Integración con **Supabase** en tiempo real  

---

## 📚 Documentación

👉 **Índice completo:** [docs/README.md](./docs/README.md)

### 🚀 **Empezar Aquí**

| Documento | Descripción |
|-----------|-------------|
| [🔒 Quick Start Auth](./docs/security/QUICK_START_AUTH.md) | Configurar seguridad en 15 minutos |
| [🗄️ Supabase Setup](./docs/setup/SUPABASE_SETUP.md) | Configurar base de datos |
| [📊 Importar Cartas](./docs/guides/QUICK_START_IMPORT.md) | Importar 1,837 cartas de Lorcana |

### 📖 **Por Categoría**

| Categoría | Documentos | Descripción |
|-----------|-----------|-------------|
| **🔒 Seguridad** | [6 docs](./docs/security/) | Auth, RLS, rate limiting, roles |
| **⚙️ Setup** | [5 docs](./docs/setup/) | Supabase, ENV, deployment, production |
| **📖 Guías** | [3 docs](./docs/guides/) | Tipografía, datos, import |
| **✨ Features** | [1 doc](./docs/features/) | Filtros y funcionalidades |

### 🔧 Documentación Técnica

<details>
<summary><b>📂 Estructura del Proyecto</b></summary>

```
lorcana-store/
├── 📱 app/
│   ├── page.tsx                    # Home
│   ├── catalog/page.tsx            # Catálogo de cartas
│   ├── about/page.tsx              # Aprende a Jugar Lorcana
│   ├── news/page.tsx               # Noticias (feeds Instagram)
│   ├── contact/page.tsx            # Contacto (redes sociales)
│   ├── privacy/page.tsx            # Política de Privacidad
│   ├── admin/                      # Dashboard admin
│   │   ├── page.tsx
│   │   ├── inventory/page.tsx      # Gestión de inventario
│   │   ├── submissions/page.tsx
│   │   └── logs/page.tsx
│   └── api/
│       ├── cards/route.ts          # GET cartas públicas
│       ├── inventory/route.ts      # POST/PATCH stock y precios
│       ├── staging/route.ts        # POST desde mobile
│       ├── submissions/            # Admin review
│       ├── updateCards/route.ts    # Bulk update
│       └── logs/route.ts
├── 🧩 components/
│   ├── header.tsx
│   ├── footer.tsx                  # Con redes sociales
│   ├── card-item.tsx
│   ├── card-filters.tsx
│   ├── language-provider.tsx       # Multi-idioma
│   └── ui/                         # Shadcn UI
├── 📚 lib/
│   ├── types.ts
│   ├── db.ts                       # Supabase client
│   ├── mock-data.ts               # Fallback data
│   ├── imported-cards.json        # 1,837 cartas de API
│   └── utils.ts
├── 📜 scripts/
│   ├── import-lorcana-data.js               # Importar de API Lorcana
│   ├── load-to-db.js                        # Cargar a DB local
│   ├── seed-supabase.mjs                    # Sembrar Supabase
│   ├── supabase-schema.sql                  # Schema inicial
│   └── fix-inventory-update-permissions.sql # Permisos RLS
├── 📖 docs/
│   ├── guides/                    # Guías de usuario
│   ├── setup/                     # Configuración
│   └── features/                  # Features docs
├── 🔧 types/
│   └── social-embeds.d.ts         # TypeScript definitions
└── 🖼️ public/
    ├── logo-ga.jpg                # Logo de GA Company
    └── placeholder*.{svg,png,jpg} # Placeholders
```
</details>

<details>
<summary><b>🗄️ Database Schema</b></summary>

```typescript
// Cards
{
  id: string
  name: string
  image: string
  set: string
  rarity: "common" | "uncommon" | "rare" | "superRare" | "legendary" | "enchanted"
  type: "character" | "action" | "item" | "song"
  number: number
  cardNumber: string
  price: number
  foilPrice: number
  description: string
  version: "normal" | "foil"
  language: "en" | "fr" | "de" | "es"
  status: "approved" | "pending" | "rejected"
  normalStock: number
  foilStock: number
  createdAt: string
  updatedAt: string
}

// Submissions
{
  id: string
  card: Partial<Card>
  status: "pending" | "approved" | "rejected"
  submittedBy: string
  submittedAt: string
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  images: string[]
  metadata: {
    source: "mobile" | "admin"
    deviceInfo?: string
    ocrConfidence?: number
  }
}
```
</details>

<details>
<summary><b>🔌 API Endpoints</b></summary>

### Públicos
- `GET /api/cards` - Obtener cartas aprobadas (soporta paginación automática)
- `GET /api/cards?type=character&rarity=legendary` - Filtros

### Admin (requiere auth)
- `GET /api/inventory` - Ver inventario completo (stock + precios)
- `POST /api/inventory` - Actualizar stock/precio de una carta
  ```json
  {
    "cardId": "ari-1",
    "normalStock": 12,
    "foilStock": 3,
    "price": 7.99,
    "foilPrice": 14.99
  }
  ```
- `PATCH /api/inventory` - Actualización masiva (batch)
- `GET /api/submissions` - Ver envíos pendientes
- `POST /api/submissions/{id}/approve` - Aprobar
- `POST /api/submissions/{id}/reject` - Rechazar
- `GET /api/logs` - Ver logs de actividad

### Mobile App (requiere API key)
- `POST /api/staging` - Enviar carta para revisión
- `GET /api/staging?id={id}` - Verificar estado

Ver [documentación completa de API](./docs/setup/DEPLOYMENT.md#api-reference)
</details>

<details>
<summary><b>🎨 Sistema de Diseño</b></summary>

**Colores:**
```css
--primary: oklch(0.65 0.2 280)     /* Purple/Violet */
--accent: oklch(0.7 0.18 45)       /* Gold */
--background: oklch(0.12 0.03 270) /* Dark indigo */
```

**Tipografía:**
- **Sans**: Inter (todo el sitio - limpio y moderno)

Ver [Guía de Tipografía](./docs/guides/TYPOGRAPHY_GUIDE.md)

**Efectos:**
- Foil shimmer en cartas
- Glow animations en hover
- Partículas flotantes en hero
- Text shadows mágicos
</details>

---

## 🏗️ Arquitectura

```
┌─────────────┐
│  Mobile App │ ──┐
└─────────────┘   │
                  ├──> POST /api/staging ──> ┌──────────────┐
┌─────────────┐   │                          │   Database   │
│    Admin    │ ──┴──> Review & Approve  ──> │  (Supabase)  │
│  Dashboard  │ <────  GET /api/submissions  └──────────────┘
└─────────────┘                                     │
                                                    ↓
                                            ┌──────────────┐
                                            │  Web Store   │
                                            │ GET /api/cards│
                                            └──────────────┘
```

---

## 💾 Datos Reales de Lorcana

Este proyecto incluye **1,837 cartas reales** de Disney Lorcana TCG obtenidas de la API pública [Lorcana API](https://api.lorcana-api.com).

```bash
# Importar todas las cartas (1,837)
npm run import:cards

# Ver las cartas en lib/imported-cards.json
```

Ver [Guía de Fuentes de Datos](./docs/guides/DATA_SOURCES.md) para más información.

---

## 🧪 Testing

```bash
# Test API pública
curl http://localhost:3002/api/cards | jq
curl "http://localhost:3002/api/cards?type=character&rarity=legendary" | jq

# Test inventario (muestra 3 primeras cartas)
curl http://localhost:3002/api/inventory | jq '.inventory[0:3]'

# Test actualizar stock (ejemplo)
curl -X POST http://localhost:3002/api/inventory \
  -H "Content-Type: application/json" \
  -d '{
    "cardId": "ari-1",
    "normalStock": 15,
    "foilStock": 3,
    "price": 8.99,
    "foilPrice": 15.99
  }' | jq

# Test submission (mobile)
curl -X POST http://localhost:3002/api/staging \
  -H "x-api-key: test_key" \
  -H "Content-Type: application/json" \
  -d '{"card":{"name":"Test Card"}}'
```

---

## 🎯 Roadmap

### Completado ✅
- [x] Web store con catálogo y filtros
- [x] Filtro de versión Normal/Foil en catálogo y admin
- [x] 1,837 cartas reales de Lorcana
- [x] API endpoints completos
- [x] Admin dashboard con gestión de inventario
- [x] Edición de precios (Normal y Foil) en admin
- [x] Filtros avanzados en admin (Set, Tipo, Rareza, Stock)
- [x] **Supabase database integration** con RLS
- [x] Paginación para cargar 1,837+ cartas
- [x] **Sistema de autenticación completo** con Supabase Auth
- [x] **Roles de usuario** (admin, moderator, user)
- [x] **Rate limiting** en API routes críticas
- [x] **CORS y Security Headers** configurados
- [x] Protección de rutas con proxy (Next.js 16)
- [x] **Página educativa** sobre cómo jugar Lorcana
- [x] **Página de noticias** con feeds de Instagram
- [x] **Política de privacidad** completa
- [x] **Página de contacto** con redes sociales
- [x] Spinners visuales durante guardado
- [x] Precios ocultos para cartas sin stock
- [x] Ordenamiento por número de carta por defecto
- [x] Performance optimizations (card detail endpoint)
- [x] Mobile app documentation
- [x] Sistema de diseño mágico
- [x] Tipografía limpia con Inter

### En Progreso 🚧
- [ ] Cloud image storage (Supabase Storage)
- [ ] Submissions workflow (mobile → admin)
- [ ] Payment integration (Stripe)
- [ ] Email notifications

### Planeado 📋
- [ ] OCR service integration
- [ ] Push notifications
- [ ] Payment integration (Stripe)
- [ ] Email notifications
- [ ] User accounts & order history
- [ ] Analytics dashboard

---

## 🛠️ Stack Tecnológico

| Categoría | Tecnología |
|-----------|-----------|
| **Frontend** | Next.js 16 (Turbopack), React 19, TypeScript |
| **Styling** | Tailwind CSS 4, Shadcn UI |
| **Mobile** | React Native, Expo |
| **Database** | **Supabase (Postgres)** ✅ |
| **Auth** | **Supabase Auth** ✅ |
| **Security** | RLS Policies, Rate Limiting, CORS ✅ |
| **Storage** | Supabase Storage (planeado) |
| **API** | Next.js API Routes + Proxy |
| **Deployment** | Vercel (HTTPS automático), Expo EAS |
| **Package Manager** | pnpm |

---

## 🔒 Seguridad

### ⚠️ ACCIÓN REQUERIDA: Configurar Autenticación

**El sistema de autenticación está implementado pero requiere configuración.**

🚨 **ESTADO ACTUAL:**
- ✅ Login page creado (`/admin/login`)
- ✅ Proxy protegiendo rutas `/admin` (Next.js 16)
- ✅ Service Role Key implementado en código
- ⚠️ Requiere agregar `SUPABASE_SERVICE_ROLE_KEY` a `.env.local`
- ⚠️ Requiere crear usuario admin en Supabase
- ⚠️ Requiere aplicar políticas RLS seguras

### ✅ Features de Seguridad Implementadas:

- ✅ **Autenticación con Supabase Auth**
  - Login con email/password
  - Tokens JWT validados
  - Session management con cookies

- ✅ **Sistema de Roles**
  - Admin: Acceso completo
  - Moderator: Edición limitada
  - User: Solo lectura

- ✅ **Rate Limiting**
  - Login: 5 intentos/minuto
  - API Admin: 50 requests/minuto
  - Previene brute force attacks

- ✅ **Protección de Rutas**
  - Proxy (Next.js 16) protege `/admin`
  - AuthGuard en componentes client
  - API routes verifican auth

- ✅ **Security Headers**
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Referrer-Policy configurado
  - CORS configurado

- ✅ **RLS Policies**
  - Frontend: Solo lectura
  - Backend: Service Role Key
  - Verificación por roles


### 🚀 Configuración Rápida (15 minutos)

Sigue esta guía paso a paso:

👉 **[Quick Start Auth Guide](./docs/security/QUICK_START_AUTH.md)** 👈

**Pasos:**
1. Obtener Service Role Key de Supabase
2. Agregar a `.env.local`
3. Habilitar Email Auth en Supabase
4. Crear usuario admin
5. Aplicar `scripts/secure-rls-policies.sql`
6. Aplicar `scripts/setup-user-roles.sql` (opcional)
7. Reiniciar servidor

**Resultado:** Proyecto 100% seguro y production-ready.

### 📚 Documentación Completa

Ver [docs/security/README.md](./docs/security/README.md) para:
- Guías detalladas de seguridad
- Explicación de problemas RLS
- Rate limiting avanzado
- Deployment a producción
- Troubleshooting

---

## 🆘 Troubleshooting

<details>
<summary><b>❌ Server no inicia</b></summary>

```bash
rm -rf .next node_modules
pnpm install
pnpm dev
```
</details>

<details>
<summary><b>❌ API returns 401</b></summary>

1. Verifica API key en headers
2. Crea `.env.local` con tus keys
3. Reinicia servidor
</details>

<details>
<summary><b>❌ No se ven las cartas</b></summary>

1. Importa datos: `pnpm import:cards`
2. Verifica `lib/imported-cards.json` existe
3. Configura Supabase en `.env.local`
4. Siembra la base de datos: `pnpm db:seed`
5. Verifica que las políticas RLS estén configuradas (ver scripts SQL)
6. Reinicia servidor
</details>

<details>
<summary><b>❌ Mobile app no conecta</b></summary>

1. Actualiza `API_BASE_URL` en mobile `.env`
2. Usa tu IP local: `http://192.168.x.x:3002`
3. O usa ngrok para testing público
</details>

<details>
<summary><b>❌ Supabase: Error al guardar cambios en inventario</b></summary>

1. Verifica que ejecutaste `scripts/fix-inventory-update-permissions.sql` en Supabase
2. Verifica que `.env.local` tiene las credenciales correctas:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Verifica en Supabase Dashboard → Authentication → Policies que existe la política "Allow update stock"
4. Reinicia el servidor después de cambiar `.env.local`
</details>

<details>
<summary><b>❌ Solo se cargan 1000 cartas en lugar de 1837</b></summary>

1. Verifica que el código de paginación esté activo en `/api/cards` y `/api/inventory`
2. Revisa la consola del servidor para ver cuántas páginas se cargaron
3. Si el problema persiste, verifica que todas las cartas existen en Supabase usando SQL:
   ```sql
   SELECT COUNT(*) FROM cards WHERE status = 'approved';
   ```
</details>

---

## 📝 Scripts Disponibles

```bash
# Desarrollo
pnpm dev                # Servidor en puerto 3002
pnpm build              # Build de producción
pnpm start              # Servidor de producción
pnpm lint               # ESLint

# Datos
pnpm import:cards       # Importar 1,837 cartas de API
pnpm load:db            # Cargar a database local (requiere .env)
pnpm seed:all           # Import + Load en uno
pnpm db:seed            # Sembrar cartas en Supabase (requiere .env.local)

# Base de datos
# Ejecuta scripts/supabase-schema.sql en Supabase SQL Editor (setup inicial)
# Ejecuta scripts/fix-inventory-update-permissions.sql en Supabase SQL Editor (permisos)
```

---

## 🤝 Contributing

1. Fork el repositorio
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 License

MIT License - Siéntete libre de usar este proyecto para tus propios fines.

---

## 🎉 Credits

Construido con ❤️ usando:
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Expo](https://expo.dev/)
- [Lorcana API](https://api.lorcana-api.com/)

Inspirado por **Disney Lorcana TCG** ✨

---

## 📧 Contacto

**GA Company** - Tienda de singles de Disney Lorcana TCG

- 📧 Email: [ga.company.contact@gmail.com](mailto:ga.company.contact@gmail.com)
- 📱 WhatsApp: [+56 9 5183 0357](https://wa.me/56951830357)
- 📸 Instagram: [@arte.grafico.sublimable](https://instagram.com/arte.grafico.sublimable)
- 🎵 TikTok: [@arte.grafico.sublimable](https://tiktok.com/@arte.grafico.sublimable)

**Horario de Atención:**  
Lunes a Sábado: 10:00 AM - 8:00 PM  
Domingo: Cerrado

---

<div align="center">

**🎴 Happy card collecting! 🎴**

[⬆ Volver arriba](#-lorcana-tcg-singles-store---ga-company)

</div>
