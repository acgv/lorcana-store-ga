# 🎴 Lorcana TCG Singles Ecosystem

<div align="center">

**Ecosistema completo para gestionar singles de Disney Lorcana TCG**

[🚀 Quick Start](#-quick-start) • [📚 Documentación](#-documentación) • [🎨 Features](#-features) • [🌐 Demo](http://localhost:3002)

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
npm install --legacy-peer-deps

# 2. Importar datos reales de Lorcana (1,837 cartas)
npm run import:cards

# 3. Iniciar servidor de desarrollo
npm run dev
# Abre http://localhost:3002
```

**Acceso rápido:**
- 🏠 Web Store: http://localhost:3002
- 🎛️ Admin Dashboard: http://localhost:3002/admin
- 📖 API Docs: http://localhost:3002/api

---

## 🎨 Features

### Web Store
✅ Catálogo con **1,837 cartas reales** de Lorcana  
✅ Filtros avanzados: Tipo, Set, Rareza, Precio, **Normal/Foil**  
✅ Multi-idioma (EN, FR, DE, ES)  
✅ Carrito de compras  
✅ Tema oscuro mágico con efectos foil  
✅ Diseño responsive mobile-first  

### Mobile App
✅ Escaneo con cámara + OCR  
✅ Importar screenshots de galería  
✅ Entrada manual de cartas  
✅ Modo offline con cola de sincronización  
✅ Notificaciones push de estado de revisión  

### Admin Dashboard
✅ Revisar envíos pendientes desde mobile  
✅ Editar y aprobar/rechazar datos  
✅ Gestionar inventario de cartas  
✅ Log de actividad con timestamps  
✅ Autenticación segura  
✅ Dashboard de estadísticas en tiempo real  

---

## 📚 Documentación

### 📖 Guías de Usuario

| Documento | Descripción |
|-----------|-------------|
| [🎨 Guía de Tipografía](./docs/guides/TYPOGRAPHY_GUIDE.md) | Fuentes, estilos y mejores prácticas |
| [📊 Fuentes de Datos](./docs/guides/DATA_SOURCES.md) | Cómo obtener datos reales de Lorcana |

### ⚙️ Configuración

| Documento | Descripción |
|-----------|-------------|
| [📱 Setup Mobile App](./docs/setup/MOBILE_APP_SETUP.md) | Guía completa React Native/Expo |
| [🚀 Deployment](./docs/setup/DEPLOYMENT.md) | Desplegar en Vercel/Railway/Expo |
| [🔐 Variables de Entorno](./docs/setup/.env.example) | Configuración de API keys y DB |

### ✨ Features Implementados

| Documento | Descripción |
|-----------|-------------|
| [🎴 Filtro de Stock](./docs/features/STOCK_FILTER_GUIDE.md) | Filtrar por Normal/Foil/Ambos |

### 🔧 Documentación Técnica

<details>
<summary><b>📂 Estructura del Proyecto</b></summary>

```
lorcana-store/
├── 📱 app/
│   ├── page.tsx                    # Home
│   ├── catalog/page.tsx            # Catálogo de cartas
│   ├── admin/                      # Dashboard admin
│   │   ├── page.tsx
│   │   ├── submissions/page.tsx
│   │   └── logs/page.tsx
│   └── api/
│       ├── cards/route.ts          # GET cartas públicas
│       ├── staging/route.ts        # POST desde mobile
│       ├── submissions/            # Admin review
│       ├── updateCards/route.ts    # Bulk update
│       └── logs/route.ts
├── 🧩 components/
│   ├── header.tsx
│   ├── card-item.tsx
│   ├── card-filters.tsx
│   └── ui/                         # Shadcn UI
├── 📚 lib/
│   ├── types.ts
│   ├── mock-data.ts               # 1,837 cartas
│   ├── imported-cards.json        # Datos de API
│   └── utils.ts
├── 🎨 styles/
│   └── globals.css                # Sistema de diseño
├── 📜 scripts/
│   ├── import-lorcana-data.js     # Importar API
│   └── load-to-db.js              # Cargar a DB
├── 📖 docs/
│   ├── guides/                    # Guías de usuario
│   ├── setup/                     # Configuración
│   └── features/                  # Features docs
└── 🖼️ public/                      # Imágenes de cartas
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
  rarity: "common" | "uncommon" | "rare" | "superRare" | "legendary"
  type: "character" | "action" | "item" | "location" | "song"
  cardNumber: string
  price: number
  foilPrice?: number
  description: string
  version: "normal" | "foil"
  language: "en" | "fr" | "de" | "es"
  status: "pending" | "approved" | "rejected"
  stock: number
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
- `GET /api/cards` - Obtener cartas aprobadas
- `GET /api/cards?type=character&rarity=legendary`

### Mobile App (requiere API key)
- `POST /api/staging` - Enviar carta para revisión
- `GET /api/staging?id={id}` - Verificar estado

### Admin (requiere auth)
- `GET /api/submissions` - Ver envíos pendientes
- `POST /api/submissions/{id}/approve` - Aprobar
- `POST /api/submissions/{id}/reject` - Rechazar
- `POST /api/updateCards` - Actualización masiva
- `GET /api/logs` - Ver logs de actividad

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
- **Display**: Playfair Display (títulos)
- **Serif**: EB Garamond (contenido)
- **Sans**: Inter (UI)

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
# Test API
curl http://localhost:3002/api/cards | jq

# Test con filtros
curl "http://localhost:3002/api/cards?type=character&rarity=legendary" | jq

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
- [x] Filtro de versión Normal/Foil
- [x] 1,837 cartas reales de Lorcana
- [x] API endpoints completos
- [x] Admin dashboard
- [x] Mobile app documentation
- [x] Sistema de diseño mágico
- [x] Tipografía estilo Lorcana

### En Progreso 🚧
- [ ] Firebase Auth integration
- [ ] Supabase database connection
- [ ] Cloud image storage

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
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Tailwind CSS 4, Shadcn UI |
| **Mobile** | React Native, Expo |
| **Database** | Supabase / Firebase |
| **Auth** | Firebase Auth |
| **Storage** | Supabase Storage |
| **API** | Next.js API Routes |
| **Deployment** | Vercel, Expo EAS |

---

## 🆘 Troubleshooting

<details>
<summary><b>❌ Server no inicia</b></summary>

```bash
rm -rf .next node_modules
npm install --legacy-peer-deps
npm run dev
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

1. Importa datos: `npm run import:cards`
2. Verifica `lib/imported-cards.json` existe
3. Reinicia servidor
</details>

<details>
<summary><b>❌ Mobile app no conecta</b></summary>

1. Actualiza `API_BASE_URL` en mobile `.env`
2. Usa tu IP local: `http://192.168.x.x:3002`
3. O usa ngrok para testing público
</details>

---

## 📝 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Servidor en puerto 3002
npm run build            # Build de producción
npm run start            # Servidor de producción
npm run lint             # ESLint

# Datos
npm run import:cards     # Importar 1,837 cartas de API
npm run load:db          # Cargar a database (requiere .env)
npm run seed:all         # Import + Load en uno
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

<div align="center">

**🎴 Happy card collecting! 🎴**

[⬆ Volver arriba](#-lorcana-tcg-singles-ecosystem)

</div>
