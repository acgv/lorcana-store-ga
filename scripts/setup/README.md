# Scripts de Setup

Este directorio contiene scripts SQL para configurar la base de datos de Supabase.

## 📋 Scripts Principales

### Setup Inicial

1. **`supabase-schema.sql`** - Schema principal de la base de datos
2. **`setup-user-roles.sql`** - Configuración de roles y permisos de usuario
3. **`secure-rls-policies.sql`** - Políticas de seguridad RLS

### Tablas Principales

4. **`create-orders-table.sql`** - Tabla de órdenes de compra
5. **`create-user-collections-table.sql`** - Tabla de colecciones de usuarios
6. **`create-user-profile-tables.sql`** - Tablas de perfiles, direcciones y teléfonos de usuarios
7. **`create-shipping-thresholds-table.sql`** - Tabla de umbrales de envío
8. **`setup-products-table.sql`** - Configuración completa de tabla de productos (consolidado)
9. **`setup-promotions-table.sql`** - Configuración completa de tabla de promociones (consolidado)

### Usuarios y Autenticación

10. **`create-admin-user.sql`** - Crear usuario administrador
11. **`link-google-user-to-admin.sql`** - Vincular usuario de Google OAuth a admin
12. **`migrate-existing-users-to-profiles.sql`** - Migrar usuarios existentes a user_profiles

### Mantenimiento

13. **`fix-all-updated-at-triggers.sql`** - Corregir todos los triggers de updated_at

## 🚀 Orden de Ejecución Recomendado

Para una instalación nueva:

```sql
-- 1. Schema base
\i supabase-schema.sql

-- 2. Roles y seguridad
\i setup-user-roles.sql
\i secure-rls-policies.sql

-- 3. Tablas principales
\i create-orders-table.sql
\i create-user-collections-table.sql
\i create-user-profile-tables.sql
\i create-shipping-thresholds-table.sql
\i setup-products-table.sql
\i setup-promotions-table.sql

-- 4. Triggers
\i fix-all-updated-at-triggers.sql

-- 5. Usuarios (opcional)
\i create-admin-user.sql
\i migrate-existing-users-to-profiles.sql
```

## 📝 Notas

- Todos los scripts son **idempotentes** (pueden ejecutarse múltiples veces sin problemas)
- Los scripts consolidados (`setup-products-table.sql` y `setup-promotions-table.sql`) reemplazan múltiples scripts anteriores
- Los scripts eliminados fueron consolidados en los scripts principales

## 🔄 Scripts Consolidados

Los siguientes scripts fueron consolidados:

- `add-product-type-column.sql` + `add-producttype-column.sql` + `add-deck-product-type.sql` + `add-giftset-product-type.sql` + `add-products-insert-policy.sql` + `add-products-update-policy.sql` + `fix-products-table.sql` + `fix-products-updated-at-trigger.sql` → **`setup-products-table.sql`**

- `create-promotions-table.sql` + `update-promotions-table.sql` + `fix-promotions-trigger.sql` → **`setup-promotions-table.sql`**

