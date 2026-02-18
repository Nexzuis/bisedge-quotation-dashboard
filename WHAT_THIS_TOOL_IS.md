# 📋 PROJECT CONTEXT — Bisedge Quotation Dashboard
> Read this file at the start of every session before making any changes.

---

## 🧭 What This Tool Is

The **Bisedge Quotation Dashboard** is a fully **offline-first, local-first CRM and quotation platform**
built for a forklift rental and sales business operating in South Africa (currency: ZAR,
exchange rates: EUR → ZAR). It is designed for a small sales team to manage customer leads
and generate professional rental/lease quotations — even without an internet connection.

The tool was built in collaboration with Claude (Anthropic AI) via CLI and is deployed on
**Vercel** as a Single Page Application (SPA) using **Vue/React + Vite**, with **IndexedDB**
as the primary local database and **Supabase (PostgreSQL)** as the remote sync backend.

---

## 🏗️ Architecture Overview

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React/Vue + Vite (SPA) | UI, routing, state |
| Local DB | IndexedDB (`BisedgeQuotationDB` v60) | Offline-first primary store |
| Remote DB | Supabase (PostgreSQL) | Cloud sync, multi-user |
| Auth | Supabase Auth (local user table) | Login, roles |
| PDF Export | jsPDF / pdfmake (vendor bundle) | Quote PDF generation |
| Deployment | Vercel | Hosting |
| Data Source | Excel + JSON imports | Forklift price lists, config matrices |

### Sync Strategy
The app is **offline-first**. All reads/writes go to IndexedDB first. A background sync queue
(`processQueue()`) pushes changes to Supabase when online. The sync order matters:
**companies must sync before quotes** (FK constraint). There is currently no mutex on the
queue processor — this causes race conditions.

---

## 🗄️ IndexedDB Stores (BisedgeQuotationDB)

| Store | Description |
|---|---|
| `quotes` | All quote records. `slots` field is a JSON string (not array — known bug) |
| `companies` | Customer/lead company records |
| `contacts` | Contact persons per company |
| `activities` | CRM activity log per company |
| `priceListSeries` | Forklift model series from Excel. `models` is a JSON string (known bug) |
| `forkliftModels` | Individual model specs (currently empty — needs population) |
| `batteryModels` | Battery options (currently empty — needs population) |
| `configurationMatrices` | Option availability matrix from Excel import (currently empty) |
| `containerMappings` | Shipping container specs per series (49 entries, missing series 1275) |
| `telematicsPackages` | Telematics subscription options (15 entries) |
| `attachments` | Forklift attachment options (currently empty) |
| `templates` | PDF document templates (T&Cs, Cover Letters, Email, Headers) |
| `users` | Local user accounts |
| `settings` | System defaults (ROE, interest rate, lease term, etc.) |
| `residualCurves` | Residual value % by battery chemistry and lease term |
| `commissionTiers` | Commission rate tiers by margin % |
| `approvalTiers` | Approval workflow configuration |
| `auditLog` | System audit trail (currently only logs LOGIN events) |
| `notifications` | In-app notifications |

---

## 👤 User Roles

| Role | Access |
|---|---|
| `system_admin` | Full access — all admin panels, all data |
| `sales_rep` | CRM + quote builder, own leads only |
| `key_account` | CRM + quote builder, assigned accounts |

Current system has **1 user**: `nexzuis@gmail.com` (system_admin).

---

## 🔑 Core Features

### 1. CRM / Lead Management (`/#/customers`)
- Kanban board and table view of companies by pipeline stage
- Stages: Lead → Contacted → Site Assessment → Quoted → Negotiation → Won → Lost
- Create new leads, log activities, assign to sales reps
- Filter by stage, search, export to Excel
- Pipeline value tracking per stage

### 2. Quote Builder (`/#/builder`) — 8-Step Wizard
| Step | Name | Description |
|---|---|---|
| 1 | Client Info | Company name, contact, address (linked to CRM company) |
| 2 | Quote Settings | Exchange rates (EUR→ZAR), discount %, interest rate, lease term, quote type |
| 3 | Select Units | Pick up to 6 forklift units (series + model) from price list |
| 4 | Configure Options | Select accessories/options per unit (Basic, Mast, Forks, Cabin, Electrical, etc.) |
| 5 | Costs | Local battery, telematics package, attachments, clearing charges, local costs |
| 6 | Commercial | Markup %, residual values, maintenance rates, lease term, telematics subscription |
| 7 | Review | Full summary before export |
| 8 | Export | PDF generation |

### 3. Quote Dashboard (`/#/quote`)
- View and edit the current active quote
- Progress tracker (5 milestones)
- Panels: Deal Overview, Fleet Builder, Specifications, Logistics/Container, Financial Analysis, Approval Workflow, Quote Generator (PDF)
- Save to local DB and sync to Supabase
- Submit for approval workflow
- Export PDF quote document

### 4. Reports (`/#/crm/reports`)
- Pipeline summary, sales rep performance, revenue forecast
- Activity summary

### 5. Admin Panel (`/#/admin`)
- **Pricing Config**: Commission tiers, Residual value curves, Default values
- **Configuration Matrices**: Import Excel config matrix for forklift options
- **Approvals**: Approval queue management
- **Users**: User management (add, edit roles, reset passwords)
- **Templates**: T&Cs, Cover Letters, Email Templates, Quote Headers
- **Audit Log**: System activity trail
- **Backup & Restore**: Export/import full JSON backup of all data

---

## 💰 Pricing & Financial Logic

All pricing is in **ZAR** (South African Rand). Forklifts are priced in **EUR** and converted.

| Field | Description |
|---|---|
| `factoryROE` | Factory Rate of Exchange (EUR→ZAR), e.g. 20.60 |
| `customerROE` | Customer Rate of Exchange (EUR→ZAR), e.g. 20.60 |
| `eurCost` | Base unit cost in EUR from price list |
| `factoryCostZAR` | `eurCost × factoryROE` |
| `landedCostZAR` | Factory cost + options + local costs + clearing |
| `sellingPriceZAR` | Landed cost × (1 + markup%) |
| `leaseRate` | Monthly payment calculated via annuity formula using interest rate + term |
| `residualValue` | End-of-term value % (from residual curves by chemistry + term) |
| `IRR` | Internal Rate of Return |
| `NPV` | Net Present Value |
| `commission` | Based on margin % and commission tier table |
| `margin` | `(selling - landed) / selling × 100` |

Quote types: **Rental** (monthly payments), **Rent-to-Own** (ownership at end), **Dual** (both)

---

## 🐛 Known Bugs (Active)

| # | Severity | Description |
|---|---|---|
| 001 | 🔴 Critical | FK violation on every save — company not synced to Supabase before quote |
| 002 | 🔴 Critical | Sync queue race condition — `processQueue()` runs twice concurrently, no mutex |
| 003 | 🔴 Critical | `slots` and `models` stored as JSON strings in IDB instead of parsed arrays |
| 004 | 🟠 High | PDF export: SVG logos render as blank, `Buffer is not defined` error |
| 005 | 🟠 High | Series 1275 missing from `containerMappings` — "No container data" shown |
| 006 | 🟠 High | Home + Customers pages have ~5–7s blank screen before render |
| 007 | 🟠 High | New Lead modal shows validation error on open before user interaction |
| 008 | 🟡 Medium | `batteryModels` store is empty |
| 009 | 🟡 Medium | `contacts` and `activities` stores empty — CRM not being used |
| 010 | 🟡 Medium | Specifications card shows "Model data not found" (caused by Bug 003) |
| 011 | 🟡 Medium | Customer Export button gives zero feedback |
| 012 | 🟡 Medium | Audit log only records LOGIN events, not CRM/quote actions |
| 013 | 🟡 Medium | Residual value charts render empty (no visual data) |
| 014 | 🔵 Low | Email Templates and Quote Headers templates are empty |
| 015 | 🔵 Low | Configuration Matrices empty — Excel not yet imported |
| 016 | 🔵 Low | Company autocomplete dropdown lingers after selection in Quote Builder |

---

## 📁 Data Import Workflows

### Forklift Price List (Excel)
- Imported via Admin > Configuration Matrices > Import Excel
- Column A: Material Number (base model)
- Column B: Long Code (option identifier)
- Column C: Spec Code (1100, 1135, etc.)
- Column D: Description
- Columns E–I: INDX1–5 (availability: 0=Not Available, 1=Standard, 2=Optional, 3=Special Order)

### Backup / Restore
- Admin > Backup & Restore
- Exports full JSON of all IDB stores (quotes, companies, contacts, templates, catalog, pricing config, audit logs, users — passwords excluded)
- Import modes: Merge (keep existing, add new) or Replace

---

## 🔧 Environment

- **Live URL:** `https://bisedge-quotation-dashboard.vercel.app`
- **Supabase Project:** `padeaqdcutqzgxujtpey.supabase.co`
- **IDB Name:** `BisedgeQuotationDB` (version 60)
- **Default Login:** `nexzuis@gmail.com` / `Nexzuis+2580` (SYSTEM_ADMIN)
- **Default ROE:** 20.60 EUR/ZAR
- **Default Lease Term:** 60 months
- **Default Interest Rate:** 9.5% p.a.
- **Default Operating Hours:** 180 hrs/month

---

## 🎯 Development Principles

1. **Offline-first** — app must work without internet. IndexedDB is source of truth.
2. **Sync order matters** — always sync parent records before child records (companies → contacts → quotes).
3. **No data loss** — sync failures must be surfaced to the user, not silently swallowed.
4. **ZAR currency** — all displayed values in South African Rand with space-separated thousands (e.g. R 18 711).
5. **PDF quality** — exported quotes are customer-facing professional documents. Images must render correctly.
6. **Single user now, multi-user later** — build with role-based access in mind even while testing solo.
