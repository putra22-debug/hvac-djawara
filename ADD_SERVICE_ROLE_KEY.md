# URGENT - Add Service Role Key to Vercel

## Error Masih Terjadi
RLS policy masih block insert meskipun sudah fix semua.

## Final Solution: Use Service Role Key

API route sekarang menggunakan **Service Role Key** untuk bypass RLS.

---

## ⚠️ WAJIB: Add Environment Variable di Vercel

### Step 1: Get Service Role Key dari Supabase

1. Buka: https://supabase.com/dashboard/project/tukbuzdngodvcysncwke/settings/api
2. Scroll ke section: **Project API keys**
3. Copy key: `service_role` (yang panjang, secret!)

### Step 2: Add ke Vercel

1. Buka: https://vercel.com/djawara/hvac-djawara/settings/environment-variables
2. Click "Add New"
3. Input:
   - **Key:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** [paste service role key dari Supabase]
   - **Environment:** All (Production, Preview, Development)
4. Click "Save"

### Step 3: Redeploy

1. Go to: https://vercel.com/djawara/hvac-djawara
2. Click "Deployments"
3. Click menu (3 dots) pada latest deployment
4. Click "Redeploy"
5. Wait ~2 minutes

---

## Why Service Role?

**Service Role Key:**
- ✅ Bypasses ALL RLS policies
- ✅ Safe untuk public API yang sudah validated
- ✅ Commonly used untuk public form submissions
- ✅ Tidak expose ke client (server-side only)

**Code sekarang:**
```typescript
const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role - bypasses RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
```

---

## Security Notes

**Aman karena:**
1. ✅ Input validation di API route
2. ✅ Service role ONLY di server-side (tidak di client)
3. ✅ Tidak exposed ke browser
4. ✅ Standard practice untuk public forms

**Alternatif lain (jika mau):**
- Disable RLS completely untuk table ini
- Tapi Service Role lebih aman

---

## Timeline

1. ⏳ Code sudah committed (7ef7732)
2. ⏳ Add SUPABASE_SERVICE_ROLE_KEY ke Vercel (YOU DO THIS)
3. ⏳ Redeploy Vercel (~2 min)
4. ⏳ Test form (should work!)

**Total:** ~5 minutes setelah add env variable

---

## Test After Redeploy

1. Hard refresh: Ctrl+Shift+R
2. Submit form
3. Should work 100%!

---

**DO NOW:**
1. Get service role key dari Supabase
2. Add ke Vercel env variables
3. Redeploy
4. Test

This will work! 💪
