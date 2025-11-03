# 🔒 Documentación de Seguridad

## Guías de Seguridad para Lorcana Store

Esta carpeta contiene toda la documentación relacionada con la seguridad del proyecto.

---

## 📚 Documentos Disponibles

| Documento | Descripción | Prioridad |
|-----------|-------------|-----------|
| [QUICK_START_AUTH.md](./QUICK_START_AUTH.md) | **EMPEZAR AQUÍ** - Guía paso a paso (15 min) | 🟢 START |
| [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) | Verificar que todo esté configurado | 🟡 Alta |
| [RLS_SECURITY.md](./RLS_SECURITY.md) | Entender el problema de RLS | 📖 Referencia |
| [SERVICE_ROLE_SETUP.md](./SERVICE_ROLE_SETUP.md) | Detalles de Service Role Key | 📖 Referencia |
| [AUTH_SETUP.md](./AUTH_SETUP.md) | Configuración avanzada completa | 📖 Referencia |

---

## 🚨 ADVERTENCIA CRÍTICA

**El proyecto actualmente NO es seguro para producción pública.**

### Problemas Identificados:

1. ❌ **RLS Bypass**: Usuarios anónimos pueden modificar precios y stock
2. ❌ **Sin autenticación real**: Credenciales hardcodeadas
3. ❌ **Admin sin protección**: Cualquiera puede acceder a `/admin`
4. ❌ **No hay validación de tokens**: Tokens no se verifican contra Supabase

### Riesgo:
- 🔴 Cualquier persona puede cambiar precios a $0.01
- 🔴 Cualquier persona puede poner stock infinito
- 🔴 Cualquier persona puede acceder al admin (solo necesita credenciales de dev)

---

## ✅ Solución Rápida (30 minutos)

Para hacer el proyecto **producción-ready rápidamente**:

### Opción A: Service Role Key (Recomendado)

1. **Leer**: [SERVICE_ROLE_SETUP.md](./SERVICE_ROLE_SETUP.md)
2. **Agregar** `SUPABASE_SERVICE_ROLE_KEY` a `.env.local`
3. **Ejecutar** `scripts/secure-rls-policies.sql` en Supabase
4. **Reiniciar** servidor

**Resultado:**
- ✅ Frontend solo puede leer (protegido por RLS)
- ✅ Backend puede escribir (usando service_role)
- ⚠️ Admin sigue usando credenciales de dev (menos crítico)

### Opción B: Auth Completa (2-3 horas)

1. **Leer**: [AUTH_SETUP.md](./AUTH_SETUP.md)
2. **Configurar** Supabase Auth
3. **Crear** usuarios admin en Supabase
4. **Eliminar** credenciales hardcodeadas
5. **Implementar** validación de tokens real

**Resultado:**
- ✅ Todo completamente seguro
- ✅ Login real con Supabase
- ✅ Tokens validados
- ✅ Listo para producción

---

## 🎯 Recomendación por Etapa

### Desarrollo Local (Ahora)
```
✅ Estado actual OK
✅ Usa credenciales de dev
⚠️ Solo en localhost
⚠️ NO expongas a internet
```

### Pre-Producción / Staging
```
🔴 Implementa Opción A (Service Role)
🟡 Cambia credenciales de dev
🟡 Aplica políticas RLS seguras
```

### Producción Pública
```
🔴 Implementa Opción B (Auth Completa)
🔴 Supabase Auth configurado
🔴 Usuarios reales en Supabase
🔴 Validación de tokens
🔴 Rate limiting
🔴 HTTPS obligatorio
```

---

## 📋 Checklist de Seguridad

### Antes de Desplegar a Internet:

#### Nivel Mínimo (Staging):
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado en `.env.local`
- [ ] `scripts/secure-rls-policies.sql` ejecutado en Supabase
- [ ] API routes usan `supabaseAdmin` para escritura
- [ ] Cambiadas credenciales hardcodeadas por algo único
- [ ] Probado que anon no puede modificar datos

#### Nivel Recomendado (Producción):
- [ ] Todo lo anterior +
- [ ] Supabase Auth habilitado
- [ ] Usuarios admin creados en Supabase (no hardcoded)
- [ ] Tokens validados contra Supabase
- [ ] Middleware verifica tokens reales
- [ ] Roles de usuario implementados
- [ ] Rate limiting en API routes
- [ ] HTTPS configurado
- [ ] CORS apropiado
- [ ] Logging de intentos de acceso
- [ ] Backup de base de datos configurado

---

## 🛡️ Capas de Seguridad

```
┌─────────────────────────────────────┐
│  1. HTTPS / SSL                     │ ← Encriptación en tránsito
├─────────────────────────────────────┤
│  2. Middleware (Next.js)            │ ← Verificación de rutas
├─────────────────────────────────────┤
│  3. AuthGuard (Client)              │ ← Protección UI
├─────────────────────────────────────┤
│  4. API Route Validation            │ ← Verificación backend
├─────────────────────────────────────┤
│  5. Supabase Auth                   │ ← Autenticación
├─────────────────────────────────────┤
│  6. RLS Policies                    │ ← Autorización DB
├─────────────────────────────────────┤
│  7. Service Role (server only)      │ ← Admin operations
└─────────────────────────────────────┘
```

**Estado Actual:**
- ✅ Capa 2, 3, 7 implementadas
- ⚠️ Capas 1, 4, 5, 6 pendientes para producción

---

## 🚀 Próximos Pasos

### Prioridad 1 (Hacer YA):
1. Leer [RLS_SECURITY.md](./RLS_SECURITY.md)
2. Decidir: Service Role o Auth Completa
3. Implementar la opción elegida

### Prioridad 2 (Antes de producción):
1. Eliminar credenciales hardcodeadas
2. Configurar Supabase Auth
3. Crear usuarios reales
4. Probar todo el flujo

### Prioridad 3 (Mejoras):
1. Rate limiting
2. 2FA
3. Audit logs
4. IP whitelisting

---

## 📞 Contacto

¿Preguntas sobre seguridad?
- 📧 Email: ga.company.contact@gmail.com
- 📱 WhatsApp: +56 9 5183 0357

---

## 📖 Referencias

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/authentication)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

