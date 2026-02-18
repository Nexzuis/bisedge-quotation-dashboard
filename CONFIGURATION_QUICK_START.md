# Configuration Matrix System - Quick Start Guide

## 🚀 For End Users

### Configuring a Forklift Unit

1. **Select a Model**
   - Open the Fleet Builder panel
   - Click the model dropdown for any unit slot
   - Select a forklift model (e.g., "EG16 | Electric Pallet Truck")

2. **Open Configuration**
   - After selecting a model, you'll see "⚠️ Configuration Required"
   - Click on the yellow warning box
   - The configuration page opens automatically

3. **Make Selections**
   - **Green badges** = Standard (included at no cost, auto-selected)
   - **Blue badges** = Optional (available for extra cost)
   - **Yellow badges** = Special Order (requires special approval)
   - Select one option from each specification group
   - Watch the cost update in real-time on the right sidebar

4. **Save Configuration**
   - Review the configuration summary on the right
   - Check the total EUR cost
   - Click **Save Configuration** button
   - You'll return to the dashboard

5. **Edit Later**
   - The status now shows "✓ Configured" with variant code
   - Click **Edit** to re-open configuration and make changes

### Understanding Availability Levels

| Level | Badge | Meaning | Cost |
|-------|-------|---------|------|
| 0 | *(hidden)* | Not available for this variant | N/A |
| 1 | Standard (Green) | Included in base price | €0 |
| 2 | Optional (Blue) | Available for extra cost | +€XXX |
| 3 | Special Order (Yellow) | Special order with extra cost | +€XXX |

---

## 👨‍💼 For Administrators

### Importing a Configuration Matrix

1. **Prepare Excel File**
   - Format: Material Number, Long Code, Spec Code, Description, INDX1-5
   - INDX columns contain availability levels (0, 1, 2, or 3)
   - Spec code 1100 defines model variants

2. **Import to System**
   - Navigate to **Admin Panel** → **Configuration Matrices**
   - Click **Import Excel** button
   - Select your Excel file
   - Wait for import confirmation

3. **Verify Import**
   - Check the import status message
   - Review the matrix card showing:
     - Base model family (e.g., "EG16")
     - Number of variants
     - Number of spec groups
     - Last updated date

4. **Export for Backup**
   - Click **Export** button on any matrix card
   - Excel file downloads automatically
   - Use for backup or editing

### Managing Matrices

**Delete Matrix:**
- Click trash icon (🗑️) on matrix card
- Confirm deletion
- Matrix removed from system

**View Details:**
- Matrix card shows all variants
- Spec group count per variant
- Last updated timestamp

---

## 📊 Excel File Format

### Required Columns

| Column | Name | Description | Example |
|--------|------|-------------|---------|
| A | Material Number | Base model identifier | "127500000021135001" |
| B | Long Code | Full option code | "127500000021135005" |
| C | Spec Code | Specification group | "1135" |
| D | Description | Human-readable name | "Lead acid batteries" |
| E | INDX1 | Availability for Variant 1 | 1 |
| F | INDX2 | Availability for Variant 2 | 2 |
| G | INDX3 | Availability for Variant 3 | 0 |
| H | INDX4 | Availability for Variant 4 | 3 |
| I | INDX5 | Availability for Variant 5 | 1 |

### Example Rows

```
Material Number      | Long Code           | Spec | Description           | INDX1 | INDX2 | INDX3 | INDX4 | INDX5
---------------------|---------------------|------|-----------------------|-------|-------|-------|-------|-------
127500000021100001   | 127500000021100001  | 1100 | EG16 (3-wheel)       | 1     | 0     | 0     | 0     | 0
127500000021100002   | 127500000021100002  | 1100 | EG16P (4-wheel)      | 0     | 1     | 0     | 0     | 0
127500000021100003   | 127500000021100003  | 1100 | EG16H (High-lift)    | 0     | 0     | 1     | 0     | 0
127500000021135001   | 127500000021135001  | 1135 | Lead acid batteries  | 1     | 1     | 1     | 1     | 1
127500000021135002   | 127500000021135002  | 1135 | Li-ION batteries     | 2     | 2     | 2     | 2     | 2
```

### Important Rules

1. **Variant Detection:**
   - Variants are detected from rows with spec code `1100`
   - Each INDX column with availability > 0 represents a variant
   - Variant code extracted from description

2. **Availability Values:**
   - Must be `0`, `1`, `2`, or `3`
   - Any other value will be treated as `0`

3. **Spec Code Organization:**
   - Groups options by spec code (e.g., all 1135 rows are battery options)
   - Categories auto-assigned based on spec code ranges:
     - 1100-1199 = Basic
     - 1200-1999 = Battery
     - 2000-2999 = Wheels & Tires
     - 3000-3999 = Mast & Hydraulics
     - 4000-4999 = Controls & Safety
     - 5000-5999 = Cabin & Comfort

---

## 🔧 Common Spec Codes

| Code | Name | Category |
|------|------|----------|
| 1100 | MODEL | Basic |
| 1135 | BATTERY TECHNOLOGY | Battery |
| 1200 | PEDAL SYSTEM | Battery |
| 1300 | WHEELS & TIRES | Wheels & Tires |
| 2200 | DRIVE AXLE | Wheels & Tires |
| 2300 | LOAD AXLE | Wheels & Tires |
| 3200 | MAST | Mast & Hydraulics |
| 3300 | HYDRAULICS | Mast & Hydraulics |
| 4100 | OPERATOR CONTROLS | Controls & Safety |
| 4200 | LIGHTING | Controls & Safety |
| 4300 | SAFETY FEATURES | Controls & Safety |
| 5100 | CABIN | Cabin & Comfort |
| 5200 | SEATING | Cabin & Comfort |

---

## ❓ FAQ

### Q: What happens if I don't configure a unit?
**A:** The unit slot will show a warning "⚠️ Configuration Required" and you won't be able to generate accurate pricing until configuration is complete.

### Q: Can I change configuration after saving?
**A:** Yes! Click the "Edit" button on the configuration status to re-open and modify your selections.

### Q: What if an option I need isn't available?
**A:** The option may not be available for your selected variant. Try a different model variant or contact your administrator to verify the configuration matrix.

### Q: Can I import multiple matrices?
**A:** Yes! Each base model family (EG16, E20, etc.) can have its own configuration matrix. Import multiple Excel files for different model families.

### Q: What happens to existing quotes?
**A:** Existing quotes will need configuration added. A migration system can be implemented to handle this gracefully.

### Q: How do I know which variant to select?
**A:** Variants are different configurations of the same base model:
- EG16 = 3-wheel version
- EG16P = 4-wheel version
- EG16H = High-lift version

---

## 🎯 Tips & Best Practices

### For Users:
1. Always review the configuration summary before saving
2. Pay attention to the cost deltas for optional items
3. Special Order items (yellow) may require approval
4. Double-check all specifications are selected before saving

### For Admins:
1. Test imports with small Excel files first
2. Export matrices regularly for backup
3. Validate Excel files have correct column structure
4. Keep spec code naming consistent across matrices
5. Document custom spec codes and categories

---

## 🆘 Troubleshooting

**Import fails with errors:**
- Check Excel file has correct columns (A-I minimum)
- Verify INDX values are 0, 1, 2, or 3
- Ensure spec code 1100 exists for variant detection

**Configuration page won't load:**
- Verify configuration matrix exists for the model family
- Check variant code matches database records
- Clear browser cache and reload

**Cost not updating:**
- Refresh the page to reload calculations
- Verify EUR cost deltas set in configuration matrix
- Check browser console for errors

**Can't save configuration:**
- Ensure all spec groups have a selection
- Check validation error messages on page
- Verify you have an active internet connection

---

## 📞 Support

For technical issues or questions:
1. Check the CONFIGURATION_MATRIX_IMPLEMENTATION.md for technical details
2. Review browser console for error messages
3. Contact system administrator for matrix updates
4. Consult Linde documentation for spec code references

---

**Last Updated:** February 16, 2026
**Version:** 1.0
**System:** Bisedge Quotation Dashboard - Configuration Matrix Module
