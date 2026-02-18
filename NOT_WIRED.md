# Items Not Wired / Incomplete

## ❌ **Not Functional (Need Implementation)**

### 1. **TopBar - Save Button**
**Location:** `src/components/layout/TopBar.tsx` (line 107-109)

**Current Status:** Button exists but no `onClick` handler

**What It Should Do:**
- Save current quote to IndexedDB (local database)
- Show success/error notification
- Update "last saved" timestamp
- Mark quote as saved (no unsaved changes indicator)

**Dependencies Needed:**
- Dexie database implementation (`src/db/schema.ts`)
- Save quote function in Zustand store
- Toast notification system (optional)

---

### 2. **Quote Generator Panel** (Panel 8 - Row 3, Middle)
**Location:** `src/components/layout/DashboardLayout.tsx` (lines 31-38)

**Current Status:** Placeholder with "PDF generation coming soon"

**What It Should Do:**
- Preview the PDF before exporting
- Show thumbnail/preview of what the PDF will look like
- Quick export button
- PDF customization options:
  - Include/exclude certain sections
  - Choose between rental vs rent-to-own tables
  - Add custom notes
- PDF template selection (if multiple templates exist)

**Suggested Implementation:**
```tsx
<QuoteGeneratorPanel />
```

Create new file: `src/components/panels/QuoteGeneratorPanel.tsx`
- Use `@react-pdf/renderer`'s `PDFViewer` component for preview
- Add export button (can reuse existing PDF generation)
- Add checkboxes for optional sections

---

### 3. **Database Persistence (IndexedDB)**
**Location:** `src/db/schema.ts` (mentioned in plan but not implemented)

**Current Status:** Not implemented

**What It Should Do:**
- Save quotes to IndexedDB using Dexie
- Load existing quotes
- Auto-save every 2 seconds (debounced)
- Quote history/versioning
- Customer database (CRM)
- Search and filter quotes

**Files to Create:**
```
src/db/
  schema.ts         - Dexie database schema
  operations.ts     - CRUD operations
src/hooks/
  useAutoSave.ts    - Auto-save hook
  useQuoteDB.ts     - Quote database operations
```

---

### 4. **Auto-Save Functionality**
**Current Status:** Not implemented

**What It Should Do:**
- Automatically save quote every 2 seconds after changes
- Debounce to avoid excessive saves
- Show "Saving..." / "Saved" indicator
- Recover unsaved work on reload

**Hook Implementation:**
```tsx
// src/hooks/useAutoSave.ts
export function useAutoSave() {
  const quote = useQuoteStore((state) => state);

  useEffect(() => {
    const timer = setTimeout(() => {
      db.quotes.put(quote); // Save to IndexedDB
    }, 2000);

    return () => clearTimeout(timer);
  }, [quote]);
}
```

---

### 5. **Customer Selection/Search**
**Current Status:** Manual input only in Deal Overview Panel

**What It Should Do:**
- Search existing customers from database
- Auto-fill customer details when selected
- Add new customer to database
- Customer history (past quotes)
- Quick select from recent customers

**UI Enhancement:**
Add to Deal Overview Panel:
- Dropdown/autocomplete for customer search
- "New Customer" vs "Existing Customer" toggle
- Customer details auto-fill

---

### 6. **Quote History / Load Quote**
**Current Status:** Not implemented

**What It Should Do:**
- List all saved quotes
- Filter by customer, date, status
- Load a previous quote
- Duplicate/copy quote
- Delete quote

**Suggested UI:**
- Add "Load Quote" button in TopBar
- Modal with quote list/search
- Click to load into current session

---

### 7. **Excel Import for Updated Costing Data**
**Location:** Mentioned in plan, `src/import/excelParser.ts` not created

**Current Status:** Not implemented

**What It Should Do:**
- Import updated model costs from Master Costing Sheet
- Update battery prices
- Import new models
- Update residual curves
- Validate imported data

**Implementation:**
```tsx
// src/import/excelParser.ts
import * as XLSX from 'xlsx';

export async function importCostingSheet(file: File) {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  // Parse sheets and update data files
  // models.json, batteries-pb.json, etc.
}
```

Add UI in Settings Panel or new Import/Export section

---

## ⚠️ **Partially Functional (Need Enhancement)**

### 8. **Quote Reference Number Generation**
**Current Status:** Hardcoded to "0000.0"

**What It Should Do:**
- Auto-increment quote numbers
- Format: `NNNN.R` (number + revision)
- Store last quote number in database
- Handle revisions (0000.1, 0000.2, etc.)

**Enhancement Needed:**
```tsx
// In Zustand store
const generateNextQuoteRef = () => {
  const lastQuoteNumber = getLastQuoteNumberFromDB();
  const nextNumber = lastQuoteNumber + 1;
  return `${String(nextNumber).padStart(4, '0')}.0`;
};
```

---

### 9. **Quote Status Workflow**
**Current Status:** Status field exists but no workflow

**What It Should Do:**
- Status transitions: draft → pending-approval → approved/rejected → sent-to-customer
- Prevent editing approved quotes
- Status change history/audit log
- Email notifications on status change

**Enhancement:**
Add status change functions to Zustand store with validation

---

### 10. **Operating Hours Per Month**
**Current Status:** Input exists in Fleet Builder but defaults to 180, not prominently shown

**What It Should Show:**
- Per-unit operating hours input
- Cost per hour calculation (displayed in pricing panel)
- Warning if hours > 720/month

**Enhancement:**
Make operating hours more visible in Fleet Builder panel

---

### 11. **Mast Selection**
**Current Status:** Data exists in models.json but no UI to select

**What It Should Do:**
- Dropdown to select mast type per unit
- Different mast heights affect cost/specs
- Show available masts for selected model

**Enhancement:**
Add mast dropdown to Fleet Builder panel (similar to battery selection)

---

### 12. **Attachments**
**Current Status:** Field exists in UnitSlot type but no UI

**What It Should Do:**
- Multi-select for attachments per unit
- Attachment costs added to price
- Show selected attachments in specs

**Enhancement:**
Add attachments multi-select to Fleet Builder panel

---

## ✅ **Fully Functional**

1. ✅ Deal Overview Panel - Customer info entry
2. ✅ Fleet Builder Panel - Model/battery/quantity selection
3. ✅ Pricing & Margins Panel - Real-time pricing calculations
4. ✅ Financial Analysis Panel - IRR, NPV, commission, tier
5. ✅ Specifications Panel - Model details display
6. ✅ Logistics Panel - Container optimization
7. ✅ Settings Panel - ROE, discount, terms configuration
8. ✅ Approval Workflow Panel - Validation and submit
9. ✅ Export PDF Button - Basic PDF generation
10. ✅ Battery Chemistry Lock - Mutual exclusivity enforcement
11. ✅ Dual ROE Calculation - Factory vs Customer ROE
12. ✅ Cascading Price Updates - Real-time recalculation
13. ✅ Margin Color Coding - Visual margin indicators
14. ✅ IRR Gating - Approval tier enforcement

---

## 🎯 **Priority Recommendations**

### **High Priority** (Core functionality)
1. **Save Button** - Essential for not losing work
2. **Database Persistence** - Save/load quotes
3. **Auto-Save** - Prevent data loss
4. **Quote Reference Generation** - Proper numbering

### **Medium Priority** (Professional features)
5. **Quote Generator Panel** - PDF preview
6. **Customer Database** - CRM functionality
7. **Quote History** - Load previous quotes
8. **Operating Hours Display** - Make it prominent

### **Low Priority** (Nice to have)
9. **Excel Import** - Update costing data
10. **Mast Selection UI** - Additional configuration
11. **Attachments UI** - Additional products
12. **Status Workflow** - Full lifecycle management

---

## 📝 **Next Steps**

To make the system production-ready, implement in this order:

1. **Database Setup** (1-2 hours)
   - Create Dexie schema
   - Add save/load functions

2. **Wire Save Button** (30 mins)
   - Add onClick handler
   - Call database save

3. **Auto-Save Hook** (30 mins)
   - Debounced save every 2 seconds
   - Show save status

4. **Quote Reference Generator** (30 mins)
   - Auto-increment logic
   - Store in database

5. **Quote Generator Panel** (1-2 hours)
   - PDF preview component
   - Export options

**Total Estimated Time:** 4-6 hours to complete core functionality

---

**Last Updated:** 2026-02-15
**Current Completion:** ~75% (core features working, persistence layer missing)
