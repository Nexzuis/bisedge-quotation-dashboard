# Quick Start Guide - Phase 7-9 Features

## What's New in Phase 7-9

Phase 7-9 completes the Bisedge Quotation Dashboard with admin features, integration polish, and comprehensive testing preparation.

---

## Quick Access

### Running the Application
```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Default Login
- **URL:** http://localhost:5173 (or shown in terminal)
- **Username:** admin
- **Password:** admin123
- **⚠️ Change password immediately!**

---

## New Features Overview

### 1. User Management (Admin → Users)
**What it does:** Manage all system users, roles, and permissions.

**Quick Actions:**
- Click "Add User" to create new user
- Edit user: Click pencil icon
- Delete user: Click trash icon (cannot delete last admin)
- Reset password: Edit user, enter new password

**Roles:**
- **Admin:** Full access to everything
- **Manager:** Admin + approval rights
- **Sales:** Create/edit quotes
- **Viewer:** Read-only access

**Validation:**
- Unique username and email required
- Valid email format enforced
- Password minimum 6 characters
- Cannot delete last active admin

---

### 2. Template Management (Admin → Templates)
**What it does:** Create and manage document templates for quotes.

**Template Types:**
- **Terms & Conditions:** JSON structure with sections
- **Cover Letters:** Text with placeholders
- **Email Templates:** Email body templates
- **Quote Headers:** Custom header content

**Quick Actions:**
- Click tab for template type (T&C, Cover Letter, Email, Headers)
- Click "Add Template" to create new
- Preview: Click eye icon
- Duplicate: Click copy icon
- Set default: Check "Set as default" when editing
- Delete: Click trash icon

**Placeholders:**
- `{customerName}` - Customer name
- `{quoteRef}` - Quote reference number
- `{date}` - Current date
- `{signatoryName}` - Person signing
- `{signatoryTitle}` - Signatory's title

---

### 3. Audit Log (Admin → Audit Log)
**What it does:** Track all system changes with before/after values.

**Features:**
- View all actions (create, update, delete, approve, etc.)
- Filter by user, action, entity type, date range
- Search across all fields
- View detailed changes (before/after diff)
- Export to Excel

**Quick Actions:**
- Filter dropdown → Select user/action/entity
- Date range → Select from/to dates
- Search → Type to filter across all fields
- View details → Click eye icon to see changes
- Export → Click "Export to Excel" button

**What's Logged:**
- User login/logout
- Quote creation/editing/deletion
- User management changes
- Template changes
- Configuration changes
- All admin actions

---

### 4. Backup & Restore (Admin → Backup & Restore)
**What it does:** Export and import complete database backups.

**Export Backup:**
- Click "Export Backup" button
- Downloads JSON file: `bisedge_backup_YYYYMMDD_HHMMSS.json`
- Includes all data EXCEPT user passwords (for security)

**Import Backup:**
- **Merge Mode:** Keeps existing data, adds new records
- **Replace Mode:** Deletes all data, restores from backup (⚠️ DESTRUCTIVE)

**Quick Actions:**
1. Select mode (Merge or Replace)
2. Click "Select Backup File"
3. Choose JSON file
4. Review preview (shows record counts)
5. Click "Confirm Import"
6. Wait for success message
7. Reload page if needed

**⚠️ Warning:** Replace mode is DESTRUCTIVE! Always export current backup first!

---

### 5. Enhanced Top Bar
**What's new:** User avatar, dropdown menu, unsaved changes protection.

**Features:**
- **User Avatar:** Circle with user icon in top right
- **User Info:** Name and role badge displayed
- **Dropdown Menu:**
  - Shows name and email
  - Logout button
- **Auto-Save Indicator:** "Saved at HH:MM:SS" when data saved
- **Unsaved Changes Warning:** Browser warns before closing if unsaved changes

**Quick Actions:**
- Click avatar → Opens dropdown
- Click outside → Closes dropdown
- Click "Logout" → Confirms and logs out
- Check save status → Look for "Saved at..." text

---

## Common Workflows

### Workflow 1: Create a New User
1. Login as Admin
2. Navigate to Admin → Users
3. Click "Add User"
4. Fill form:
   - Username (unique)
   - Full Name
   - Email (unique, valid format)
   - Password (min 6 chars)
   - Role (Admin/Manager/Sales/Viewer)
   - Check "Active" if user can login
5. Click "Save Changes"
6. Verify user appears in table
7. New user can now login with their credentials

### Workflow 2: Create Custom Terms & Conditions
1. Login as Admin
2. Navigate to Admin → Templates
3. Click "Terms & Conditions" tab
4. Click "Add Template"
5. Enter template name (e.g., "Standard T&C 2026")
6. Enter JSON content or use default structure:
```json
{
  "sections": [
    {
      "number": 1,
      "title": "Quotation Validity",
      "content": [
        "This quotation is valid for 30 days.",
        "Prices subject to change without notice."
      ]
    }
  ],
  "footer": "All prices exclude VAT."
}
```
7. Check "Set as default" if this should be used for new quotes
8. Click "Save Changes"
9. Preview template to verify
10. New quotes will use this template in PDFs

### Workflow 3: Review System Activity
1. Login as Admin
2. Navigate to Admin → Audit Log
3. Apply filters:
   - User dropdown → Select specific user
   - Action dropdown → Select action type
   - Date range → Select from/to
4. Browse results (20 per page)
5. Click eye icon on interesting entry
6. View details modal shows:
   - What changed
   - Old values (red)
   - New values (green)
7. Export to Excel if needed for reporting

### Workflow 4: Backup Before Major Changes
1. Login as Admin
2. Navigate to Admin → Backup & Restore
3. Click "Export Backup"
4. Save file to secure location
5. Make changes (add users, edit pricing, etc.)
6. If something goes wrong:
   - Return to Backup & Restore
   - Select "Replace" mode (⚠️ destructive!)
   - Upload backup file
   - Confirm import
   - Data restored to backup state

### Workflow 5: Check Unsaved Changes
1. Create or edit a quote
2. Make a change (e.g., edit customer name)
3. Note "Saving..." appears in top bar
4. Wait 2 seconds for auto-save
5. Note "Saved at HH:MM:SS" appears
6. Try to close browser tab:
   - If saved → No warning
   - If unsaved → Browser warns you

---

## Keyboard Shortcuts

- **Tab** - Navigate between fields
- **Enter** - Submit form (when in input field)
- **Escape** - Close modal/dropdown
- **Arrow Keys** - Navigate dropdowns

---

## Troubleshooting

### Issue: Cannot login
**Solution:**
- Verify username/password correct
- Check Caps Lock is off
- Verify user is active (Admin → Users)
- Clear browser cache if persistent

### Issue: "Cannot delete last admin" error
**Solution:**
- This is intentional! Create another admin user first
- Or change last admin's role to Manager, then create new admin

### Issue: Template not appearing in Quote Generator
**Solution:**
- Verify template saved successfully
- Check template type matches (T&C vs Cover Letter)
- Try refreshing browser
- Set as default to ensure it's used

### Issue: Audit log not showing my actions
**Solution:**
- Audit logging happens automatically
- Refresh page if just performed action
- Check filters (may be filtering out your user)
- Verify you're logged in (anonymous actions not logged)

### Issue: Backup import fails
**Solution:**
- Verify JSON file is valid (open in text editor)
- Check file is from Export Backup (has correct structure)
- Ensure file not corrupted
- Try exporting new backup and importing that

### Issue: Unsaved changes warning appearing when saved
**Solution:**
- Wait full 2 seconds for auto-save
- Check "Saved at..." indicator
- May be browser caching issue - refresh page
- Try manual save (Save button in top bar)

---

## Tips & Best Practices

### User Management
- ✅ Create users with least privilege (Sales for most users)
- ✅ Change default admin password immediately
- ✅ Use descriptive usernames (firstname.lastname)
- ✅ Review user access quarterly
- ✅ Disable users instead of deleting (audit trail)
- ❌ Don't share passwords between users
- ❌ Don't create multiple admins unless necessary

### Template Management
- ✅ Use descriptive template names with dates
- ✅ Preview templates before setting as default
- ✅ Duplicate and modify instead of creating from scratch
- ✅ Use placeholders for dynamic content
- ✅ Keep one default per type
- ❌ Don't delete templates referenced in quotes
- ❌ Don't use special characters in JSON (use escaping)

### Audit Log
- ✅ Review audit log weekly for unusual activity
- ✅ Export audit log monthly for compliance
- ✅ Filter by date range to narrow results
- ✅ Check audit before/after major changes
- ❌ Don't ignore suspicious audit entries
- ❌ Don't rely solely on audit log (keep backups)

### Backup & Restore
- ✅ Export backup weekly (minimum)
- ✅ Export backup before major changes
- ✅ Store backups in secure, off-device location
- ✅ Test restore process periodically
- ✅ Name backup files descriptively
- ❌ Don't use Replace mode without current backup
- ❌ Don't store backups on same device only

### General
- ✅ Log out when leaving workstation
- ✅ Use strong passwords (mix of upper, lower, numbers, symbols)
- ✅ Keep browser updated for security
- ✅ Monitor save status before closing
- ❌ Don't ignore unsaved changes warnings
- ❌ Don't share login credentials

---

## FAQs

**Q: How do I change my password?**
A: Admin → Users → Edit your user → Enter new password → Save

**Q: Can I recover deleted data?**
A: Yes, if you have a backup. Import backup in Replace mode.

**Q: Where is data stored?**
A: In browser's IndexedDB. Use DevTools → Application → IndexedDB to view.

**Q: Can I use on multiple devices?**
A: No, data is device/browser-specific. Use Backup/Restore to transfer.

**Q: How do I add custom T&Cs to a quote?**
A: Create template (Admin → Templates), set as default, generate PDF.

**Q: What if I forget admin password?**
A: Reset via browser DevTools → IndexedDB → users table (advanced users only)
Or restore from backup before password change.

**Q: Can I undo changes?**
A: No automatic undo. Restore from backup if needed.

**Q: How long are audit logs kept?**
A: Forever (unless manually deleted via backup/restore).

**Q: Can I export audit logs?**
A: Yes, click "Export to Excel" in Audit Log page.

**Q: What's the difference between Merge and Replace import?**
A: Merge keeps existing data and adds new. Replace deletes everything first.

---

## Performance Tips

### For Large Datasets
- Export old quotes and archive
- Clear audit log periodically (via backup/restore)
- Use filters instead of scrolling through all data
- Close unused browser tabs

### For Slow PDF Generation
- Reduce number of units in quote
- Disable optional sections (specs, cover letter)
- Use simpler templates
- Try different browser

### For Slow Auto-Save
- Reduce number of browser extensions
- Close other resource-heavy tabs
- Clear browser cache
- Ensure sufficient disk space

---

## Security Reminders

- 🔒 Change default admin password immediately
- 🔒 Use strong, unique passwords
- 🔒 Don't share login credentials
- 🔒 Log out when leaving workstation
- 🔒 Export backups to secure location (encrypted drive)
- 🔒 Review audit log for suspicious activity
- 🔒 Disable inactive users
- 🔒 Keep browser updated for security patches

---

## Quick Reference: Admin Menu

```
Admin Panel
├── Pricing & Tiers
│   ├── Approval Tiers
│   ├── Commission Tiers
│   ├── Residual Curves
│   └── Default Values
├── Catalog Management
│   ├── Models
│   ├── Batteries
│   ├── Attachments
│   └── Categories
├── Users (NEW)
│   └── User CRUD
├── Templates (NEW)
│   ├── Terms & Conditions
│   ├── Cover Letters
│   ├── Email Templates
│   └── Quote Headers
├── Audit Log (NEW)
│   ├── Filter & Search
│   ├── View Details
│   └── Export to Excel
└── Backup & Restore (NEW)
    ├── Export Backup
    └── Import Backup
```

---

## Support & Documentation

**Full Documentation:**
- `README.md` - Project overview
- `COMPREHENSIVE_TESTING_GUIDE.md` - Detailed test cases
- `PRODUCTION_READY_CERTIFICATION.md` - Production readiness status
- `PHASE_7_8_9_IMPLEMENTATION_COMPLETE.md` - Implementation details

**For Help:**
1. Check this Quick Start guide
2. Review comprehensive documentation
3. Check browser console for errors (F12)
4. Contact technical support

---

**End of Quick Start Guide**

**You're now ready to use all Phase 7-9 features! Start by creating users, then configure templates and pricing.**
