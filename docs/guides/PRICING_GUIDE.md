# 💰 Guía de Precios - Lorcana Store Chile

## Sistema de Pricing Basado en Rareza

---

## 📊 Estructura de Precios Propuesta

Basado en tu plantilla `lorcana_pricing_template_chile.csv`:

| Rareza | Precio Normal | Precio Foil | Ratio Foil | Cartas Afectadas* |
|--------|--------------|-------------|------------|-------------------|
| **Common** | $500 | $500 | 1.0× | ~800 cartas |
| **Uncommon** | $1,000 | $1,000 | 1.0× | ~600 cartas |
| **Rare** | $2,500 | $4,000 | 1.6× | ~300 cartas |
| **Super Rare** | $5,000 | $8,000 | 1.6× | ~100 cartas |
| **Legendary** | $30,000 | $50,000 | 1.67× | ~37 cartas |

\* Números aproximados de la base de datos de 1,837 cartas

---

## 🎯 Criterios de Mapeo

### **1. Rareza como Base**

Cada carta en tu DB tiene un campo `rarity`:
```typescript
card.rarity = "Common" | "Uncommon" | "Rare" | "Super Rare" | "Legendary"
```

El script usará esto para asignar el precio inicial.

---

### **2. Precio Normal (Base)**

Usé el **promedio** de tus rangos:

```
Common:      (200 + 1,000) / 2 = $600  → Redondeado: $500
Uncommon:    (500 + 2,000) / 2 = $1,250 → Redondeado: $1,000
Rare:        (1,000 + 5,000) / 2 = $3,000 → Ajustado: $2,500
Super Rare:  (3,000 + 10,000) / 2 = $6,500 → Ajustado: $5,000
Legendary:   (10,000 + 100,000) / 2 = $55,000 → Ajustado: $30,000
```

**¿Por qué ajustados?**
- Precios conservadores para empezar
- Tú ajustas manualmente después según demanda
- Mejor empezar bajo y subir que viceversa

---

### **3. Precio Foil (Multiplicador)**

Basado en tu plantilla:

```
Common/Uncommon: foil_multiplier = 1.0
  → Mismo precio normal y foil

Rare+: foil_multiplier = 1.5-2.0
  → Foil vale más (coleccionables)
```

**Mi propuesta:**
- Common/Uncommon: **1.0×** (mismo precio)
- Rare: **1.6×** ($2,500 → $4,000)
- Super Rare: **1.6×** ($5,000 → $8,000)
- Legendary: **1.67×** ($30,000 → $50,000)

---

## 🔍 Ejemplo de Cartas Reales

Simulación con cartas de tu DB:

| Carta | Rareza | Precio Normal | Precio Foil |
|-------|--------|--------------|-------------|
| Mickey Mouse - Detective | Common | $500 | $500 |
| Ariel - On Human Legs | Uncommon | $1,000 | $1,000 |
| Elsa - Snow Queen | Rare | $2,500 | $4,000 |
| Maleficent - Monstrous Dragon | Super Rare | $5,000 | $8,000 |
| Stitch - Rock Star | Legendary | $30,000 | $50,000 |

---

## ⚠️ Consideraciones Importantes

### **1. Stock NO importa**

El script actualiza:
- ✅ Cartas con stock = 0
- ✅ Cartas con stock > 0
- ✅ Solo si el **precio actual = 0 o NULL**

**No toca:**
- ❌ Cartas que YA tienen precio > 0
- ❌ Precios que TÚ ya configuraste manualmente

---

### **2. Ajustes Post-Aplicación**

Después de aplicar el script, deberías revisar y ajustar:

#### **Factores que AUMENTAN precio:**
- 🔥 **Alta demanda** (cartas meta / populares) → +30-50%
- ✨ **Edición limitada** (First Edition, Promos) → +20-50%
- 🎨 **Full Art / Foil especial** → +50-100%
- 🏆 **Competitivas** (usadas en torneos) → +30-70%

#### **Factores que REDUCEN precio:**
- 📉 **Baja demanda** (poco jugadas) → -20-40%
- 🔄 **Reimpresiones** (múltiples ediciones) → -30%
- 📦 **Sobre-saturación** (muy comunes) → -50%

---

## 🛠️ Proceso Recomendado

### **Paso 1: Preview (Revisar)**
```sql
-- Ejecuta en Supabase SQL Editor:
scripts/utilities/preview-pricing-update.sql
```

Esto te mostrará:
- Cuántas cartas por rareza se actualizarán
- Ejemplos de 10 cartas
- Sin modificar nada

### **Paso 2: Decidir**

Revisa los números del preview:
- ✅ ¿Te parecen razonables?
- ✅ ¿Cantidad de cartas OK?
- ✅ ¿Precios dentro de tu mercado?

### **Paso 3: Aplicar (Si decides proceder)**
```sql
-- Ejecuta en Supabase SQL Editor:
scripts/utilities/apply-pricing-by-rarity.sql
```

Esto:
- Actualiza precios basados en rareza
- Muestra resumen de cambios
- Muestra 20 ejemplos de cartas actualizadas

### **Paso 4: Ajustar Manualmente**

1. Ve al admin panel: `/admin/inventory`
2. Busca cartas específicas:
   - Cartas meta (↑ precio)
   - Cartas promocionales (↑ precio)
   - Cartas poco populares (↓ precio)
3. Ajusta según tu conocimiento del mercado local

---

## 📝 Alternativas al Script

### **Opción B: Ajuste Manual Selectivo**

Si prefieres NO usar script automático:

1. En `/admin/inventory`:
2. Filtra por rareza (ej: "Legendary")
3. Edita precios uno por uno
4. Usa tu criterio para cada carta

**Ventajas:**
- ✅ Control total
- ✅ Precios más precisos desde el inicio

**Desventajas:**
- ❌ Toma mucho tiempo (1,837 cartas)
- ❌ Propenso a errores humanos

---

### **Opción C: Híbrido (Recomendado) ⭐**

1. **Ejecuta script** → Precios base por rareza
2. **Ajusta top 50** → Cartas más valiosas/populares
3. **Deja el resto** → Se ajustan según ventas reales

**Ventajas:**
- ✅ Rápido (script en 1 segundo)
- ✅ Preciso para cartas importantes
- ✅ Aprende de mercado con el tiempo

---

## 🎯 Mi Recomendación

### **Para GA Company:**

1. ✅ **Ejecuta preview** → Ve los números
2. ✅ **Ejecuta apply** → Precios base automáticos
3. ✅ **Ajusta manualmente:**
   - Legendarias (37 cartas)
   - Super Raras populares (~20 cartas)
   - Cartas meta conocidas (~30 cartas)
4. ✅ **Monitorea ventas** → Ajusta según demanda real

**Tiempo total:** ~1 hora para revisar y ajustar 80-100 cartas importantes

---

## 🔄 Precios Dinámicos (Futuro)

Considera implementar después:

- 📊 **Ajuste automático** basado en:
  - Ventas (si una carta se vende mucho → ↑ precio)
  - Stock bajo (pocas unidades → ↑ precio)
  - Tiempo sin ventas (nadie compra → ↓ precio)

- 🌍 **Benchmark externo:**
  - TCGPlayer API
  - eBay sold listings
  - Mercado Libre Chile

---

## 📞 ¿Preguntas?

Antes de ejecutar los scripts:

1. ¿Los precios propuestos te parecen razonables para Chile?
2. ¿Quieres ajustar algún rango antes?
3. ¿Prefieres precios más conservadores o agresivos?

**Dime y ajusto los scripts antes de que los ejecutes.** 🎴💰

