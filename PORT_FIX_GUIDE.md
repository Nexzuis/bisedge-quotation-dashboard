# 🔧 Port 5173 Fix - Complete Guide

## ✅ What Was Fixed

**Problem:** Port was being killed, but Vite started too quickly and saw it as "in use", switching to port 5174.

**Solution:**
1. Created a smart startup script (`scripts/start-dev.js`)
2. Kills port 5173
3. Waits 1 second for OS to fully release the port
4. Forces Vite to start on port 5173 with `--strictPort`
5. If port is still taken, shows clear error instead of silently switching ports

---

## 🚀 How to Test

### Stop Current Server
If your server is running on port 5174, stop it:
```bash
Ctrl+C
```

### Start with New Script
```bash
npm run dev
```

### Expected Output
You should see:
```
========================================
   Bisedge Quotation Dashboard
========================================

🔍 Checking port 5173...
✅ Port 5173 cleared
⏳ Waiting 1000ms for port to be fully released...
✅ Port should be available now

🚀 Starting Vite dev server on port 5173...
========================================

  VITE v7.3.1  ready in XXX ms

  ➜  Local:   http://localhost:5173/    ← Should be 5173!
  ➜  Network: use --host to expose
```

---

## ✅ Verify Port

**Correct:**
```
Local: http://localhost:5173/
```

**Wrong (shouldn't happen anymore):**
```
Local: http://localhost:5174/
```

---

## 🐛 If Port is Still Wrong

### Option 1: Manual Kill
```bash
# Kill port manually
npm run kill-port

# Wait 2 seconds
# Then start
npm run dev
```

### Option 2: Use Simple Mode (no auto-kill)
```bash
npm run dev:simple
```

### Option 3: Kill Everything on Port (Windows)
```bash
# Find process
netstat -ano | findstr :5173

# Kill it (replace XXXX with actual PID)
taskkill /PID XXXX /F

# Start dev
npm run dev
```

---

## 📋 What Changed

### Files Modified:
1. **`package.json`**
   - `"dev"`: Now uses `node scripts/start-dev.js`
   - Added `"dev:simple"`: Backup command without auto-kill

2. **`vite.config.ts`**
   - Set `strictPort: true` - Forces port 5173, errors if unavailable

3. **`scripts/start-dev.js`** (NEW)
   - Smart startup script with port killing + delay

---

## 🎯 Testing Checklist

- [ ] Stop any running dev server (Ctrl+C)
- [ ] Run `npm run dev`
- [ ] See colored output with progress messages
- [ ] Server starts on `http://localhost:5173/` (not 5174!)
- [ ] App loads correctly in browser
- [ ] Test page works: `http://localhost:5173/#/test-supabase`

---

## 🚀 Next: Test Supabase Connection

Once you confirm port 5173 is working:

1. Navigate to: `http://localhost:5173/#/test-supabase`
2. Click "🚀 Run Connection Tests"
3. Report results!

---

## ℹ️ Alternative Commands

```bash
# Standard start (with auto port-kill)
npm run dev

# Simple start (no auto-kill, use if issues)
npm run dev:simple

# Just kill port (without starting server)
npm run kill-port
```

---

Ready to test! Run `npm run dev` and check if you see port 5173! 🎯
