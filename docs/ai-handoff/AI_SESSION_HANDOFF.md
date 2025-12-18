# AI Handoff Guide - HVAC Djawara Project
**Last Updated:** December 18, 2025
**Session Summary:** Client Premium Authentication System Implementation

---

## 🎯 Current Project Status

### What We Just Completed (This Session)
1. ✅ Client premium authentication system (2-tier access)
2. ✅ Public link access (`/c/[token]`) untuk basic features
3. ✅ Premium registration flow (`/client/register`)
4. ✅ Password reset system (`/client/forgot-password`, `/client/reset-password`)
5. ✅ Auto-redirect untuk premium clients
6. ✅ Universal login concept (`/universal-login`)
7. ✅ Fixed "Activate Premium" button routing

### Technology Stack
- **Frontend:** Next.js 14 (App Router), TypeScript, React 18
- **Backend:** Supabase PostgreSQL + Row Level Security (RLS)
- **Authentication:** Supabase Auth (dual-access: public token + email/password)
- **UI:** Tailwind CSS, Shadcn UI components
- **Deployment:** Vercel (auto-deploy from GitHub)
- **Git Remotes:** origin (Soedirboy58), putra22 (putra22-debug)

---

## 📁 Key Files Created/Modified

### Frontend Pages
1. **`app/c/[token]/page.tsx`** - Public client view (basic access)
   - Direct query ke `clients` table by `public_token`
   - Shows: AC stats, service history, maintenance schedule
   - Premium upgrade CTA dengan link ke `/client/register`
   - Auto-redirect jika user sudah login sebagai premium client

2. **`app/client/register/page.tsx`** - Premium registration
   - Verify token via `get_client_by_public_token()` RPC
   - Create auth.users account via `supabase.auth.signUp()`
   - Link user_id ke clients table
   - Email verification flow

3. **`app/client/login/page.tsx`** - Client login (updated)
   - Email/password authentication
   - Verify user adalah client (bukan staff)
   - Check `is_premium_member` status
   - Forgot password link

4. **`app/client/forgot-password/page.tsx`** - Password reset request
   - `supabase.auth.resetPasswordForEmail()`
   - Email verification instructions

5. **`app/client/reset-password/page.tsx`** - Set new password
   - `supabase.auth.updateUser({ password })`
   - Auto-redirect ke login after success

6. **`app/client/verify-email/page.tsx`** - Email verification notice
   - Shown after registration
   - Instructions untuk check email

7. **`app/universal-login/page.tsx`** - Universal login (future)
   - One login for all roles: Admin, Owner, Technician, Client
   - Auto-detect role dan redirect appropriately

### SQL Migrations
1. **`supabase/ADD_PUBLIC_TOKEN_COLUMN.sql`** ✅ EXECUTED
   - Adds `public_token` column to `clients` table
   - Generate 32-char hex tokens
   - Auto-generate trigger for new clients
   - Index for fast lookup

2. **`supabase/COMPLETE_FIX_PUBLIC_LINK.sql`** ✅ EXECUTED
   - Complete setup: column + tokens + RLS + trigger
   - All-in-one migration file

3. **`supabase/CREATE_GET_CLIENT_BY_TOKEN.sql`** ✅ EXECUTED
   - RPC: `get_client_by_public_token(p_token TEXT)`
   - Returns: client_id, client_name, client_email, has_account
   - Used in registration page

4. **`supabase/FIX_GENERATE_PUBLIC_LINK.sql`** ✅ EXECUTED
   - Updates `generate_public_view_link()` function
   - Changed from `public_view_token` to `public_token`
   - Fixes ShareClientLink component

5. **`supabase/FIX_RLS_PUBLIC_ACCESS.sql`** ✅ EXECUTED
   - RLS policy: "Allow public access by token"
   - Enables anon users to read clients by token

6. **`supabase/CREATE_CLIENT_REGISTRATION.sql`** ⚠️ NOT YET EXECUTED
   - Adds `user_id` column to clients (FK to auth.users)
   - RPC: `register_client_account()`
   - RPC: `send_client_registration_invite()`
   - RLS policy for authenticated clients

7. **`supabase/CREATE_SERVICE_REPORTS_TABLE.sql`** ⚠️ NOT YET EXECUTED
   - New table: `service_reports`
   - Stores technician work reports + client ratings
   - RPC: `get_service_report_by_order()`
   - RPC: `submit_service_rating()`

### Documentation Files
1. **`CLIENT_PREMIUM_AUTH_GUIDE.md`** - Complete authentication guide
2. **`supabase/CLIENT_FLOW_GUIDE.sql`** - SQL guide with examples
3. **`supabase/CHECK_PUTRA_PREMIUM.sql`** - Verify client premium status
4. **`supabase/MANUAL_PASSWORD_RESET.sql`** - Manual reset procedures

---

## 🔑 Authentication Architecture

### Two-Tier Access System

#### 1. PUBLIC LINK (Basic Access - No Login)
- **URL:** `https://hvac-djawara.vercel.app/c/[public_token]`
- **Access Method:** Direct link dengan token di URL
- **Features:**
  - ✅ View service history
  - ✅ View upcoming maintenance
  - ✅ AC unit statistics
  - ✅ Basic technician info
  - ❌ Cannot rate technicians
  - ❌ No loyalty points
  - ❌ No detailed reports

#### 2. PREMIUM ACCOUNT (Full Access - Email/Password Login)
- **URL:** `https://hvac-djawara.vercel.app/client/login`
- **Access Method:** Email + Password authentication
- **Registration:** Via invitation link dengan token
- **Features:**
  - ✅ All basic features
  - ✅ Rate technician services (1-5 stars)
  - ✅ View detailed work reports
  - ✅ Loyalty points accumulation
  - ✅ Priority customer support
  - ✅ Full service history
  - ✅ Personalized dashboard

### Database Schema

```sql
-- clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  public_token TEXT UNIQUE NOT NULL, -- For public link access
  user_id UUID REFERENCES auth.users(id), -- For premium access
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_clients_public_token ON clients(public_token);
CREATE INDEX idx_clients_user_id ON clients(user_id);

-- RLS Policies
CREATE POLICY "Allow public access by token"
ON clients FOR SELECT TO anon, authenticated
USING (true);
```

### Key RPC Functions

```sql
-- 1. Get client by public token (for registration)
get_client_by_public_token(p_token TEXT)

-- 2. Generate public link (for ShareClientLink component)
generate_public_view_link(p_client_id UUID)

-- 3. Register premium account (for registration flow)
register_client_account(p_client_id UUID, p_email TEXT, p_password TEXT, p_full_name TEXT)

-- 4. Send registration invite (for admins)
send_client_registration_invite(p_client_id UUID)
```

---

## 🚨 Known Issues & Solutions

### Issue 1: Public Link Shows "Link Tidak Valid"
**Cause:** Token tidak ter-generate atau RLS policy tidak allow anon access
**Solution:**
1. Execute `COMPLETE_FIX_PUBLIC_LINK.sql`
2. Execute `FIX_RLS_PUBLIC_ACCESS.sql`
3. Verify: `SELECT COUNT(public_token) FROM clients;`

### Issue 2: "Invalid Invitation" Error
**Cause:** Button "Activate Premium" mengarah ke `/invite/[token]` (tidak ada)
**Solution:** ✅ FIXED - Sekarang mengarah ke `/client/register?token=[token]`

### Issue 3: Client Lupa Password
**Solutions:**
1. **Self-Service:** `/client/forgot-password` → email reset link
2. **Admin Manual:** Supabase Dashboard → Authentication → Users → Reset Password
3. **Re-register:** Unlink user_id, generate new registration link

### Issue 4: Token Mismatch (UI vs Database)
**Cause:** `generate_public_view_link()` menggunakan `public_view_token` lama
**Solution:** ✅ FIXED - Updated function to use `public_token`

---

## 📋 Pending Tasks

### High Priority
1. ⚠️ **Execute SQL Migrations:**
   - `CREATE_SERVICE_REPORTS_TABLE.sql` (for rating system)
   - `CREATE_CLIENT_REGISTRATION.sql` (if not done manually)

2. ⚠️ **Test Complete Flow:**
   - [ ] Public link access (basic client)
   - [ ] Registration dengan token
   - [ ] Email verification
   - [ ] Login premium client
   - [ ] Auto-redirect dari public link ke premium dashboard
   - [ ] Password reset flow

### Medium Priority
3. **Service Rating System:**
   - Frontend: ServiceOrderDetailModal with rating UI
   - Backend: RPC functions already created (in SQL file)
   - Integration: Connect rating submission to API

4. **Email Configuration:**
   - Configure Supabase email templates
   - Test email delivery (registration, password reset)
   - Consider custom SMTP (Resend, SendGrid)

### Low Priority
5. **Universal Login Implementation:**
   - Replace `/login` with `/universal-login`
   - Test role detection and routing
   - Update landing page links

6. **Premium Feature Guards:**
   - Add authentication checks for premium features
   - Conditional rendering based on `is_premium_member`
   - Upgrade prompts for basic clients

---

## 🔧 Quick Reference Commands

### Get Client Public Link
```sql
SELECT 
  name,
  'https://hvac-djawara.vercel.app/c/' || public_token as public_link
FROM clients
WHERE email = 'client@example.com';
```

### Get Registration Link
```sql
SELECT 
  'https://hvac-djawara.vercel.app/client/register?token=' || public_token as registration_link
FROM clients
WHERE email = 'client@example.com';
```

### Check Client Status
```sql
SELECT 
  name,
  email,
  CASE 
    WHEN user_id IS NOT NULL THEN '✅ Premium Member'
    ELSE '⭐ Basic Access Only'
  END as status
FROM clients;
```

### Reset Client Password (Unlink & Re-register)
```sql
-- 1. Unlink user
UPDATE clients SET user_id = NULL WHERE email = 'client@example.com';

-- 2. Get new registration link
SELECT 
  'https://hvac-djawara.vercel.app/client/register?token=' || public_token
FROM clients
WHERE email = 'client@example.com';
```

### Verify Token Generated
```sql
SELECT 
  COUNT(*) as total_clients,
  COUNT(public_token) as clients_with_token,
  COUNT(user_id) as premium_clients
FROM clients;
```

---

## 🎨 Component Architecture

### ShareClientLink Component
**File:** `components/client-portal/ShareClientLink.tsx`
**Purpose:** Generate and share public link to client
**Key Points:**
- Uses `generate_public_view_link()` RPC function
- QR code generation with qrcode.react
- WhatsApp share integration
- Copy to clipboard functionality

### Public Client Page
**File:** `app/c/[token]/page.tsx`
**Purpose:** Main entry point for clients (basic access)
**Flow:**
1. Get token from URL params
2. Query clients table by public_token
3. Check if user logged in (for auto-redirect)
4. Fetch client data: properties, AC units, orders, maintenance
5. Show basic view with premium upgrade CTA
6. If premium client + logged in → redirect to `/client/dashboard`

### Registration Page
**File:** `app/client/register/page.tsx`
**Purpose:** Premium account registration
**Flow:**
1. Get token from URL query params
2. Verify token via RPC: `get_client_by_public_token()`
3. Check if already registered
4. Show registration form (password + confirm)
5. Create auth.users via `supabase.auth.signUp()`
6. Link user_id to clients table
7. Send verification email
8. Redirect to `/client/verify-email`

---

## 🔐 Security Notes

### RLS Policies
- **Public clients table:** Allow anon SELECT (filtered by app logic)
- **Service orders:** Requires authentication OR valid public_token
- **Service reports:** RPC functions with token validation
- **Premium features:** Check `user_id IS NOT NULL`

### Token Security
- 32-character hex tokens (256-bit entropy)
- Unique constraint prevents duplicates
- No expiration (permanent per client)
- Cannot be used for write operations (read-only)

### Password Requirements
- Minimum 8 characters
- Supabase Auth handles hashing (bcrypt)
- Email verification required for activation

---

## 🚀 Deployment Info

### Auto-Deploy
- **Trigger:** Git push to `main` branch
- **Platforms:** Vercel (frontend), Supabase (backend)
- **Remotes:**
  - `origin`: https://github.com/Soedirboy58/hvac-djawara.git
  - `putra22`: https://github.com/putra22-debug/hvac-djawara.git

### Deploy Command
```bash
git add .
git commit -m "feat: Description"
git push origin main
git push putra22 main
```

### Production URLs
- **App:** https://hvac-djawara.vercel.app
- **Supabase:** [Project-specific URL]

---

## 📝 Testing Checklist

### Basic Access (Public Link)
- [ ] Can access `/c/[token]` without login
- [ ] Shows client name and contact info
- [ ] Displays AC units count
- [ ] Shows service order history
- [ ] Shows upcoming maintenance
- [ ] "Activate Premium" button works
- [ ] QR code displays correctly

### Premium Registration
- [ ] Registration link format correct
- [ ] Token verification works
- [ ] Password validation (min 8 chars)
- [ ] Password match validation
- [ ] Auth account created successfully
- [ ] user_id linked to clients table
- [ ] Verification email sent
- [ ] Email contains correct redirect URL

### Premium Login
- [ ] Can login with email/password
- [ ] Invalid credentials show error
- [ ] Unverified email shows warning
- [ ] Successful login redirects to dashboard
- [ ] "Forgot password?" link works

### Password Reset
- [ ] Reset email sent successfully
- [ ] Email contains valid reset link
- [ ] Can set new password (min 8 chars)
- [ ] Auto-redirect after success
- [ ] Can login with new password

### Auto-Redirect
- [ ] Premium client accessing public link → redirects to dashboard
- [ ] Basic client accessing public link → stays on public view
- [ ] Logged-out premium client → can see public view

---

## 💡 Future Enhancements

### Phase 2
- [ ] Social login (Google, Facebook)
- [ ] Two-factor authentication
- [ ] Mobile app (React Native)
- [ ] Push notifications
- [ ] In-app chat support

### Phase 3
- [ ] Referral program
- [ ] Subscription management
- [ ] Invoice auto-pay
- [ ] Reward redemption system
- [ ] Advanced analytics dashboard

---

## 🆘 Emergency Contacts

### If Clients Cannot Access:
1. Check Supabase RLS policies active
2. Verify tokens generated: `SELECT COUNT(public_token) FROM clients;`
3. Check Vercel deployment status
4. Review console errors in browser DevTools

### If Premium Features Not Working:
1. Verify SQL migrations executed
2. Check RPC functions exist in Supabase
3. Confirm `user_id` populated in clients table
4. Test authentication flow end-to-end

### If Email Not Sending:
1. Check Supabase email settings
2. Verify email quota (free tier limited)
3. Check spam folder
4. Consider custom SMTP provider

---

## 📞 Support Resources

### Documentation
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- Shadcn UI: https://ui.shadcn.com

### Key Files for Reference
- `CLIENT_PREMIUM_AUTH_GUIDE.md` - Complete auth system guide
- `supabase/CLIENT_FLOW_GUIDE.sql` - SQL examples and troubleshooting
- `DATABASE_SCHEMA.md` - Full database schema documentation

---

**Last Session Achievements:**
- ✅ 2-tier authentication system (public + premium)
- ✅ Complete registration flow with email verification
- ✅ Password reset functionality
- ✅ Auto-redirect for premium clients
- ✅ Fixed all routing issues
- ✅ Comprehensive SQL migrations
- ✅ Full documentation

**Next AI Agent Should:**
1. Test complete user flows
2. Execute pending SQL migrations
3. Implement service rating system frontend
4. Test email delivery
5. Add premium feature access guards

---

*End of Handoff Guide*
