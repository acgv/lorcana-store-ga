# ⚡ Referencia Rápida - Lorcana Docs

<div align="center">

**Acceso rápido a toda la documentación en un solo lugar**

[📚 Índice Completo](./README.md) • [🏠 README Principal](../README.md)

</div>

---

## 🚀 Quick Links

### 🎯 Más Usados

| Link | Descripción | Tiempo |
|------|-------------|--------|
| [▶️ Quick Start](../README.md#-quick-start) | Empezar en 3 pasos | 5 min |
| [⚡ Import Cards](./guides/QUICK_START_IMPORT.md) | 1,837 cartas en 5 min | 5 min |
| [📋 Ecosystem](./ECOSYSTEM_SUMMARY.md) | Overview del sistema | 10 min |
| [🎨 Typography](./guides/TYPOGRAPHY_GUIDE.md) | Fuentes y estilos | 10 min |
| [📊 Data Sources](./guides/DATA_SOURCES.md) | API de cartas | 15 min |
| [🔐 Env Variables](./setup/ENV_VARIABLES.md) | Configurar .env | 5 min |

### 📱 Mobile

| Link | Descripción | Tiempo |
|------|-------------|--------|
| [📱 Mobile Setup](./setup/MOBILE_APP_SETUP.md) | React Native/Expo completo | 2-4 hrs |
| [🔌 API Integration](./setup/MOBILE_APP_SETUP.md#api-integration) | Conectar con backend | 30 min |

### 🚀 Deployment

| Link | Descripción | Tiempo |
|------|-------------|--------|
| [🌐 Deploy Web](./setup/DEPLOYMENT.md#vercel) | Vercel deployment | 20 min |
| [📱 Deploy Mobile](./setup/DEPLOYMENT.md#mobile-app) | Expo EAS build | 1 hr |
| [🗄️ Database Setup](./setup/DEPLOYMENT.md#database) | Supabase/Firebase | 30 min |

---

## 📂 Estructura

```
docs/
├── 📚 README.md              # Índice principal
├── 📋 ECOSYSTEM_SUMMARY.md   # Overview del sistema
├── 📁 STRUCTURE.md           # Esta estructura
├── ⚡ QUICK_REFERENCE.md     # Este archivo
│
├── 📖 guides/
│   ├── ⚡ QUICK_START_IMPORT.md
│   ├── 🎨 TYPOGRAPHY_GUIDE.md
│   ├── 🌈 COLOR_IMPROVEMENTS.md
│   └── 📊 DATA_SOURCES.md
│
├── ⚙️ setup/
│   ├── 📱 MOBILE_APP_SETUP.md
│   ├── 🚀 DEPLOYMENT.md
│   └── 🔐 ENV_VARIABLES.md
│
└── ✨ features/
    └── 🎴 STOCK_FILTER_GUIDE.md
```

---

## 🎯 Por Caso de Uso

### "Quiero iniciar el proyecto"

```bash
1. README.md → Quick Start
2. npm install --legacy-peer-deps
3. npm run dev
```

**Docs necesarias:** Ninguna (opcional: ENV_VARIABLES.md)

---

### "Quiero personalizar el diseño"

```
1. TYPOGRAPHY_GUIDE.md → Leer sección de fuentes
2. app/globals.css → Modificar
3. app/layout.tsx → Cambiar fuentes
```

**Tiempo:** 20 min

---

### "Quiero importar cartas reales"

```bash
1. DATA_SOURCES.md → Leer Overview
2. npm run import:cards
3. Verificar lib/imported-cards.json
```

**Tiempo:** 5 min

---

### "Quiero configurar mobile app"

```
1. MOBILE_APP_SETUP.md → Seguir paso a paso
2. ENV_VARIABLES.md → Configurar API keys
3. Instalar Expo y dependencies
```

**Tiempo:** 2-4 horas

---

### "Quiero desplegar a producción"

```
1. DEPLOYMENT.md → Elegir platform
2. ENV_VARIABLES.md → Configurar prod vars
3. Seguir pasos de deployment
```

**Tiempo:** 1-3 horas

---

## 🔍 Búsqueda por Palabra Clave

| Palabra | Documento |
|---------|-----------|
| quick, import, 1837, cartas | [QUICK_START_IMPORT](./guides/QUICK_START_IMPORT.md) |
| ecosystem, overview, resumen | [ECOSYSTEM_SUMMARY](./ECOSYSTEM_SUMMARY.md) |
| font, fuente, typography | [TYPOGRAPHY_GUIDE](./guides/TYPOGRAPHY_GUIDE.md) |
| color, contrast, paleta, accesibilidad | [COLOR_IMPROVEMENTS](./guides/COLOR_IMPROVEMENTS.md) |
| import, cards, data, api | [DATA_SOURCES](./guides/DATA_SOURCES.md) |
| mobile, expo, react native | [MOBILE_APP_SETUP](./setup/MOBILE_APP_SETUP.md) |
| deploy, vercel, production | [DEPLOYMENT](./setup/DEPLOYMENT.md) |
| env, api key, config | [ENV_VARIABLES](./setup/ENV_VARIABLES.md) |
| filter, foil, normal | [STOCK_FILTER_GUIDE](./features/STOCK_FILTER_GUIDE.md) |

---

## 📊 Comandos Útiles

### Development

```bash
# Iniciar servidor
npm run dev

# Importar cartas (1,837)
npm run import:cards

# Limpiar caché
rm -rf .next && npm run dev

# Verificar que funciona
curl http://localhost:3002/api/cards | jq
```

### Production

```bash
# Build
npm run build

# Test build localmente
npm start

# Deploy a Vercel
vercel --prod
```

### Mobile

```bash
# Iniciar Expo
npm start

# Build para iOS
eas build --platform ios

# Build para Android
eas build --platform android
```

---

## 🆘 Troubleshooting Rápido

### ❌ Server no inicia

```bash
rm -rf .next node_modules
npm install --legacy-peer-deps
npm run dev
```

### ❌ No se ven cartas

```bash
npm run import:cards
```

### ❌ API 401 Error

```bash
# Crear .env.local
echo "MOBILE_API_KEY=test" > .env.local
npm run dev
```

### ❌ Mobile no conecta

```bash
# Usa tu IP local
API_BASE_URL=http://192.168.x.x:3002
```

---

## 📚 Documentación Completa

| Documento | Contenido | Nivel | Tiempo |
|-----------|-----------|-------|--------|
| [README](../README.md) | Overview del proyecto | 🟢 Básico | 15 min |
| [Ecosystem Summary](./ECOSYSTEM_SUMMARY.md) | Resumen del ecosistema | 🟢 Básico | 10 min |
| [docs/README](./README.md) | Índice de docs | 🟢 Básico | 10 min |
| [Quick Start Import](./guides/QUICK_START_IMPORT.md) | Importar 1,837 cartas | 🟢 Básico | 5 min |
| [Typography](./guides/TYPOGRAPHY_GUIDE.md) | Sistema tipográfico | 🟡 Intermedio | 20 min |
| [Color Improvements](./guides/COLOR_IMPROVEMENTS.md) | Contraste optimizado | 🟡 Intermedio | 15 min |
| [Data Sources](./guides/DATA_SOURCES.md) | API de cartas | 🟡 Intermedio | 15 min |
| [Mobile Setup](./setup/MOBILE_APP_SETUP.md) | App móvil completa | 🔴 Avanzado | 2-4 hrs |
| [Deployment](./setup/DEPLOYMENT.md) | Deploy a producción | 🔴 Avanzado | 1-3 hrs |
| [Env Variables](./setup/ENV_VARIABLES.md) | Configuración | 🟢 Básico | 10 min |
| [Stock Filter](./features/STOCK_FILTER_GUIDE.md) | Feature ejemplo | 🟢 Básico | 5 min |

---

## 🎓 Rutas de Aprendizaje

### Ruta 1: Frontend Developer

```
1. README.md (15 min)
2. QUICK_START_IMPORT.md (5 min)
3. TYPOGRAPHY_GUIDE.md (20 min)
4. DATA_SOURCES.md (15 min)
5. STOCK_FILTER_GUIDE.md (5 min)
```

**Total:** ~1 hora  
**Resultado:** Puedes desarrollar features de frontend

---

### Ruta 2: Mobile Developer

```
1. README.md (15 min)
2. ENV_VARIABLES.md (10 min)
3. MOBILE_APP_SETUP.md (2-4 hrs)
```

**Total:** ~3-4 horas  
**Resultado:** Puedes desarrollar y buildar la app móvil

---

### Ruta 3: Full Stack Developer

```
1. README.md (15 min)
2. TYPOGRAPHY_GUIDE.md (20 min)
3. DATA_SOURCES.md (15 min)
4. ENV_VARIABLES.md (10 min)
5. MOBILE_APP_SETUP.md (2-4 hrs)
6. DEPLOYMENT.md (1-3 hrs)
```

**Total:** ~5-8 horas  
**Resultado:** Dominas todo el stack

---

### Ruta 4: Quick Start (Principiante)

```
1. README.md → Quick Start (5 min)
2. npm install && npm run dev
3. Abre http://localhost:3002
```

**Total:** ~10 minutos  
**Resultado:** Proyecto corriendo localmente

---

## 🎯 Cheatsheet

### Archivos Importantes

```
📄 README.md                # Start here
📚 docs/README.md           # Doc index
🎨 app/globals.css          # Styles
📱 app/page.tsx             # Home page
🗂️ lib/mock-data.ts         # 1,837 cards
🔐 .env.local               # Config (create it)
```

### Scripts NPM

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run import:cards     # Get 1,837 cards
npm run lint             # Run linter
```

### Puertos

```
:3002  → Web Store & Admin
:8081  → Expo mobile app
```

### URLs Útiles

```
http://localhost:3002          → Home
http://localhost:3002/catalog  → Catalog
http://localhost:3002/admin    → Admin Dashboard
http://localhost:3002/api/cards → API
```

---

## 📱 Contacto y Soporte

- 🐛 **Issues:** [GitHub Issues](https://github.com/your-repo/issues)
- 💬 **Discord:** [Community Server](https://discord.gg/your-server)
- 📧 **Email:** support@lorcana-store.com
- 📚 **Docs:** Este directorio

---

## ✨ TL;DR

```bash
# 1. Instalar
npm install --legacy-peer-deps

# 2. Obtener 1,837 cartas reales
npm run import:cards

# 3. Iniciar
npm run dev

# 4. Abrir
open http://localhost:3002
```

**Listo! 🎉**

---

<div align="center">

**⚡ Documentación al alcance de tu mano ⚡**

[⬆ Volver arriba](#-referencia-rápida---lorcana-docs)

</div>

