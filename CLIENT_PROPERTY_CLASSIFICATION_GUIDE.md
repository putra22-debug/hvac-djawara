# 📋 Client & Property Classification System
**Industry-Specific Categorization for HVAC Business**

---

## ✅ Fixed Issues

### 1. Trigger Conflict Error
**Problem:** `ERROR: trigger "trigger_generate_ac_unit_code" for relation "ac_units" already exists`

**Solution:** Added `DROP TRIGGER IF EXISTS` before all trigger creations:
```sql
DROP TRIGGER IF EXISTS trigger_track_client_changes ON public.clients;
DROP TRIGGER IF EXISTS trigger_generate_ac_unit_code ON public.ac_units;
DROP TRIGGER IF EXISTS trigger_calculate_btu ON public.ac_units;
DROP TRIGGER IF EXISTS trigger_properties_updated_at ON public.client_properties;
DROP TRIGGER IF EXISTS trigger_ac_units_updated_at ON public.ac_units;
```

✅ SQL script now **safe to re-run** without conflicts!

---

## 🎯 New Classification System

### Client Types (8 Categories)

Sebelumnya: 2 tipe (residential, commercial)  
**Sekarang: 8 tipe** yang lebih specific:

| Client Type | Value | Use Case |
|------------|-------|----------|
| **Rumah Tangga** | `rumah_tangga` | Residential homes, apartments |
| **Perkantoran** | `perkantoran` | Corporate offices, coworking spaces |
| **Komersial** | `komersial` | Retail stores, malls, restaurants |
| **Perhotelan** | `perhotelan` | Hotels, resorts, guest houses |
| **Sekolah/Universitas** | `sekolah_universitas` | Schools, universities, training centers |
| **Gedung Pertemuan/Aula** | `gedung_pertemuan` | Convention centers, auditoriums, halls |
| **Kantor Pemerintah** | `kantor_pemerintah` | Government offices, public buildings |
| **Pabrik/Industri** | `pabrik_industri` | Factories, warehouses, manufacturing |

---

### Property Classification (3 Main Categories)

Properties grouped by broad category for easier filtering:

#### 1. **Rumah Tangga** (Residential)
- Property Type: `rumah_tangga`
- Untuk: Individual homes, private residences

#### 2. **Layanan Publik** (Public Services)
- Property Types:
  - `perkantoran` - Offices
  - `komersial` - Commercial spaces
  - `perhotelan` - Hotels
  - `sekolah_universitas` - Educational institutions
  - `gedung_pertemuan` - Convention/event venues
  - `kantor_pemerintah` - Government facilities

#### 3. **Industri** (Industrial)
- Property Type: `pabrik_industri`
- Untuk: Manufacturing, warehouses, heavy industry

---

## 🎨 UI Flow

### Add Property - Smart Cascading Selection

**Step 1: Select Property Category**
```
┌─────────────────────────────────────┐
│ Property Category *                 │
│ ┌─────────────────────────────────┐ │
│ │ Rumah Tangga (Residential)      │ │
│ │ Layanan Publik (Public Services)│ │
│ │ Industri (Industrial)           │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Step 2: Select Specific Property Type** (auto-filtered based on category)

If Category = **Rumah Tangga**:
```
Property Type: [Rumah Tangga] (only option)
```

If Category = **Layanan Publik**:
```
Property Type:
- Perkantoran
- Komersial  
- Perhotelan
- Sekolah/Universitas
- Gedung Pertemuan/Aula
- Kantor Pemerintah
```

If Category = **Industri**:
```
Property Type: [Pabrik/Industri] (only option)
```

---

## 📊 Database Schema Updates

### `client_properties` Table

```sql
-- Old
property_type TEXT NOT NULL, -- 'residential', 'office', 'warehouse', 'factory', 'mall'

-- New
property_type TEXT NOT NULL CHECK (property_type IN (
  'rumah_tangga', 'perkantoran', 'komersial', 'perhotelan', 
  'sekolah_universitas', 'gedung_pertemuan', 'kantor_pemerintah', 'pabrik_industri'
)),
property_category TEXT NOT NULL CHECK (property_category IN (
  'rumah_tangga', 'layanan_publik', 'industri'
)),
```

### Check Constraints
- ✅ Property type must be one of 8 valid values
- ✅ Property category must be one of 3 valid values
- ✅ Database-level validation ensures data integrity

---

## 🎯 Business Benefits

### 1. Better AC Classification
**Before:**
- "Commercial client" → vague

**After:**
- "Perhotelan client at Gedung Pertemuan property"
- Immediately know: high-capacity units, 24/7 operation, critical uptime

### 2. Service Differentiation
Different property types = different service needs:

| Property Type | Typical AC Needs | Service Pattern |
|--------------|------------------|-----------------|
| Rumah Tangga | 1-5 units, residential hours | Quarterly maintenance |
| Perkantoran | 10-50 units, business hours | Monthly checks |
| Perhotelan | 50-200 units, 24/7 operation | Weekly inspections |
| Pabrik/Industri | Large industrial units | Critical preventive maintenance |

### 3. Reporting & Analytics
Filter reports by:
- All hotel clients
- All government buildings
- All industrial facilities
- Properties under "Layanan Publik" category

### 4. Pricing Strategy
Tailor pricing based on property type:
- Rumah tangga: Standard residential rates
- Perhotelan: Premium 24/7 support
- Pabrik industri: Industrial service contracts

---

## 🖼️ Visual Indicators

### Property Cards Display

```
┌────────────────────────────────────────────────┐
│ 🏠 Grand Hotel Jakarta  [Perhotelan]  ⭐Primary│
│                                                 │
│ Jl. Sudirman No. 123, Jakarta                  │
│ Jakarta Pusat 10110                            │
│                                                 │
│ 45 AC Unit(s)                                  │
└────────────────────────────────────────────────┘
```

- 🏠 Home icon for `rumah_tangga`
- 🏢 Building icon for other types
- Badge showing property type
- ⭐ Primary indicator

---

## 📝 Migration Guide

### For Existing Data

If you already have properties with old `property_type` values:

```sql
-- Update existing properties to new classification
UPDATE client_properties 
SET 
  property_type = CASE 
    WHEN property_type = 'residential' THEN 'rumah_tangga'
    WHEN property_type = 'office' THEN 'perkantoran'
    WHEN property_type = 'warehouse' THEN 'pabrik_industri'
    WHEN property_type = 'factory' THEN 'pabrik_industri'
    WHEN property_type = 'mall' THEN 'komersial'
    ELSE 'perkantoran'
  END,
  property_category = CASE
    WHEN property_type = 'residential' THEN 'rumah_tangga'
    WHEN property_type IN ('office', 'mall') THEN 'layanan_publik'
    WHEN property_type IN ('warehouse', 'factory') THEN 'industri'
    ELSE 'layanan_publik'
  END;
```

---

## 🎓 Usage Examples

### Example 1: Hotel Chain
**Client Type:** Perhotelan  
**Properties:**
1. Grand Hotel Jakarta - Perhotelan (Layanan Publik)
   - 45 VRV units, 20 cassette units
2. Grand Hotel Bali - Perhotelan (Layanan Publik)
   - 38 VRV units, 15 cassette units

**Service Profile:**
- 24/7 priority support
- Weekly preventive maintenance
- Critical uptime requirements
- Premium service package

---

### Example 2: Educational Institution
**Client Type:** Sekolah/Universitas  
**Properties:**
1. Main Campus Building - Sekolah/Universitas (Layanan Publik)
   - 60 split units, 10 cassette units
2. Library Building - Sekolah/Universitas (Layanan Publik)
   - 25 split units
3. Auditorium - Gedung Pertemuan (Layanan Publik)
   - 15 ducted units

**Service Profile:**
- Maintenance during semester breaks
- Energy-efficient focus
- Budget-conscious pricing

---

### Example 3: Manufacturing Company
**Client Type:** Pabrik/Industri  
**Properties:**
1. Production Facility - Pabrik/Industri (Industri)
   - 10 industrial chiller units
2. Admin Office - Perkantoran (Layanan Publik)
   - 15 split units

**Service Profile:**
- Production downtime minimization
- Industrial-grade equipment
- Emergency response SLA

---

## 🔍 Search & Filter Capabilities

### Dashboard Filters

```typescript
// Filter by category
properties.filter(p => p.property_category === 'layanan_publik')

// Filter by specific type
properties.filter(p => p.property_type === 'perhotelan')

// Group by category for reporting
const grouped = properties.reduce((acc, p) => {
  acc[p.property_category] = acc[p.property_category] || []
  acc[p.property_category].push(p)
  return acc
}, {})
```

---

## ✅ Validation Rules

### Client Form
- Client type: Required, must be one of 8 options
- Business details: Required if NOT `rumah_tangga`
- NPWP: Optional for all types

### Property Form
- Property category: Required (1 of 3)
- Property type: Required (auto-filtered by category)
- Address: Required
- City: Required
- Coordinates: Optional

---

## 🚀 Deployment Steps

1. **Execute Updated SQL:**
   ```bash
   # In Supabase SQL Editor
   supabase/CLIENT_DATA_MANAGEMENT.sql
   ```
   
2. **Verify Triggers Created:**
   ```sql
   SELECT trigger_name, event_object_table 
   FROM information_schema.triggers 
   WHERE trigger_schema = 'public'
   ORDER BY event_object_table;
   ```

3. **Test UI Flow:**
   - Add new client with new type
   - Add property with category selection
   - Verify type filtering works
   - Check visual badges display

4. **Migrate Existing Data** (if needed):
   - Run migration script above
   - Verify all properties have valid types

---

## 📊 Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Client Types** | 2 options | 8 specific categories |
| **Property Categories** | None | 3 main groups |
| **Property Types** | 5 generic | 8 industry-specific |
| **UI Flow** | Single dropdown | Smart cascading selection |
| **Triggers** | Conflict on re-run | Safe with DROP IF EXISTS |
| **Classification** | Basic | Industry-aligned |

---

## 🎉 Result

Complete industry-specific classification system yang:
- ✅ Matches real HVAC business needs
- ✅ Enables better service differentiation
- ✅ Facilitates accurate reporting
- ✅ Supports pricing strategies
- ✅ Safe SQL migrations (no conflicts)
- ✅ Smart UI with cascading selections
- ✅ Visual property type indicators
