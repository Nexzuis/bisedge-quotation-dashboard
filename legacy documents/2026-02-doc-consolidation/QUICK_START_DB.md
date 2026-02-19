# Database Quick Start Guide

## Instant Setup

The database is **automatically initialized** when you run the app. No manual setup required!

```bash
npm run dev
```

On first launch:
1. Database is created in browser IndexedDB
2. All models/batteries/tiers are seeded from JSON files
3. Default admin user is created (username: admin, password: admin)
4. Most recent quote is auto-loaded (or new quote if none exist)

## Common Operations

### Creating a New Quote
Click **"New"** button in TopBar, or:
```typescript
const { createNewQuote } = useQuoteDB();
await createNewQuote();
```

### Saving a Quote
**Auto-saves** 2 seconds after changes. Manual save:
```typescript
const { saveNow } = useAutoSave();
await saveNow();
```

### Loading a Quote
Click **"Load"** button in TopBar, or:
```typescript
const { loadFromDB } = useQuoteDB();
await loadFromDB('quote-id');
```

### Searching Quotes
```typescript
const { searchQuotes } = useQuoteDB();
const results = await searchQuotes('Crick Group');
```

### Duplicating a Quote
In Load Quote modal, click duplicate icon, or:
```typescript
const { duplicateQuote } = useQuoteDB();
await duplicateQuote('original-id');
```

## Data Access Patterns

### Get All Models (Reactive)
```typescript
const models = useModels(); // Auto-updates when DB changes
```

### Get Batteries by Chemistry
```typescript
const batteries = useBatteries('lithium-ion');
```

### Search Customers
```typescript
const { searchCustomers } = useCustomerDB();
const customers = await searchCustomers('Adcock');
```

## Quote Reference System

- **Base quotes**: 2140.0, 2141.0, 2142.0 (auto-increment)
- **Revisions**: 2142.0 → 2142.1 → 2142.2 → 2142.3

## Save Status Indicators

- **"Saving..."** - Save in progress
- **"Saved at HH:MM:SS"** - Last save time
- **"Save failed"** - Error occurred
- **(blank)** - No recent activity

## Browser DevTools

### View Database
1. Open Chrome DevTools (F12)
2. Go to Application → Storage → IndexedDB → BisedgeQuotationDB
3. Expand tables to view data

### Clear Database
```javascript
// In browser console
indexedDB.deleteDatabase('BisedgeQuotationDB');
location.reload();
```

### Reset to Factory Defaults
```typescript
import { resetDatabase } from './src/db/seed';
await resetDatabase();
```

## File Organization

```
db/
  interfaces.ts      - Type definitions
  schema.ts          - Database schema
  repositories.ts    - Get repository instances
  seed.ts            - Data seeding

hooks/
  useAutoSave.ts     - Auto-save hook
  useQuoteDB.ts      - Quote operations
  useCustomerDB.ts   - Customer operations
  useModels.ts       - Model data
  useBatteries.ts    - Battery data
```

## Troubleshooting

### "Version conflict" Error
Quote was modified in another tab. Refresh page to get latest version.

### Auto-Save Not Working
- Check quote ref is not "0000.0"
- Look for errors in browser console
- Verify IndexedDB is enabled

### Database Not Seeding
- Clear browser cache
- Delete IndexedDB manually (see above)
- Check console for import errors

## Best Practices

1. **Always use hooks** - Don't access repositories directly
2. **Let auto-save work** - Manual save only when needed
3. **Handle errors** - Check result.success on operations
4. **Use reactive queries** - useLiveQuery auto-updates
5. **Test in incognito** - Ensure clean state works

## Performance Tips

- Database operations are **async** - always await
- Auto-save is **debounced** - won't hammer the DB
- List queries are **paginated** - 10 items at a time
- Search has **limit of 20** - keeps queries fast

## Development Workflow

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The database persists across dev server restarts. Data is stored in:
```
~/.config/chromium/Default/IndexedDB/http_localhost_5173.indexeddb.leveldb/
```

## Production Deployment

IndexedDB data is **per-domain**. When deploying:
- Development data stays in localhost
- Production data separate on production domain
- No migration needed - each environment independent

## Next Features (Coming Soon)

- Cloud backup/sync
- Multi-user collaboration
- Quote approval workflow
- Email integration
- Document attachments

## Support

For issues or questions:
1. Check browser console for errors
2. View DATABASE_IMPLEMENTATION.md for details
3. Clear database and reseed if corrupted
