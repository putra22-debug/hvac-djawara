# AI Agent Handoff — December 22, 2025
## People Management + Technician Profile Sync + Reimburse (Finance & Technician)

**Session Date:** December 22, 2025  
**Scope:** People Management consistency, technician portal sync, reimburse module end-to-end, deploy pipeline

---

## 1) What’s Live Now (High-Level)

### People Management
- Verified technicians now appear in People cardbox by ensuring **`profiles` + `user_tenant_roles`** are created when the technician activates their account.
- Unverified technicians still appear in a separate “roster” view (from `technicians`).
- Avatar upload for technicians is implemented with crop-before-upload and persisted via a server route (bypasses RLS that blocks admin updates).
- “Kirim ulang link aktivasi” exists for technician invitations.

### Reimburse
- Finance page can:
  - Manage categories (active/inactive)
  - View submissions
  - Update status using actions:
    - Diproses → Setujui / Tolak
    - Disetujui → Tandai Dibayar
  - View receipt using signed URL.
- Technician portal can:
  - See categories created by finance/admin (via server API)
  - Submit reimburse with receipt upload
  - See status history
  - Dashboard shows reimburse indicator (counts + latest status).

---

## 2) Key Decisions / Architecture

### Why service-role APIs exist for technician reimburse
RLS in `supabase/CREATE_REIMBURSE_MODULE.sql` intentionally restricts:
- `reimburse_categories` **SELECT** → finance roles only

Technicians still need categories to submit. Solution: create **server endpoints** that:
- Authenticate the logged-in user
- Resolve `tenant_id` via `technicians.user_id`
- Query categories/requests and create requests using a service-role Supabase client

This avoids weakening RLS while enabling the technician UX.

---

## 3) Files Changed / Important Locations

### Technician portal
- Technician dashboard: `app/technician/dashboard/page.tsx`
  - Profile section shows avatar and phone
  - Reimburse indicator summary card
  - **Prefers People Management values** by using `technicians.full_name` and `technicians.phone` as primary source
- Technician reimburse page: `app/technician/reimburse/page.tsx`

### Technician reimburse APIs (service-role)
- `app/api/technician/reimburse/categories/route.ts`
- `app/api/technician/reimburse/list/route.ts`
- `app/api/technician/reimburse/create/route.ts`

### Finance reimburse UI
- `app/dashboard/finance/finance-reimburse-client.tsx`
  - Status actions + status badges
  - “Nama” column uses **technician name** (joins to `technicians` by `submitted_by = user_id`)

### People Management
- `app/dashboard/people/people-client.tsx`
  - Technician roster cards
  - Resend activation
  - Avatar crop + upload
- Server routes:
  - `app/api/people/technicians-roster/route.ts`
  - `app/api/people/resend-technician-activation/route.ts`
  - `app/api/people/update-profile-avatar/route.ts` (service role)

### Supabase SQL
- `supabase/CREATE_REIMBURSE_MODULE.sql`
- `supabase/CREATE_REIMBURSE_STORAGE.sql`

---

## 4) Deployment Notes

- Vercel deployment is triggered by pushing to mirror remote:
  - `putra22` remote → `main` branch

Recent commits in this session include:
- Fix technician reimburse page compile issues
- Add technician reimburse APIs
- Finance status actions and technician-name display
- Technician dashboard reimburse indicator
- Technician dashboard now prefers `technicians` for name/phone

---

## 5) Operational Checklist (Next Agent / Next Session)

### A) Supabase SQL must be applied (if not already)
- Run `supabase/CREATE_REIMBURSE_MODULE.sql`
- Run `supabase/CREATE_REIMBURSE_STORAGE.sql`

### B) Supabase CORS (common runtime error)
If browser console shows CORS blocked calls to `https://<project>.supabase.co/rest/v1/...`:
- Supabase Dashboard → Project Settings → API → **CORS Allowed Origins**
- Add:
  - `http://localhost:3000` (local)
  - `https://<your-vercel-domain>.vercel.app`
  - custom domain if any

### C) Data correctness checks
- Technician dashboard should show:
  - Name from `technicians.full_name`
  - Phone from `technicians.phone`
  - Avatar from `profiles.avatar_url`
- Finance reimburse list should show technician name (not email).

---

## 6) Known Gaps / Potential Follow-Ups

- People Management currently displays member details mainly from `profiles` (via `get_team_members`).
  - If you want admin edits to immediately update technician portal and People modal consistently, consider adding an “Edit technician profile” flow that updates BOTH:
    - `technicians` (name/phone)
    - `profiles` (full_name/phone) via a service-role route

---

## 7) Quick Commands

- Build locally: `npm run build`
- Deploy: `git push putra22 main`
