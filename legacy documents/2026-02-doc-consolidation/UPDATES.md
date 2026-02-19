# Updates - Model Number Focus & Expanded Catalog

## Changes Made (2026-02-15)

### 1. **Expanded Model Catalog (7 → 30 Models)**

**Previous:** Only 7 sample models

**New:** 30 Linde forklift models across 6 categories:

#### Pallet Trucks (7 models)
- **1120** - Linde L10 (1.0t)
- **1121** - Linde L12 (1.2t)
- **1122** - Linde L14 (1.4t)
- **1123** - Linde L16 (1.6t)
- **5031** - Linde T20 SP (2.0t)
- **1131** - Linde T25 (2.5t)
- **1132** - Linde T30 (3.0t)

#### Pallet Stackers (5 models)
- **5025** - Linde EG16 (1.6t)
- **5027** - Linde EG20 (2.0t)
- **5029** - Linde EG25 (2.5t)
- **1142** - Linde L12 L HP (1.2t)
- **1143** - Linde L14 L HP (1.4t)

#### Order Pickers (2 models)
- **5021** - Linde V 10 (1.0t)
- **1152** - Linde V 12 (1.2t)

#### Reach Trucks (5 models)
- **1161** - Linde R14 (1.4t)
- **1162** - Linde R16 (1.6t)
- **5023** - Linde K Range (1.6t)
- **5033** - Linde R20 HD (2.0t)
- **1163** - Linde R25 (2.5t)

#### Electric Counterbalance (5 models)
- **1171** - Linde E16 (1.6t)
- **1172** - Linde E20 (2.0t)
- **1173** - Linde E25 (2.5t)
- **1174** - Linde E30 (3.0t)
- **1175** - Linde E35 (3.5t)

#### IC Counterbalance (6 models)
- **1181** - Linde H16 (1.6t)
- **1182** - Linde H20 (2.0t)
- **1183** - Linde H25 (2.5t)
- **1184** - Linde H30 (3.0t)
- **1185** - Linde H35 (3.5t)
- **1186** - Linde H40 (4.0t)
- **1187** - Linde H50 (5.0t)

---

### 2. **Model Number Prominence**

#### Fleet Builder Panel
- **Model dropdown now shows:** `ModelCode | ModelName`
  - Example: `1120 | Linde L10`
  - Example: `5021 | Linde V 10`
- Models grouped by category with visual separators
- Monospace font for model codes for better readability
- Small info icon next to "Model Number" label

#### Pricing & Margins Panel
- **Model column now displays:** `ModelCode | ModelName`
  - Model code highlighted in teal color
  - Example: **`1120`** | Linde L10
- Model code uses monospace font for consistency

#### Visual Improvements
- Battery chemistry badges (PB/Li) next to completion status
- Setup status badges (Complete/Setup) for each unit
- Summary footer showing configured units and total quantity

---

### 3. **Improved Dropdown Organization**

**Before:**
```
▼ Select model...
  Linde V 10
  Linde K Range
  Linde EG16
  ...
```

**After:**
```
▼ Select model...
  ━━ Pallet Truck ━━
    1120 | Linde L10
    1121 | Linde L12
    ...
  ━━ Pallet Stacker ━━
    5025 | Linde EG16
    5027 | Linde EG20
    ...
  ━━ Order Picker ━━
    5021 | Linde V 10
    1152 | Linde V 12
  ━━ Reach Truck ━━
    1161 | Linde R14
    5023 | Linde K Range
    ...
  ━━ Counterbalance ━━
    1171 | Linde E16
    ...
  ━━ IC Counterbalance ━━
    1181 | Linde H16
    ...
```

---

## Testing the Updates

### Test 1: Model Selection by Number
1. Launch the app: `npm run dev`
2. Go to Fleet Builder panel
3. Click Unit 1 dropdown
4. Notice models are grouped by category
5. Select "1120 | Linde L10"
6. Model code **1120** should appear prominently

### Test 2: Pricing Table Display
1. Configure 2-3 units with different models
2. Go to Pricing & Margins panel
3. Model codes should appear in teal color before model names
4. Example row: **`5021`** | Linde V 10 | R 719,608 | ...

### Test 3: Category Organization
1. Open any unit slot dropdown
2. Verify categories appear in order:
   - Pallet Truck
   - Pallet Stacker
   - Order Picker
   - Reach Truck
   - Counterbalance
   - IC Counterbalance

---

## How to Add More Models

### Option 1: Manual Addition
Edit `src/data/models.json` and add entries following this structure:

```json
{
  "modelCode": "XXXX",
  "modelName": "Linde ModelName",
  "description": "Type and capacity",
  "category": "Pallet Truck",
  "capacity": 1600,
  "eurCost": 8100,
  "defaultMast": "N/A",
  "availableMasts": ["N/A"],
  "compatibleBatteries": ["pb-24v-250ah", "li-ion-24v-250ah"],
  "dimensions": {
    "length": 154,
    "width": 68,
    "height": 118,
    "weight": 410
  },
  "specifications": {
    "1100": "ModelName",
    "3400": "N/A",
    "6600": "Basic",
    "7100": "N/A"
  }
}
```

### Option 2: Excel Import (Future Feature)
Once implemented, you'll be able to:
1. Export updated model data from Master Costing Sheet
2. Import via the app's Excel import feature
3. Models will automatically populate

---

## File Changes

- ✅ `src/data/models.json` - Expanded from 7 to 30 models
- ✅ `src/components/panels/FleetBuilderPanel.tsx` - Model code prominence, category grouping
- ✅ `src/components/panels/PricingMarginsPanel.tsx` - Model code display in pricing table

---

## Next Steps

### Immediate
- ✅ Models now work with numbers (codes) prominently displayed
- ✅ 30 models available across all categories

### Recommended
1. **Add remaining Linde models** from your Master Costing Sheet
   - Use the JSON structure above
   - Maintain consistent formatting

2. **Verify EUR costs** match your actual costing data

3. **Add model images** (for future PDF specification pages)
   - Store as base64 in `src/pdf/assets/models/`

4. **Test battery compatibility**
   - Verify compatibleBatteries arrays are correct
   - Add more battery models if needed

---

## Benefits of This Update

1. **✅ Easier Model Identification** - Users can search/select by model code
2. **✅ Better Organization** - Category grouping makes finding models faster
3. **✅ Professional Display** - Model codes prominent in all views
4. **✅ Scalable** - Easy to add 100+ more models using same structure
5. **✅ Consistent UX** - Model code | Name format throughout app

---

**Updated:** 2026-02-15
**Build:** Successful ✅
**Status:** Ready to use
