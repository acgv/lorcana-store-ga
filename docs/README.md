# 📚 Documentación - Lorcana Store

Índice completo de toda la documentación del proyecto.

---

## 🚀 Para Empezar

**Nuevos en el proyecto?** Empieza aquí:

1. 📖 [README Principal](../README.md) - Overview del proyecto
2. 🔒 [Quick Start Auth](./security/QUICK_START_AUTH.md) - Configurar seguridad (15 min)
3. 🗄️ [Supabase Setup](./setup/SUPABASE_SETUP.md) - Configurar base de datos

---

## 📂 Documentación por Categoría

### 🔒 **Seguridad** (CRÍTICO para producción)

| Documento | Descripción | Cuándo leer |
|-----------|-------------|-------------|
| [Quick Start Auth](./security/QUICK_START_AUTH.md) | Guía paso a paso (15 min) | **Empezar aquí** |
| [Security Checklist](./security/SECURITY_CHECKLIST.md) | Verificar configuración | Antes de deploy |
| [RLS Security](./security/RLS_SECURITY.md) | Problema de RLS explicado | Entender seguridad |
| [Service Role Setup](./security/SERVICE_ROLE_SETUP.md) | Configurar Service Role | Referencia técnica |
| [Índice Seguridad](./security/README.md) | Índice de docs de seguridad | Navegación |

### ⚙️ **Configuración Inicial**

| Documento | Descripción | Cuándo leer |
|-----------|-------------|-------------|
| [Supabase Setup](./setup/SUPABASE_SETUP.md) | Configurar base de datos | Setup inicial |
| [ENV Example](./setup/ENV_EXAMPLE.md) | Variables de entorno | Setup inicial |
| [Production Deployment](./setup/PRODUCTION_DEPLOYMENT.md) | Desplegar a producción | Antes de deploy |
| [Mercado Pago Setup](./setup/MERCADOPAGO_SETUP.md) | Configurar pagos | Integrar pagos |
| [Testing Payments](./setup/TESTING_PAYMENTS.md) | Probar pagos | Testing |
| [Mobile App Setup](./setup/MOBILE_APP_SETUP.md) | Configurar app móvil | Si usas mobile |

### 📖 **Guías de Usuario**

| Documento | Descripción | Cuándo leer |
|-----------|-------------|-------------|
| [Data Sources](./guides/DATA_SOURCES.md) | Obtener datos de Lorcana | Importar cartas |
| [Quick Start Import](./guides/QUICK_START_IMPORT.md) | Importar cartas rápido | Primera vez |
| [Typography Guide](./guides/TYPOGRAPHY_GUIDE.md) | Fuentes y estilos | Personalización |

### 💳 **Pagos con Mercado Pago**

| Documento | Descripción | Cuándo leer |
|-----------|-------------|-------------|
| [Mercado Pago Setup](./setup/MERCADOPAGO_SETUP.md) | Configurar integración | Setup de pagos |
| [Testing Payments](./setup/TESTING_PAYMENTS.md) | Probar con tarjetas de prueba | Testing |

### ✨ **Features Implementadas**

| Documento | Descripción | Cuándo leer |
|-----------|-------------|-------------|
| [Stock Filter Guide](./features/STOCK_FILTER_GUIDE.md) | Filtrar por Normal/Foil | Usar filtros |

---

## 🎯 Rutas Rápidas

**Por Caso de Uso:**

### "Quiero configurar el proyecto"
1. [README Principal](../README.md) - Quick Start
2. [Supabase Setup](./setup/SUPABASE_SETUP.md)
3. [Quick Start Auth](./security/QUICK_START_AUTH.md)

### "Voy a desplegar a producción"
1. [Security Checklist](./security/SECURITY_CHECKLIST.md)
2. [Production Deployment](./setup/PRODUCTION_DEPLOYMENT.md)
3. [ENV Example](./setup/ENV_EXAMPLE.md)
4. [Mercado Pago Setup](./setup/MERCADOPAGO_SETUP.md)

### "Tengo un problema de seguridad"
1. [Security README](./security/README.md)
2. [RLS Security](./security/RLS_SECURITY.md)
3. [Quick Start Auth](./security/QUICK_START_AUTH.md)

### "Quiero importar cartas"
1. [Data Sources](./guides/DATA_SOURCES.md)
2. [Quick Start Import](./guides/QUICK_START_IMPORT.md)

### "Quiero configurar pagos" 💳
1. [Mercado Pago Setup](./setup/MERCADOPAGO_SETUP.md)
2. [Testing Payments](./setup/TESTING_PAYMENTS.md)
3. [Production Deployment](./setup/PRODUCTION_DEPLOYMENT.md) - Variables en Vercel

---

## 📊 Estructura de Documentación

```
docs/
├── README.md (este archivo)          ← Índice principal
├── features/                         ← Guías de features
│   └── STOCK_FILTER_GUIDE.md
├── guides/                           ← Guías de usuario
│   ├── DATA_SOURCES.md
│   ├── QUICK_START_IMPORT.md
│   └── TYPOGRAPHY_GUIDE.md
├── security/                         ← Seguridad (IMPORTANTE)
│   ├── README.md
│   ├── QUICK_START_AUTH.md          ← **EMPEZAR AQUÍ**
│   ├── SECURITY_CHECKLIST.md
│   ├── RLS_SECURITY.md
│   ├── SERVICE_ROLE_SETUP.md
│   └── create-admin-user.sql
└── setup/                            ← Configuración inicial
    ├── SUPABASE_SETUP.md
    ├── ENV_EXAMPLE.md
    ├── PRODUCTION_DEPLOYMENT.md
    ├── MERCADOPAGO_SETUP.md         ← **Pagos**
    ├── TESTING_PAYMENTS.md          ← **Testing pagos**
    └── MOBILE_APP_SETUP.md
```

---

## 🆘 ¿No Encuentras Algo?

**Busca en el README principal:**  
👉 [README.md](../README.md)

**O busca por tema:**
- 🔒 Seguridad → `docs/security/`
- ⚙️ Setup → `docs/setup/`
- 📖 Guías → `docs/guides/`
- ✨ Features → `docs/features/`

---

## 📝 Mantener Actualizada

Al agregar nueva documentación:
1. Crear en la carpeta apropiada
2. Actualizar este índice
3. Actualizar README principal si es relevante
4. Usar nomenclatura clara: `NOMBRE_DEL_TEMA.md`

---

**Última actualización:** 3 de Noviembre, 2025

