# 🚀 CLIENT PORTAL IMPLEMENTATION GUIDE
**Step-by-step untuk implementasi Client Portal**

## 📋 PREREQUISITES

✅ Database schema extended (run CLIENT_PORTAL_SETUP.sql)
✅ RLS policies created
✅ Helper functions ready
✅ Basic components created

---

## 🔧 STEP 1: DATABASE SETUP

### 1.1 Execute SQL Migration
```bash
# Open Supabase SQL Editor
# Paste and run: supabase/CLIENT_PORTAL_SETUP.sql
```

**Verify:**
```sql
-- Check columns added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name LIKE 'portal%';

-- Should return: portal_email, portal_enabled, portal_last_login

-- Check RLS policies
SELECT policyname, tablename FROM pg_policies 
WHERE policyname LIKE '%client%';

-- Should see policies for clients, service_orders, maintenance_contracts, bast
```

---

## 🔐 STEP 2: ENABLE CLIENT PORTAL ACCESS

### 2.1 Create Auth User for Client (Service Role API)

Create file: `lib/admin/enable-client-portal.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function enableClientPortal(
  clientId: string,
  email: string,
  sendEmailInvite: boolean = true
) {
  try {
    // 1. Get client data
    const { data: client, error: clientError } = await adminClient
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError) throw clientError

    // 2. Create auth user
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: email,
      email_confirm: !sendEmailInvite, // If no email, auto-confirm
      user_metadata: {
        client_id: clientId,
        account_type: 'client',
        client_name: client.name,
      },
    })

    if (authError) throw authError

    // 3. Update clients table
    const { error: updateError } = await adminClient
      .from('clients')
      .update({
        portal_email: email,
        portal_enabled: true,
      })
      .eq('id', clientId)

    if (updateError) throw updateError

    // 4. Send welcome email (optional - implement your email service)
    if (sendEmailInvite) {
      // TODO: Send welcome email with set password link
      console.log(`Welcome email should be sent to ${email}`)
    }

    return {
      success: true,
      authUserId: authUser.user.id,
      message: 'Client portal enabled successfully',
    }
  } catch (error) {
    console.error('Error enabling client portal:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
```

### 2.2 Create Admin UI for Enabling Portal

Add to: `app/dashboard/clients/[id]/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function EnablePortalSection({ client }: { client: any }) {
  const [email, setEmail] = useState(client.email || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleEnable = async () => {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/enable-client-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          email: email,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage('✅ Portal access enabled! Client will receive email invitation.')
      } else {
        setMessage(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  if (client.portal_enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Client Portal Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <p className="text-sm text-gray-700">
              Portal enabled for: <strong>{client.portal_email}</strong>
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Last login: {client.portal_last_login ? new Date(client.portal_last_login).toLocaleString('id-ID') : 'Never'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enable Client Portal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Portal Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Email for client to login to portal
            </p>
          </div>

          <Button onClick={handleEnable} disabled={loading || !email}>
            {loading ? 'Enabling...' : 'Enable Portal Access'}
          </Button>

          {message && (
            <p className="text-sm mt-2">{message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

### 2.3 Create API Route for Enable Portal

Create: `app/api/admin/enable-client-portal/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enableClientPortal } from '@/lib/admin/enable-client-portal'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and is staff
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const { clientId, email } = await request.json()

    if (!clientId || !email) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Enable portal access
    const result = await enableClientPortal(clientId, email, true)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in enable-client-portal API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## 🧪 STEP 3: TESTING

### 3.1 Test Client Portal Access

1. **Enable portal for test client:**
   ```bash
   # Via Supabase SQL Editor
   UPDATE public.clients 
   SET 
     portal_email = 'testclient@example.com',
     portal_enabled = true
   WHERE name = 'Test Client Portal';
   ```

2. **Create auth user manually:**
   ```typescript
   // Via Supabase Dashboard → Authentication → Users → Invite User
   // OR via API:
   const { data, error } = await supabase.auth.admin.createUser({
     email: 'testclient@example.com',
     password: 'TestPassword123!',
     email_confirm: true,
     user_metadata: {
       client_id: '<client_id_from_database>',
       account_type: 'client'
     }
   })
   ```

3. **Test login:**
   - Navigate to: `http://localhost:3000/client/login`
   - Email: `testclient@example.com`
   - Password: `TestPassword123!`
   - Should redirect to: `/client/dashboard`

4. **Verify RLS:**
   ```sql
   -- Test as client user
   SELECT * FROM service_orders; -- Should only see own orders
   SELECT * FROM maintenance_contracts; -- Should only see own contracts
   SELECT * FROM clients; -- Should only see own profile
   ```

---

## 🎨 STEP 4: IMPLEMENT ADDITIONAL PAGES

### 4.1 Orders Page

Create: `app/client/orders/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function ClientOrdersPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/client/login')

  const clientId = user.user_metadata?.client_id
  if (!clientId) redirect('/client/login')

  // Fetch orders (RLS will automatically filter)
  const { data: orders } = await supabase
    .from('service_orders')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

      <div className="space-y-4">
        {orders?.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {order.order_number}
                </CardTitle>
                <Badge
                  variant={
                    order.status === 'completed'
                      ? 'success'
                      : order.status === 'in_progress'
                      ? 'default'
                      : 'secondary'
                  }
                >
                  {order.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">{order.service_title}</p>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(order.created_at).toLocaleDateString('id-ID')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

### 4.2 Profile Page

Create: `app/client/profile/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ClientProfilePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/client/login')

  const clientId = user.user_metadata?.client_id
  if (!clientId) redirect('/client/login')

  // Fetch client profile (RLS will automatically filter)
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <p className="text-gray-900">{client?.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <p className="text-gray-900">{client?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Phone</label>
            <p className="text-gray-900">{client?.phone}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Address</label>
            <p className="text-gray-900">{client?.address}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Client Type</label>
            <p className="text-gray-900 capitalize">{client?.client_type}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 🔔 STEP 5: IMPLEMENT NOTIFICATIONS

### 5.1 Real-time Order Status Updates

Create: `hooks/use-client-notifications.ts`

```typescript
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function useClientNotifications(clientId: string) {
  const supabase = createClient()

  useEffect(() => {
    if (!clientId) return

    // Subscribe to order updates
    const channel = supabase
      .channel('client-orders')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_orders',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const newStatus = payload.new.status
          const orderNumber = payload.new.order_number

          toast.success(`Order ${orderNumber} status updated to: ${newStatus}`)
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [clientId, supabase])
}
```

Add to client layout or dashboard:
```typescript
'use client'

import { useClientNotifications } from '@/hooks/use-client-notifications'

export function ClientDashboard({ clientId }: { clientId: string }) {
  useClientNotifications(clientId)
  
  // ... rest of component
}
```

---

## 🚀 STEP 6: DEPLOYMENT

### 6.1 Environment Variables (Vercel)

Add to Vercel environment variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key # For admin functions
```

### 6.2 Deploy to Vercel

```bash
git add .
git commit -m "feat: add client portal"
git push origin main
```

Vercel will auto-deploy.

### 6.3 Test Production

1. Navigate to: `https://hvac-djawara.vercel.app/client/login`
2. Login with test client credentials
3. Verify all features working

---

## ✅ VERIFICATION CHECKLIST

After implementation, verify:

- [ ] Client can login at `/client/login`
- [ ] Client can see own dashboard
- [ ] Client can only see own orders (RLS working)
- [ ] Client can only see own contracts (RLS working)
- [ ] Client can update own profile
- [ ] Client cannot see other clients' data
- [ ] Client cannot access staff dashboard
- [ ] Staff cannot login to client portal
- [ ] Real-time notifications working
- [ ] Activity logging working
- [ ] Session tracking working

---

## 🎯 NEXT FEATURES TO IMPLEMENT

### Priority 1 (Essential)
- [ ] Order detail view with technician info
- [ ] Document downloads (BAST, Invoice)
- [ ] Contract details view
- [ ] Maintenance schedule calendar

### Priority 2 (Important)
- [ ] Email notifications for status changes
- [ ] Password reset flow
- [ ] Profile edit form
- [ ] Payment history

### Priority 3 (Nice to Have)
- [ ] WhatsApp notifications
- [ ] Live chat support
- [ ] Mobile app (React Native)
- [ ] Multi-language support

---

## 🐛 TROUBLESHOOTING

### Issue: "Not a client account" error

**Solution:** Check user metadata:
```sql
SELECT raw_user_meta_data FROM auth.users WHERE email = 'client@example.com';
```

Should contain: `{"account_type": "client", "client_id": "..."}`

### Issue: Client can't see any data

**Solution:** Check RLS policies:
```sql
-- Test policy manually
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"email": "client@example.com"}';
SELECT * FROM service_orders;
```

### Issue: Portal access enabled but can't login

**Solution:** 
1. Check `clients.portal_enabled = true`
2. Check `clients.portal_email` matches auth email
3. Verify auth user exists
4. Check user metadata is correct

---

## 📞 SUPPORT

If you encounter issues:
1. Check Supabase logs
2. Check browser console for errors
3. Verify RLS policies with test queries
4. Check auth user metadata

---

**Document Version:** 1.0
**Last Updated:** 2025-01-20
**Status:** Ready for Implementation
