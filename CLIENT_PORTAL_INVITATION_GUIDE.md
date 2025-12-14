# 🎯 CLIENT PORTAL - INVITATION SYSTEM
**Konsep: Staff Generate → Client Activate**

## 📋 OVERVIEW

Sistem invitation-based yang **jauh lebih baik** dari manual registration:

### ✅ Keuntungan:
- **No duplicate data entry** - Staff sudah input data client
- **One-click activation** - Client cukup set password
- **Secure** - Token one-time use, expires dalam 7 hari
- **Easy sharing** - Link + QR code + WhatsApp/Email
- **Professional** - Client merasa VIP (di-undang, bukan daftar sendiri)
- **Staff control** - Staff yang tentukan siapa dapat akses

---

## 🔄 FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Staff Create Client (Internal Dashboard)          │
│  /dashboard/clients/new                                     │
│  → Input: Name, Phone, Email, Address, etc.                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Staff Enable Portal Access                         │
│  /dashboard/clients/[id]                                    │
│  → Click "Generate Portal Invitation"                       │
│  → System generates:                                        │
│     • Unique token (32 chars)                               │
│     • Invitation link                                       │
│     • QR code                                               │
│  → Valid for 7 days                                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Staff Share Invitation                            │
│  Options:                                                   │
│  • Copy link → Share via WA/Email manually                  │
│  • Click "WhatsApp" → Auto-open WA with pre-filled message │
│  • Click "Email" → Auto-open email client                  │
│  • Print QR code → Client scan langsung                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Client Click Link / Scan QR                       │
│  /client/invite/[token]                                     │
│  → Client sees welcome page dengan nama mereka              │
│  → Form already pre-filled with email                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Client Set Password                               │
│  → Client input password (min 8 chars)                      │
│  → Client confirm password                                  │
│  → Click "Activate Portal Access"                           │
│  → System:                                                  │
│     • Creates auth.user                                     │
│     • Activates portal                                      │
│     • Clears invitation token (one-time use)                │
│     • Logs activity                                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: Client Auto-Login                                 │
│  → Redirect to /client/login                                │
│  → Client login dengan email & password yang baru di-set    │
│  → Portal ready! ✅                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 FILES CREATED

### 1. Database Schema
**File:** `supabase/CLIENT_PORTAL_INVITATION_SYSTEM.sql`
- Extend `clients` table dengan invitation fields
- Functions: `generate_portal_invitation()`, `validate_invitation_token()`, `activate_client_portal()`
- View: `v_portal_invitations` (monitoring)

### 2. Invitation Page
**File:** `app/client/invite/[token]/page.tsx`
- Validate token
- Show welcome message
- Set password form
- Auto-redirect setelah activate

### 3. API Routes
**File:** `app/api/admin/generate-portal-invitation/route.ts`
- Generate invitation (called by staff)

**File:** `app/api/client/activate-portal/route.ts`
- Create auth user
- Activate portal
- Clear token

### 4. UI Component
**File:** `components/client-portal/EnablePortalAccess.tsx`
- Generate invitation button
- Display QR code
- Share via WhatsApp/Email
- Copy link button

---

## 🚀 IMPLEMENTATION STEPS

### Step 1: Execute SQL Migration

```bash
# Open Supabase SQL Editor
# Run: supabase/CLIENT_PORTAL_INVITATION_SYSTEM.sql
```

Expected output:
```
✓ Test invitation generated!
📧 Client: Test Client Invitation
🔗 Invitation Link: https://hvac-djawara.vercel.app/client/invite/abc123...
🎫 Token: abc123def456...
⏰ Expires: 2025-01-27 ...
```

### Step 2: Add Component to Client Detail Page

Edit: `app/dashboard/clients/[id]/page.tsx`

```typescript
import { EnablePortalAccess } from '@/components/client-portal/EnablePortalAccess'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  // ... existing code to fetch client
  
  return (
    <div className="p-6">
      <h1>Client Detail</h1>
      
      {/* Existing client info */}
      <ClientInfoCard client={client} />
      
      {/* NEW: Enable Portal Access */}
      <EnablePortalAccess client={client} />
      
      {/* Existing sections */}
    </div>
  )
}
```

### Step 3: Install QR Code Library

```bash
npm install qrcode.react
npm install --save-dev @types/qrcode.react
```

### Step 4: Test Flow

1. **Open staff dashboard:**
   ```
   http://localhost:3000/dashboard/clients
   ```

2. **Create new client** atau pilih existing client

3. **Click "Generate Portal Invitation"**
   - Should show QR code
   - Should show invitation link
   - Should have WhatsApp/Email buttons

4. **Copy invitation link** (contoh):
   ```
   http://localhost:3000/client/invite/a1b2c3d4e5f6...
   ```

5. **Open link di incognito/private browser**
   - Should show welcome page dengan nama client
   - Should show set password form

6. **Set password** (min 8 chars)
   - Should redirect ke /client/login
   - Should show success message

7. **Login dengan credentials yang baru**
   - Email: yang di-set tadi
   - Password: yang di-set tadi
   - Should login successfully

---

## 📱 SHARING OPTIONS

### Option 1: WhatsApp (Automated)
Click "WhatsApp" button → Opens WhatsApp with:

```
Halo [Client Name],

Anda telah terdaftar di Client Portal HVAC Djawara! 🎉

Klik link berikut untuk aktivasi akun Anda:
https://hvac-djawara.vercel.app/client/invite/[token]

Link berlaku hingga: [expiry date]

Terima kasih!
```

### Option 2: Email (Automated)
Click "Email" button → Opens email client with pre-filled:
- **Subject:** Aktivasi Client Portal HVAC Djawara
- **Body:** Professional email dengan instruksi lengkap

### Option 3: QR Code (Print/Display)
- Display QR code di screen
- Client scan dengan HP
- Langsung ke invitation page

### Option 4: Manual Copy
- Click "Copy" button
- Paste ke WA/SMS/Email manual

---

## 🔐 SECURITY FEATURES

### Token Security
- **32 characters** random hex
- **One-time use** - auto-cleared setelah activation
- **7 days expiry** - tidak bisa dipakai setelah expired
- **No replay attacks** - cannot reuse same token

### Validation Checks
1. ✅ Token exists in database
2. ✅ Token not expired
3. ✅ Token not already used
4. ✅ Client data matches

### Password Policy
- Minimum 8 characters
- Must match confirmation
- Hashed before storage (via Supabase Auth)

---

## 🎨 UI/UX HIGHLIGHTS

### For Staff Dashboard:
- Simple "Generate Invitation" button
- Instant QR code generation
- One-click share to WA/Email
- Visual status indicators (pending/activated/expired)

### For Client:
- Professional welcome message dengan nama mereka
- Pre-filled email (tinggal set password)
- Clear expiry information
- Success animation setelah activate
- Auto-redirect ke login

---

## 📊 MONITORING & ANALYTICS

### View Active Invitations
```sql
SELECT * FROM v_portal_invitations
ORDER BY portal_invitation_sent_at DESC;
```

Shows:
- Client name
- Invitation status (pending/activated/expired)
- Sent by (staff name)
- Sent date
- Activated date (if activated)

### Count Statistics
```sql
-- Total invitations sent
SELECT COUNT(*) FROM clients 
WHERE portal_invitation_token IS NOT NULL;

-- Activated vs Pending
SELECT 
  COUNT(*) FILTER (WHERE portal_activated_at IS NOT NULL) as activated,
  COUNT(*) FILTER (WHERE portal_activated_at IS NULL AND portal_invitation_expires > NOW()) as pending,
  COUNT(*) FILTER (WHERE portal_invitation_expires < NOW() AND portal_activated_at IS NULL) as expired
FROM clients
WHERE portal_invitation_token IS NOT NULL;
```

---

## 🐛 TROUBLESHOOTING

### Issue: "Invalid invitation token"
**Possible causes:**
1. Token expired (> 7 days)
2. Token already used
3. Typo in URL

**Solution:** Staff generate new invitation (resend)

### Issue: "Email already registered"
**Cause:** Auth user dengan email tersebut sudah ada

**Solution:**
```sql
-- Check if email exists in auth
SELECT email FROM auth.users WHERE email = 'client@example.com';

-- If exists but not linked to client, delete
-- (via Supabase Dashboard → Authentication → Users)
```

### Issue: QR code not displaying
**Cause:** Missing qrcode.react package

**Solution:**
```bash
npm install qrcode.react
```

---

## 🎯 NEXT FEATURES

### Enhancement Ideas:
- [ ] SMS invitation (via Twilio/Vonage)
- [ ] Bulk invitation (invite multiple clients at once)
- [ ] Custom expiry period (staff can choose 1/7/30 days)
- [ ] Email template customization
- [ ] WhatsApp template with company logo
- [ ] Reminder email if not activated after 3 days
- [ ] Portal access analytics dashboard
- [ ] Client onboarding checklist

---

## ✅ TESTING CHECKLIST

Before production:
- [ ] SQL migration executed successfully
- [ ] Can generate invitation from dashboard
- [ ] QR code displays correctly
- [ ] WhatsApp share works
- [ ] Email share works
- [ ] Copy link works
- [ ] Invitation page validates token
- [ ] Can set password
- [ ] Portal activates successfully
- [ ] Can login after activation
- [ ] Token cleared after use (can't reuse)
- [ ] Expired tokens rejected
- [ ] All RLS policies working

---

**Status:** Ready for Testing
**Next Step:** Execute SQL migration and test full flow

**Konsep ini jauh lebih baik!** Client experience-nya smooth, staff tidak perlu manual input 2x, dan security terjaga. 🚀
